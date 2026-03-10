import { PageParserService } from './page-parser.service';
import type { AurionEvent, AurionEventDetails } from '../types/aurion.types';
import { SessionService } from './session.service';
import type { Env } from '../index';
import { sha256Hash } from '../utils/crypto.util';

const CACHE_TTL_SECONDS = 3600;
const REQUEST_LOCK_TTL_SECONDS = 60;

export class AurionService {
  private session: SessionService;
  private viewState = '';
  private menuId = '';
  private idInit = '';
  private formIdPlanning = '';
  private env: Env;
  private trackEvent?: (event: string, properties?: Record<string, unknown>) => void;

  constructor(
    env: Env,
    trackEvent?: (event: string, properties?: Record<string, unknown>) => void
  ) {
    this.session = new SessionService();
    this.env = env;
    this.trackEvent = trackEvent;
  }

  private track(event: string, properties?: Record<string, unknown>): void {
    this.trackEvent?.(event, properties);
  }

  private isCacheDisabled(): boolean {
    const value = this.env.DISABLE_CACHE;
    if (!value) {
      return false;
    }

    const normalized = value.toLowerCase();
    return normalized === 'true' || normalized === '1' || normalized === 'yes';
  }

  private async getUserKey(email: string, password: string): Promise<string> {
    const hash = await sha256Hash(`${email}:${password}`);
    // Use first 16 characters of hash for shorter keys while maintaining uniqueness
    return `user:${email}:${hash.substring(0, 16)}`;
  }

  private getCacheKey(userKey: string, start: number, end: number): string {
    return `events:${userKey}:${start}:${end}`;
  }

  private getRequestLockKey(userKey: string, start: number, end: number): string {
    return `lock:${userKey}:${start}:${end}`;
  }

  async login(email: string, password: string): Promise<void> {
    this.track('aurion_login_started');
    await this.session.login(email, password);
    this.track('aurion_login_succeeded');
  }

  private async initializeSession(): Promise<void> {
    this.track('aurion_initialize_session_started');
    const res = await this.session.get('/');
    this.viewState = PageParserService.parseViewState(res.body);
    this.idInit = PageParserService.parseIdInit(res.body);
    this.track('aurion_initialize_session_succeeded');
  }

  private async navigateToPlanning(): Promise<void> {
    this.track('aurion_navigate_to_planning_started');
    const sidebarRes = await this.session.get('/faces/MainMenuPage.xhtml', {
      referer: 'https://aurion.junia.com/',
    });

    this.menuId = PageParserService.parseSidebarMenuIdForMonPlanning(
      sidebarRes.body
    );

    const postData = new URLSearchParams({
      form: 'form',
      'form:largeurDivCenter': '885',
      'form:idInit': this.idInit,
      'form:sauvegarde': '',
      'form:j_idt773_focus': '',
      'form:j_idt773_input': '44323',
      'javax.faces.ViewState': this.viewState,
      'form:sidebar': 'form:sidebar',
      'form:sidebar_menuid': this.menuId,
    }).toString();

    await this.session.post('/faces/MainMenuPage.xhtml', {
      body: postData,
    });

    const planningPage = await this.session.get('/faces/Planning.xhtml', {
      referer: 'https://aurion.junia.com/faces/MainMenuPage.xhtml',
    });

    this.viewState = PageParserService.parseViewState(planningPage.body);
    this.formIdPlanning = PageParserService.parseFormIdPlanning(
      planningPage.body
    );
    this.track('aurion_navigate_to_planning_succeeded');
  }

  private async fetchPlanningData(
    start: number,
    end: number
  ): Promise<AurionEvent[]> {
    this.track('aurion_fetch_planning_started', { start, end });
    const now = new Date(start);
    const today = now.toLocaleDateString('fr-FR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
    });
    const week = String(this.getWeekNumber(now)).padStart(2, '0');
    const year = String(now.getFullYear());

    const postData = new URLSearchParams({
      'javax.faces.partial.ajax': 'true',
      'javax.faces.source': this.formIdPlanning,
      'javax.faces.partial.execute': this.formIdPlanning,
      'javax.faces.partial.render': this.formIdPlanning,
      [this.formIdPlanning]: this.formIdPlanning,
      [`${this.formIdPlanning}_start`]: String(start),
      [`${this.formIdPlanning}_end`]: String(end),
      form: 'form',
      'form:largeurDivCenter': '',
      'form:idInit': this.idInit,
      'form:date_input': today,
      'form:week': `${week}-${year}`,
      [`${this.formIdPlanning}_view`]: 'agendaWeek',
      'form:offsetFuseauNavigateur': '-7200000',
      'form:onglets_activeIndex': '0',
      'form:onglets_scrollState': '0',
      'form:j_idt244_focus': '',
      'form:j_idt244_input': '44323',
      'javax.faces.ViewState': this.viewState,
    }).toString();

    const res = await this.session.post('/faces/Planning.xhtml', {
      body: postData,
    });
    const events = PageParserService.parsePlanningData(res.body);
    this.track('aurion_fetch_planning_succeeded', {
      eventsCount: events.length,
      start,
      end,
    });
    return events;
  }

  private getWeekNumber(date: Date): number {
    const firstDayOfYear = new Date(date.getFullYear(), 0, 1);
    const pastDaysOfYear =
      (date.getTime() - firstDayOfYear.getTime()) / 86400000;
    return Math.ceil((pastDaysOfYear + firstDayOfYear.getDay() + 1) / 7);
  }

  private async fetchSingleEventDetails(eventId: string): Promise<string> {
    const postData = new URLSearchParams({
      'javax.faces.partial.ajax': 'true',
      'javax.faces.source': this.formIdPlanning,
      'javax.faces.partial.execute': this.formIdPlanning,
      'javax.faces.partial.render': this.formIdPlanning,
      [this.formIdPlanning]: this.formIdPlanning,
      [`${this.formIdPlanning}_selectedEventId`]: eventId,
      form: 'form',
      'form:largeurDivCenter': '',
      'form:idInit': this.idInit,
      'javax.faces.ViewState': this.viewState,
    }).toString();

    const res = await this.session.post('/faces/Planning.xhtml', {
      body: postData,
    });

    return res.body;
  }

  private async enrichEvents(events: AurionEvent[]): Promise<AurionEventDetails[]> {
    this.track('aurion_enrich_events_started', { eventsCount: events.length });
    const enrichedEvents: AurionEventDetails[] = [];

    for (const event of events) {
      const html = await this.fetchSingleEventDetails(event.id);
      const details = PageParserService.parseSingleEvent(html);

      enrichedEvents.push({
        ...event,
        status: details.status ?? '',
        subject: details.subject ?? '',
        type: details.type ?? '',
        description: details.description ?? '',
        isExam: details.isExam ?? false,
        resources: details.resources ?? [],
        teachers: details.teachers ?? [],
        students: details.students ?? [],
        groups: details.groups ?? [],
        courses: details.courses ?? [],
      });
    }
    this.track('aurion_enrich_events_succeeded', {
      eventsCount: enrichedEvents.length,
    });
    return enrichedEvents;
  }

  async getPlanning(
    email: string,
    password: string,
    startTimestamp?: number,
    endTimestamp?: number
  ): Promise<AurionEventDetails[]> {
    const start = startTimestamp ?? Date.now() - 7 * 24 * 60 * 60 * 1000;
    const end = endTimestamp ?? start + 60 * 24 * 60 * 60 * 1000;
    const disableCache = this.isCacheDisabled();

    this.track('planning_request_started', {
      start,
      end,
      disableCache,
    });

    if (disableCache) {
      this.track('planning_cache_disabled');
      await this.login(email, password);

      try {
        await this.initializeSession();
        await this.navigateToPlanning();
        const baseEvents = await this.fetchPlanningData(start, end);
        const events = await this.enrichEvents(baseEvents);
        this.track('planning_request_succeeded', {
          source: 'aurion',
          cache: 'disabled',
          eventsCount: events.length,
        });
        return events;
      } catch (error) {
        this.track('planning_retry_after_error', {
          cache: 'disabled',
        });
        await this.login(email, password);
        await this.initializeSession();
        await this.navigateToPlanning();
        const baseEvents = await this.fetchPlanningData(start, end);
        const events = await this.enrichEvents(baseEvents);
        this.track('planning_request_succeeded', {
          source: 'aurion',
          cache: 'disabled',
          retried: true,
          eventsCount: events.length,
        });
        return events;
      }
    }

    const userKey = await this.getUserKey(email, password);
    const cacheKey = this.getCacheKey(userKey, start, end);

    this.track('planning_cache_lookup_started');
    const cachedEvents = await this.env.CACHE.get(cacheKey);
    if (cachedEvents) {
      this.track('planning_cache_hit');
      return JSON.parse(cachedEvents) as AurionEventDetails[];
    }
    this.track('planning_cache_miss');

    const lockKey = this.getRequestLockKey(userKey, start, end);
    const existingLock = await this.env.CACHE.get(lockKey);

    if (existingLock) {
      this.track('planning_lock_detected');
      for (let i = 0; i < 5; i++) {
        await Promise.resolve();

        const cached = await this.env.CACHE.get(cacheKey);
        if (cached) {
          this.track('planning_cache_hit_after_lock_wait', { waitIteration: i + 1 });
          return JSON.parse(cached) as AurionEventDetails[];
        }

        const lockStillExists = await this.env.CACHE.get(lockKey);
        if (!lockStillExists) {
          break;
        }
      }
    }

    await this.env.CACHE.put(lockKey, Date.now().toString(), {
      expirationTtl: REQUEST_LOCK_TTL_SECONDS,
    });
    this.track('planning_lock_acquired');

    try {
      const cachedAfterLock = await this.env.CACHE.get(cacheKey);
      if (cachedAfterLock) {
        await this.env.CACHE.delete(lockKey);
        this.track('planning_cache_hit_after_lock_acquire');
        this.track('planning_lock_released');
        return JSON.parse(cachedAfterLock) as AurionEventDetails[];
      }

      this.session.setKV(this.env.SESSIONS, userKey);
      const hasSession = await this.session.loadFromKV();
      this.track('planning_session_lookup_result', { hasSession });

      if (!hasSession) {
        await this.login(email, password);
      }

      try {
        await this.initializeSession();
        await this.navigateToPlanning();
        const baseEvents = await this.fetchPlanningData(start, end);
        const events = await this.enrichEvents(baseEvents);

        await this.env.CACHE.put(cacheKey, JSON.stringify(events), {
          expirationTtl: CACHE_TTL_SECONDS,
        });
        this.track('planning_cache_write_succeeded', { eventsCount: events.length });

        await this.env.CACHE.delete(lockKey);
        this.track('planning_lock_released');
        this.track('planning_request_succeeded', {
          source: 'aurion',
          cache: 'miss',
          eventsCount: events.length,
        });

        return events;
      } catch (error) {
        if (hasSession) {
          this.track('planning_retry_after_error', {
            cache: 'miss',
            reusedSession: true,
          });
          await this.login(email, password);
          await this.initializeSession();
          await this.navigateToPlanning();
          const baseEvents = await this.fetchPlanningData(start, end);
          const events = await this.enrichEvents(baseEvents);

          await this.env.CACHE.put(cacheKey, JSON.stringify(events), {
            expirationTtl: CACHE_TTL_SECONDS,
          });
          this.track('planning_cache_write_succeeded', { eventsCount: events.length });

          await this.env.CACHE.delete(lockKey);
          this.track('planning_lock_released');
          this.track('planning_request_succeeded', {
            source: 'aurion',
            cache: 'miss',
            retried: true,
            eventsCount: events.length,
          });

          return events;
        }
        await this.env.CACHE.delete(lockKey);
        this.track('planning_lock_released');
        this.track('planning_request_failed', {
          cache: 'miss',
        });
        throw error;
      }
    } catch (error) {
      await this.env.CACHE.delete(lockKey);
      this.track('planning_lock_released');
      this.track('planning_request_failed', {
        cache: 'miss',
      });
      throw error;
    }
  }
}

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

  constructor(env: Env) {
    this.session = new SessionService();
    this.env = env;
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
    await this.session.login(email, password);
  }

  private async initializeSession(): Promise<void> {
    const res = await this.session.get('/');
    this.viewState = PageParserService.parseViewState(res.body);
    this.idInit = PageParserService.parseIdInit(res.body);
  }

  private async navigateToPlanning(): Promise<void> {
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
  }

  private async fetchPlanningData(
    start: number,
    end: number
  ): Promise<AurionEvent[]> {
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

    return PageParserService.parsePlanningData(res.body);
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

    if (disableCache) {
      await this.login(email, password);

      try {
        await this.initializeSession();
        await this.navigateToPlanning();
        const baseEvents = await this.fetchPlanningData(start, end);
        return this.enrichEvents(baseEvents);
      } catch (error) {
        await this.login(email, password);
        await this.initializeSession();
        await this.navigateToPlanning();
        const baseEvents = await this.fetchPlanningData(start, end);
        return this.enrichEvents(baseEvents);
      }
    }

    const userKey = await this.getUserKey(email, password);
    const cacheKey = this.getCacheKey(userKey, start, end);

    const cachedEvents = await this.env.CACHE.get(cacheKey);
    if (cachedEvents) {
      return JSON.parse(cachedEvents) as AurionEventDetails[];
    }

    const lockKey = this.getRequestLockKey(userKey, start, end);
    const existingLock = await this.env.CACHE.get(lockKey);

    if (existingLock) {
      for (let i = 0; i < 5; i++) {
        await Promise.resolve();

        const cached = await this.env.CACHE.get(cacheKey);
        if (cached) {
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

    try {
      const cachedAfterLock = await this.env.CACHE.get(cacheKey);
      if (cachedAfterLock) {
        await this.env.CACHE.delete(lockKey);
        return JSON.parse(cachedAfterLock) as AurionEventDetails[];
      }

      this.session.setKV(this.env.SESSIONS, userKey);
      const hasSession = await this.session.loadFromKV();

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

        await this.env.CACHE.delete(lockKey);

        return events;
      } catch (error) {
        if (hasSession) {
          await this.login(email, password);
          await this.initializeSession();
          await this.navigateToPlanning();
          const baseEvents = await this.fetchPlanningData(start, end);
          const events = await this.enrichEvents(baseEvents);

          await this.env.CACHE.put(cacheKey, JSON.stringify(events), {
            expirationTtl: CACHE_TTL_SECONDS,
          });

          await this.env.CACHE.delete(lockKey);

          return events;
        }
        await this.env.CACHE.delete(lockKey);
        throw error;
      }
    } catch (error) {
      await this.env.CACHE.delete(lockKey);
      throw error;
    }
  }
}

import {
  PageParserService,
  type AurionEvent,
} from './page-parser.service';
import { SessionService } from './session.service';
import type { Env } from '../index';

const CACHE_TTL_SECONDS = 3600;

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

  private getUserKey(email: string, password: string): string {
    const encoder = new TextEncoder();
    const data = encoder.encode(`${email}:${password}`);
    let hash = 0;
    for (const byte of data) {
      hash = ((hash << 5) - hash + byte) | 0;
    }
    return `user:${email}:${hash.toString(16)}`;
  }

  private getCacheKey(userKey: string, start: number, end: number): string {
    return `events:${userKey}:${start}:${end}`;
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

  async getPlanning(
    email: string,
    password: string,
    startTimestamp?: number,
    endTimestamp?: number
  ): Promise<AurionEvent[]> {
    const start = startTimestamp ?? Date.now() - 7 * 24 * 60 * 60 * 1000;
    const end = endTimestamp ?? start + 60 * 24 * 60 * 60 * 1000;

    const userKey = this.getUserKey(email, password);
    const cacheKey = this.getCacheKey(userKey, start, end);

    const cachedEvents = await this.env.CACHE.get(cacheKey);
    if (cachedEvents) {
      return JSON.parse(cachedEvents) as AurionEvent[];
    }

    this.session.setKV(this.env.SESSIONS, userKey);
    const hasSession = await this.session.loadFromKV();

    if (!hasSession) {
      await this.login(email, password);
    }

    try {
      await this.initializeSession();
      await this.navigateToPlanning();
      const events = await this.fetchPlanningData(start, end);

      await this.env.CACHE.put(cacheKey, JSON.stringify(events), {
        expirationTtl: CACHE_TTL_SECONDS,
      });

      return events;
    } catch (error) {
      if (hasSession) {
        await this.login(email, password);
        await this.initializeSession();
        await this.navigateToPlanning();
        const events = await this.fetchPlanningData(start, end);

        await this.env.CACHE.put(cacheKey, JSON.stringify(events), {
          expirationTtl: CACHE_TTL_SECONDS,
        });

        return events;
      }
      throw error;
    }
  }
}

export type { AurionEvent };

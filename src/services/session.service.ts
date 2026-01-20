const AURION_BASE_URL = 'https://aurion.junia.com';

function getSetCookieHeaders(headers: Headers): string[] {
  const cookies: string[] = [];
  headers.forEach((value, key) => {
    if (key.toLowerCase() === 'set-cookie') {
      cookies.push(value);
    }
  });
  return cookies;
}

const DEFAULT_HEADERS: Record<string, string> = {
  'User-Agent':
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:135.0) Gecko/20100101 Firefox/135.0',
  'Content-Type': 'application/x-www-form-urlencoded',
  Connection: 'keep-alive',
};

export class SessionService {
  private cookies: Map<string, string> = new Map();

  private parseCookies(setCookieHeaders: string[]): void {
    for (const header of setCookieHeaders) {
      const cookiePart = header.split(';')[0];
      if (!cookiePart) continue;

      const [name, ...valueParts] = cookiePart.split('=');
      if (name && valueParts.length > 0) {
        this.cookies.set(name.trim(), valueParts.join('=').trim());
      }
    }
  }

  private getCookieHeader(): string {
    return Array.from(this.cookies.entries())
      .map(([name, value]) => `${name}=${value}`)
      .join('; ');
  }

  async get(
    path: string,
    options: { headers?: Record<string, string>; referer?: string } = {}
  ): Promise<{ body: string; status: number }> {
    const url = path.startsWith('http') ? path : `${AURION_BASE_URL}${path}`;

    const headers: Record<string, string> = {
      ...DEFAULT_HEADERS,
      ...options.headers,
      Cookie: this.getCookieHeader(),
    };

    if (options.referer) {
      headers['Referer'] = options.referer;
    }

    const response = await fetch(url, {
      method: 'GET',
      headers,
      redirect: 'manual',
    });

    const setCookies = getSetCookieHeaders(response.headers);
    if (setCookies.length > 0) {
      this.parseCookies(setCookies);
    }

    const body = await response.text();
    return { body, status: response.status };
  }

  async post(
    path: string,
    options: {
      body: string;
      headers?: Record<string, string>;
      referer?: string;
    }
  ): Promise<{ body: string; status: number; headers: Headers }> {
    const url = path.startsWith('http') ? path : `${AURION_BASE_URL}${path}`;

    const headers: Record<string, string> = {
      ...DEFAULT_HEADERS,
      ...options.headers,
      Cookie: this.getCookieHeader(),
    };

    if (options.referer) {
      headers['Referer'] = options.referer;
    }

    const response = await fetch(url, {
      method: 'POST',
      headers,
      body: options.body,
      redirect: 'manual',
    });

    const setCookies = getSetCookieHeaders(response.headers);
    if (setCookies.length > 0) {
      this.parseCookies(setCookies);
    }

    const body = await response.text();
    return { body, status: response.status, headers: response.headers };
  }

  async login(email: string, password: string): Promise<void> {
    const payload = new URLSearchParams({
      username: email,
      password,
      j_idt28: '',
    }).toString();

    const response = await this.post('/login', { body: payload });

    if (response.status !== 302) {
      throw new Error(`Login failed, HTTP code ${response.status}`);
    }

    if (this.cookies.size === 0) {
      throw new Error('No session cookie received');
    }
  }

  hasCookies(): boolean {
    return this.cookies.size > 0;
  }
}

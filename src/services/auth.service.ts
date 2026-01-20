import type {
  AuthCredentials,
  AuthResult,
  AuthServiceConfig,
  IAuthService,
} from '../types/auth.types';

export class AuthService implements IAuthService {
  private validateFn: (username: string, password: string) => Promise<boolean>;

  constructor(config?: AuthServiceConfig) {
    this.validateFn = config?.validateFn ?? this.defaultValidation;
  }

  private async defaultValidation(
    username: string,
    password: string
  ): Promise<boolean> {
    return username.length > 0 && password.length > 0;
  }

  async validate(username: string, password: string): Promise<AuthResult> {
    const isValid = await this.validateFn(username, password);

    if (!isValid) {
      return { success: false, reason: 'invalid_credentials' };
    }

    return {
      success: true,
      credentials: { username, password },
    };
  }

  static parseAuthorizationHeader(header: string | null): AuthResult {
    if (!header) {
      return { success: false, reason: 'missing_header' };
    }

    if (!header.startsWith('Basic ')) {
      return { success: false, reason: 'invalid_format' };
    }

    const base64Credentials = header.slice(6);

    let decoded: string;
    try {
      decoded = atob(base64Credentials);
    } catch {
      return { success: false, reason: 'invalid_format' };
    }

    const colonIndex = decoded.indexOf(':');
    if (colonIndex === -1) {
      return { success: false, reason: 'invalid_format' };
    }

    const username = decoded.slice(0, colonIndex);
    const password = decoded.slice(colonIndex + 1);

    return {
      success: true,
      credentials: { username, password },
    };
  }

  static extractCredentials(header: string | null): AuthCredentials | null {
    const result = AuthService.parseAuthorizationHeader(header);
    return result.success ? result.credentials : null;
  }
}

import type { KVNamespace } from '@cloudflare/workers-types';
import type { AuthCredentials } from '../types/auth.types';
import type { StoredToken, TokenGenerationResult, UserTokenList } from '../types/token.types';

export class TokenService {
  static generateToken(): string {
    return crypto.randomUUID();
  }

  static generateEncryptionKey(): string {
    const keyBytes = crypto.getRandomValues(new Uint8Array(32));
    return this.base64UrlEncode(keyBytes);
  }

  private static base64UrlEncode(bytes: Uint8Array): string {
    const base64 = btoa(String.fromCharCode(...bytes));
    return base64.replace(/\+/g, '-').replace(/\//g, '_').replace(/=/g, '');
  }

  private static base64UrlDecode(base64Url: string): Uint8Array {
    const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
    const padded = base64.padEnd(base64.length + ((4 - (base64.length % 4)) % 4), '=');
    const binary = atob(padded);
    return new Uint8Array([...binary].map((char) => char.charCodeAt(0)));
  }

  static async encryptCredentials(
    credentials: AuthCredentials,
    encryptionKey: string
  ): Promise<{ encrypted: string; iv: string }> {
    const keyBytes = this.base64UrlDecode(encryptionKey);
    const key = await crypto.subtle.importKey(
      'raw',
      keyBytes,
      { name: 'AES-GCM', length: 256 },
      false,
      ['encrypt']
    );

    const iv = crypto.getRandomValues(new Uint8Array(12));
    const data = JSON.stringify(credentials);
    const encoded = new TextEncoder().encode(data);

    const encrypted = await crypto.subtle.encrypt(
      { name: 'AES-GCM', iv },
      key,
      encoded
    );

    return {
      encrypted: this.base64UrlEncode(new Uint8Array(encrypted)),
      iv: this.base64UrlEncode(iv),
    };
  }

  static async decryptCredentials(
    encrypted: string,
    iv: string,
    encryptionKey: string
  ): Promise<AuthCredentials> {
    const keyBytes = this.base64UrlDecode(encryptionKey);
    const key = await crypto.subtle.importKey(
      'raw',
      keyBytes,
      { name: 'AES-GCM', length: 256 },
      false,
      ['decrypt']
    );

    const encryptedBytes = this.base64UrlDecode(encrypted);
    const ivBytes = this.base64UrlDecode(iv);

    const decrypted = await crypto.subtle.decrypt(
      { name: 'AES-GCM', iv: ivBytes },
      key,
      encryptedBytes
    );

    const decoded = new TextDecoder().decode(decrypted);
    return JSON.parse(decoded) as AuthCredentials;
  }

  static async getUserTokens(
    kv: KVNamespace,
    email: string
  ): Promise<UserTokenList> {
    const userTokensKey = `user:${email}:tokens`;
    const stored = await kv.get(userTokensKey);
    if (!stored) {
      return [];
    }
    try {
      return JSON.parse(stored) as UserTokenList;
    } catch {
      return [];
    }
  }

  static async addTokenToUser(
    kv: KVNamespace,
    email: string,
    token: string,
    createdAt: number
  ): Promise<void> {
    const userTokensKey = `user:${email}:tokens`;
    const tokens = await this.getUserTokens(kv, email);
    tokens.push({ token, createdAt });
    await kv.put(userTokensKey, JSON.stringify(tokens));
  }

  static async removeTokenFromUser(
    kv: KVNamespace,
    email: string,
    tokenToRemove: string
  ): Promise<void> {
    const userTokensKey = `user:${email}:tokens`;
    const tokens = await this.getUserTokens(kv, email);
    const filtered = tokens.filter((t) => t.token !== tokenToRemove);
    await kv.put(userTokensKey, JSON.stringify(filtered));
  }

  static async enforceTokenLimit(
    kv: KVNamespace,
    email: string,
    maxTokens: number
  ): Promise<void> {
    const tokens = await this.getUserTokens(kv, email);
    
    if (tokens.length < maxTokens) {
      return;
    }

    const sorted = [...tokens].sort((a, b) => a.createdAt - b.createdAt);
    const toRemove = sorted.slice(0, tokens.length - maxTokens + 1);
    const tokensToKeep = sorted.slice(tokens.length - maxTokens + 1);

    for (const entry of toRemove) {
      await kv.delete(`token:${entry.token}`);
    }

    const userTokensKey = `user:${email}:tokens`;
    await kv.put(userTokensKey, JSON.stringify(tokensToKeep));
  }

  static async storeToken(
    kv: KVNamespace,
    token: string,
    credentials: AuthCredentials,
    encryptionKey: string,
    maxTokensPerUser: number = 3
  ): Promise<void> {
    const createdAt = Date.now();
    
    await this.enforceTokenLimit(kv, credentials.username, maxTokensPerUser);

    const { encrypted, iv } = await this.encryptCredentials(
      credentials,
      encryptionKey
    );

    const stored: StoredToken = {
      encrypted,
      iv,
      createdAt,
      email: credentials.username,
    };

    await kv.put(`token:${token}`, JSON.stringify(stored));
    await this.addTokenToUser(kv, credentials.username, token, createdAt);
  }

  static async getCredentials(
    kv: KVNamespace,
    token: string,
    encryptionKey: string
  ): Promise<AuthCredentials | null> {
    const storedData = await kv.get(`token:${token}`);
    if (!storedData) {
      return null;
    }

    try {
      const stored = JSON.parse(storedData) as StoredToken;
      return await this.decryptCredentials(
        stored.encrypted,
        stored.iv,
        encryptionKey
      );
    } catch (error) {
      return null;
    }
  }
}

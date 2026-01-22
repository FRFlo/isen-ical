import type { AuthCredentials } from './auth.types';

export interface StoredToken {
  encrypted: string;
  iv: string;
  createdAt: number;
  email: string;
}

export interface TokenGenerationResult {
  token: string;
  encryptionKey: string;
  url: string;
}

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

export interface UserTokenEntry {
  token: string;
  createdAt: number;
}

export type UserTokenList = UserTokenEntry[];

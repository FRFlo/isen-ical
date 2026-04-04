export interface AuthCredentials {
  username: string;
  password: string;
}

export type AuthFailureReason = "missing_header" | "invalid_format" | "invalid_credentials";

export type AuthResult =
  | { success: true; credentials: AuthCredentials }
  | { success: false; reason: AuthFailureReason };

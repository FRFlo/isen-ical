import type { AuthResult } from "../types/auth.types";

export class AuthService {
	static parseAuthorizationHeader(header: string | null): AuthResult {
		if (!header) {
			return { success: false, reason: "missing_header" };
		}

		if (!header.startsWith("Basic ")) {
			return { success: false, reason: "invalid_format" };
		}

		const base64Credentials = header.slice(6);

		let decoded: string;
		try {
			decoded = atob(base64Credentials);
		} catch {
			return { success: false, reason: "invalid_format" };
		}

		const colonIndex = decoded.indexOf(":");
		if (colonIndex === -1) {
			return { success: false, reason: "invalid_format" };
		}

		const username = decoded.slice(0, colonIndex);
		const password = decoded.slice(colonIndex + 1);

		return {
			success: true,
			credentials: { username, password },
		};
	}
}

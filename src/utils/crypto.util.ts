/**
 * Cryptographic utilities for hashing and key generation
 */

/**
 * Generates a SHA-256 hash of the input string and returns it as a hex string
 */
export async function sha256Hash(input: string): Promise<string> {
	const encoder = new TextEncoder();
	const data = encoder.encode(input);
	const hashBuffer = await crypto.subtle.digest("SHA-256", data);
	const hashArray = Array.from(new Uint8Array(hashBuffer));
	return hashArray.map((b) => b.toString(16).padStart(2, "0")).join("");
}

/**
 * Generates a base64url-encoded SHA-256 hash
 */
export async function sha256HashBase64Url(input: string): Promise<string> {
	const encoder = new TextEncoder();
	const data = encoder.encode(input);
	const hashBuffer = await crypto.subtle.digest("SHA-256", data);
	const hashArray = new Uint8Array(hashBuffer);

	// Convert to base64url
	const base64 = btoa(String.fromCharCode(...hashArray));
	return base64.replace(/\+/g, "-").replace(/\//g, "_").replace(/=/g, "");
}

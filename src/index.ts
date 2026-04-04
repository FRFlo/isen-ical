import type { ScheduledController, ExecutionContext } from "@cloudflare/workers-types";
import { isAurionError } from "aurion-sdk";
import { AuthService } from "./services/auth.service";
import { AurionService } from "./services/aurion.service";
import { ICalService } from "./services/ical.service";
import { TelemetryService } from "./services/telemetry.service";
import { TokenService } from "./services/token.service";
import { TemplateService, TemplateName } from "./services/template.service";

export interface Env {
	SESSIONS: KVNamespace;
	CACHE: KVNamespace;
	TOKENS: KVNamespace;
	MAX_TOKENS_PER_USER?: number;
	DISABLE_CACHE?: string;
	POSTHOG_API_KEY?: string;
	POSTHOG_HOST?: string;
}

const icalService = new ICalService();

function createRequestScopedFetch(request: Request): typeof fetch {
	return (input: RequestInfo | URL, init?: RequestInit): Promise<Response> => {
		const baseInit = init ?? {};
		const outboundRequest =
			input instanceof Request
				? new Request(input, {
						...baseInit,
						signal: baseInit.signal ?? request.signal,
					})
				: new Request(input, {
						...baseInit,
						signal: baseInit.signal ?? request.signal,
					});

		return fetch(outboundRequest);
	};
}

function isInvalidAurionCredentials(error: unknown): boolean {
	if (isAurionError(error)) {
		return error.code === "AURION_AUTHENTICATION_ERROR";
	}

	if (!(error instanceof Error)) {
		return false;
	}

	return error.message.includes("Login failed") || error.message.includes("No session cookie");
}

function getErrorMessage(error: unknown): string {
	if (isAurionError(error)) {
		return `${error.code}: ${error.message}`;
	}

	if (error instanceof Error) {
		return error.message;
	}

	if (typeof error === "string") {
		return error;
	}

	return "Unknown error";
}

function getAurionErrorStatus(error: unknown): number {
	if (isInvalidAurionCredentials(error)) {
		return 403;
	}

	if (isAurionError(error)) {
		return 502;
	}

	return 500;
}

export default {
	async scheduled(
		_controller: ScheduledController,
		env: Env,
		_ctx: ExecutionContext,
	): Promise<void> {
		const maxAgeDays = 365;
		const result = await TokenService.cleanupOrphanTokens(env.TOKENS, maxAgeDays);
		console.log(
			`Nettoyage des tokens orphelins terminé: ${result.cleaned} tokens supprimés, ${result.errors} erreurs`,
		);
	},

	async fetch(request: Request, env: Env, ctx: ExecutionContext): Promise<Response> {
		const url = new URL(request.url);
		const pathname = url.pathname;
		const method = request.method;
		const requestScopedFetch = createRequestScopedFetch(request);
		const requestId = request.headers.get("x-request-id") || crypto.randomUUID();
		const traceId = request.headers.get("x-trace-id") || requestId;
		const requestStart = Date.now();
		const telemetry = new TelemetryService(env, ctx);
		const normalizeEmail = (value: string | null): string | null => {
			if (!value) {
				return null;
			}
			const normalized = value.trim().toLowerCase();
			if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalized)) {
				return null;
			}
			return normalized;
		};
		const distinctIdFromEmail = (email: string): string => `user:${email}`;
		const sanitizeDistinctId = (value: string | null): string => {
			if (!value) {
				return `anon:${requestId}`;
			}
			const normalized = value.trim();
			if (!/^[a-zA-Z0-9:@._+-]{1,160}$/.test(normalized)) {
				return `anon:${requestId}`;
			}
			return normalized;
		};
		const clientDistinctId = sanitizeDistinctId(request.headers.get("x-distinct-id"));

		const sanitizeProperties = (
			properties: Record<string, unknown>,
		): Record<string, string | number | boolean | null> => {
			const allowed: Record<string, string | number | boolean | null> = {};
			let count = 0;

			for (const [key, value] of Object.entries(properties)) {
				if (count >= 20) {
					break;
				}
				if (!/^[a-zA-Z0-9_.-]{1,64}$/.test(key)) {
					continue;
				}

				if (
					typeof value === "string" ||
					typeof value === "number" ||
					typeof value === "boolean" ||
					value === null
				) {
					allowed[key] = value;
					count += 1;
				}
			}

			return allowed;
		};

		const baseProperties = {
			schemaVersion: 1,
			service: "isen-ical-worker",
			requestId,
			traceId,
			pathname,
			method,
		};

		const track = (
			event: string,
			properties: Record<string, unknown> = {},
			distinctId = clientDistinctId,
		): void => {
			telemetry.track({
				event,
				distinctId,
				properties: {
					...baseProperties,
					spanId: crypto.randomUUID(),
					...sanitizeProperties(properties),
				},
			});
		};

		const withRequestId = (response: Response): Response => {
			const headers = new Headers(response.headers);
			headers.set("x-request-id", requestId);
			track("backend_response_sent", {
				status: response.status,
				durationMs: Date.now() - requestStart,
			});
			return new Response(response.body, {
				status: response.status,
				statusText: response.statusText,
				headers,
			});
		};

		track("backend_request_received");

		if (method === "POST" && pathname === "/api/track") {
			try {
				const contentType = request.headers.get("content-type") || "";
				if (!contentType.includes("application/json")) {
					return withRequestId(
						new Response(JSON.stringify({ error: "Content-Type must be application/json" }), {
							status: 415,
							headers: { "Content-Type": "application/json" },
						}),
					);
				}

				const body = (await request.json()) as {
					event?: string;
					properties?: Record<string, unknown>;
					distinctId?: string;
				};

				if (!body.event || !body.event.startsWith("frontend_")) {
					return withRequestId(
						new Response(JSON.stringify({ error: "Event name is invalid" }), {
							status: 400,
							headers: { "Content-Type": "application/json" },
						}),
					);
				}

				const bodyEmail = normalizeEmail(
					typeof body.properties?.email === "string" ? body.properties.email : null,
				);
				const distinctId = bodyEmail
					? distinctIdFromEmail(bodyEmail)
					: sanitizeDistinctId(body.distinctId || clientDistinctId);

				track(
					body.event,
					{
						source: "frontend",
						...body.properties,
					},
					distinctId,
				);

				return withRequestId(
					new Response(JSON.stringify({ ok: true, requestId }), {
						status: 202,
						headers: { "Content-Type": "application/json" },
					}),
				);
			} catch (error) {
				const message = getErrorMessage(error);
				track("frontend_tracking_failed", {
					reason: "request_parsing_error",
				});
				return withRequestId(
					new Response(JSON.stringify({ error: `Tracking error: ${message}` }), {
						status: 500,
						headers: { "Content-Type": "application/json" },
					}),
				);
			}
		}

		if (method === "POST" && pathname === "/api/generate-token") {
			track("token_generation_requested");
			try {
				const body = (await request.json()) as { username: string; password: string };

				if (!body.username || !body.password) {
					track("token_generation_failed", {
						reason: "missing_credentials",
					});
					return withRequestId(
						new Response(JSON.stringify({ error: "Username and password are required" }), {
							status: 400,
							headers: { "Content-Type": "application/json" },
						}),
					);
				}

				const normalizedEmail = normalizeEmail(body.username);
				const userDistinctId = normalizedEmail
					? distinctIdFromEmail(normalizedEmail)
					: clientDistinctId;

				const aurionService = new AurionService(
					env,
					(event, properties) => {
						track(event, properties, userDistinctId);
					},
					requestScopedFetch,
				);
				await aurionService.getPlanning(body.username, body.password);

				const token = TokenService.generateToken();
				const encryptionKey = TokenService.generateEncryptionKey();

				const maxTokensPerUser = env.MAX_TOKENS_PER_USER ?? 3;
				await TokenService.storeToken(
					env.TOKENS,
					token,
					{ username: body.username, password: body.password },
					encryptionKey,
					maxTokensPerUser,
				);

				const calendarUrl = `${url.origin}/calendar/${token}?key=${encodeURIComponent(encryptionKey)}`;
				track(
					"token_generation_succeeded",
					{
						route: "api_generate_token",
					},
					userDistinctId,
				);

				return withRequestId(
					new Response(JSON.stringify({ token, encryptionKey, url: calendarUrl }), {
						status: 200,
						headers: { "Content-Type": "application/json" },
					}),
				);
			} catch (error) {
				const message = getErrorMessage(error);
				const status = getAurionErrorStatus(error);

				if (isInvalidAurionCredentials(error)) {
					track("token_generation_failed", {
						reason: "invalid_credentials",
					});
					return withRequestId(
						new Response(JSON.stringify({ error: "Invalid credentials" }), {
							status: 403,
							headers: { "Content-Type": "application/json" },
						}),
					);
				}

				track("token_generation_failed", {
					reason: "unexpected_error",
				});
				return withRequestId(
					new Response(JSON.stringify({ error: `Error: ${message}` }), {
						status,
						headers: { "Content-Type": "application/json" },
					}),
				);
			}
		}

		if (method === "GET" && pathname.startsWith("/calendar/")) {
			const token = pathname.split("/calendar/")[1];
			const encryptionKey = url.searchParams.get("key");

			if (!token || !encryptionKey) {
				track("calendar_token_request_failed", {
					reason: "missing_token_or_key",
				});
				return withRequestId(
					new Response("Token and encryption key are required", {
						status: 400,
					}),
				);
			}

			try {
				const credentials = await TokenService.getCredentials(env.TOKENS, token, encryptionKey);

				if (!credentials) {
					track("calendar_token_request_failed", {
						reason: "invalid_token",
					});
					return withRequestId(
						new Response("Invalid token", {
							status: 404,
						}),
					);
				}

				const normalizedEmail = normalizeEmail(credentials.username);
				const userDistinctId = normalizedEmail
					? distinctIdFromEmail(normalizedEmail)
					: clientDistinctId;

				const aurionService = new AurionService(
					env,
					(event, properties) => {
						track(event, properties, userDistinctId);
					},
					requestScopedFetch,
				);
				const events = await aurionService.getPlanning(credentials.username, credentials.password);
				track(
					"calendar_ical_generated",
					{
						eventsCount: events.length,
					},
					userDistinctId,
				);
				const ical = icalService.fromAurionEvents(events);

				return withRequestId(
					new Response(ical, {
						status: 200,
						headers: {
							"Content-Type": "text/calendar; charset=utf-8",
							"Content-Disposition": 'attachment; filename="isen-ical.ics"',
						},
					}),
				);
			} catch (error) {
				const message = getErrorMessage(error);
				const status = getAurionErrorStatus(error);

				if (isInvalidAurionCredentials(error)) {
					track("calendar_token_request_failed", {
						reason: "invalid_credentials",
					});
					return withRequestId(
						new Response("Invalid credentials", {
							status: 403,
						}),
					);
				}

				track("calendar_token_request_failed", {
					reason: "unexpected_error",
				});
				return withRequestId(
					new Response(`Error fetching schedule: ${message}`, {
						status,
					}),
				);
			}
		}

		if (method === "GET" && pathname === "/privacy") {
			const privacyPage = TemplateService.renderTemplate(TemplateName.PRIVACY, {
				requestId,
			});

			track("privacy_page_viewed");
			return withRequestId(
				new Response(privacyPage, {
					status: 200,
					headers: {
						"Content-Type": "text/html; charset=utf-8",
					},
				}),
			);
		}

		if (method === "GET" && pathname === "/favicon.ico") {
			return withRequestId(
				new Response(null, {
					status: 204,
					headers: {
						"Cache-Control": "public, max-age=3600",
					},
				}),
			);
		}

		if (method === "GET" && pathname === "/.well-known/appspecific/com.chrome.devtools.json") {
			return withRequestId(
				new Response(null, {
					status: 204,
					headers: {
						"Cache-Control": "no-store",
					},
				}),
			);
		}

		const acceptHeader = request.headers.get("Accept") || "";
		const baseUrl = url.origin;

		if (acceptHeader.includes("text/html")) {
			const urlObj = new URL(baseUrl);
			const webcalUrl = `webcal://${urlObj.host}/`;
			const homepage = TemplateService.renderTemplate(TemplateName.HOMEPAGE, {
				webcalUrl,
				requestId,
			});

			track("homepage_viewed");
			return withRequestId(
				new Response(homepage, {
					status: 200,
					headers: {
						"Content-Type": "text/html; charset=utf-8",
					},
				}),
			);
		}

		const authHeader = request.headers.get("Authorization");
		const parseResult = AuthService.parseAuthorizationHeader(authHeader);

		if (!parseResult.success) {
			track("basic_auth_failed", {
				reason: parseResult.reason,
			});
			return withRequestId(
				new Response(
					parseResult.reason === "missing_header"
						? "Authorization required"
						: "Invalid authorization format",
					{
						status: 401,
						headers: {
							"WWW-Authenticate": 'Basic realm="Identifiants Aurion"',
						},
					},
				),
			);
		}

		const { username, password } = parseResult.credentials;
		const normalizedEmail = normalizeEmail(username);
		const userDistinctId = normalizedEmail
			? distinctIdFromEmail(normalizedEmail)
			: clientDistinctId;
		track("basic_auth_succeeded", {}, userDistinctId);

		try {
			const aurionService = new AurionService(
				env,
				(event, properties) => {
					track(event, properties, userDistinctId);
				},
				requestScopedFetch,
			);
			const events = await aurionService.getPlanning(username, password);
			track(
				"calendar_ical_generated",
				{
					eventsCount: events.length,
				},
				userDistinctId,
			);
			const ical = icalService.fromAurionEvents(events);

			return withRequestId(
				new Response(ical, {
					status: 200,
					headers: {
						"Content-Type": "text/calendar; charset=utf-8",
						"Content-Disposition": 'attachment; filename="isen-ical.ics"',
					},
				}),
			);
		} catch (error) {
			const message = getErrorMessage(error);
			const status = getAurionErrorStatus(error);

			if (isInvalidAurionCredentials(error)) {
				track(
					"calendar_basic_auth_failed",
					{
						reason: "invalid_credentials",
					},
					userDistinctId,
				);
				return withRequestId(
					new Response("Invalid credentials", {
						status: 403,
					}),
				);
			}

			track(
				"calendar_basic_auth_failed",
				{
					reason: "unexpected_error",
				},
				userDistinctId,
			);
			return withRequestId(
				new Response(`Error fetching schedule: ${message}`, {
					status,
				}),
			);
		}
	},
};

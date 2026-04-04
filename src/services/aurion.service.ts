import {
	AurionSession,
	type AurionCacheEntry,
	type AurionCacheStore,
	type AurionPlanningOptions,
	type AurionPlanningEvent,
} from "aurion-sdk";
import { isAurionError } from "aurion-sdk";
import type { Env } from "../index";

const SESSION_CACHE_TTL_MS = 60 * 60 * 1000;
const TRANSPORT_CACHE_TTL_MS = 5 * 60 * 1000;
const PLANNING_DAYS_BEFORE_NOW = 31;
const PLANNING_DAYS_AFTER_NOW = 31 * 3;
const DATE_MARKER_KEY = "__isenIcalKvDate";

type SerializedValue =
	| null
	| boolean
	| number
	| string
	| { [key: string]: SerializedValue }
	| SerializedValue[];

function serializeValue(value: unknown): SerializedValue {
	if (
		value === null ||
		typeof value === "boolean" ||
		typeof value === "number" ||
		typeof value === "string"
	) {
		return value;
	}

	if (value instanceof Date) {
		return {
			[DATE_MARKER_KEY]: value.toISOString(),
		};
	}

	if (Array.isArray(value)) {
		return value.map((item) => serializeValue(item));
	}

	if (typeof value === "object") {
		const serializedEntries = Object.entries(value).map(([key, entryValue]) => [
			key,
			serializeValue(entryValue),
		]);

		return Object.fromEntries(serializedEntries);
	}

	return null;
}

function deserializeValue(value: SerializedValue): unknown {
	if (
		value === null ||
		typeof value === "boolean" ||
		typeof value === "number" ||
		typeof value === "string"
	) {
		return value;
	}

	if (Array.isArray(value)) {
		return value.map((item) => deserializeValue(item));
	}

	if (DATE_MARKER_KEY in value && typeof value[DATE_MARKER_KEY] === "string") {
		return new Date(value[DATE_MARKER_KEY]);
	}

	const deserializedEntries = Object.entries(value).map(([key, entryValue]) => [
		key,
		deserializeValue(entryValue),
	]);

	return Object.fromEntries(deserializedEntries);
}

class CloudflareAurionCacheStore implements AurionCacheStore {
	constructor(
		private readonly kv: KVNamespace,
		private readonly prefix: string,
	) {}

	private getKey(key: string): string {
		return `${this.prefix}:${key}`;
	}

	async get(key: string): Promise<AurionCacheEntry | undefined> {
		const stored = await this.kv.get(this.getKey(key));
		if (!stored) {
			return undefined;
		}

		try {
			return deserializeValue(JSON.parse(stored) as SerializedValue) as AurionCacheEntry;
		} catch {
			await this.delete(key);
			return undefined;
		}
	}

	async set(key: string, value: AurionCacheEntry): Promise<void> {
		await this.kv.put(this.getKey(key), JSON.stringify(serializeValue(value)));
	}

	async delete(key: string): Promise<void> {
		await this.kv.delete(this.getKey(key));
	}

	async clear(): Promise<void> {
		let cursor: string | undefined;

		do {
			const result = await this.kv.list({
				prefix: `${this.prefix}:`,
				cursor,
			});

			await Promise.all(result.keys.map(({ name }) => this.kv.delete(name)));
			cursor = result.list_complete ? undefined : result.cursor;
		} while (cursor);
	}
}

export class AurionService {
	private env: Env;
	private trackEvent?: (event: string, properties?: Record<string, unknown>) => void;
	private fetchFn: typeof fetch;
	private static readonly SDK_CACHE_PREFIX = "aurion-sdk";

	constructor(
		env: Env,
		trackEvent?: (event: string, properties?: Record<string, unknown>) => void,
		fetchFn: typeof fetch = fetch,
	) {
		this.env = env;
		this.trackEvent = trackEvent;
		this.fetchFn = fetchFn;
	}

	private track(event: string, properties?: Record<string, unknown>): void {
		this.trackEvent?.(event, properties);
	}

	private isCacheDisabled(): boolean {
		const value = this.env.DISABLE_CACHE;
		if (!value) {
			return false;
		}

		const normalized = value.toLowerCase();
		return normalized === "true" || normalized === "1" || normalized === "yes";
	}

	private getSdkCacheStore(): AurionCacheStore {
		return new CloudflareAurionCacheStore(this.env.CACHE, AurionService.SDK_CACHE_PREFIX);
	}

	static async clearSdkCache(kv: KVNamespace): Promise<void> {
		const store = new CloudflareAurionCacheStore(kv, AurionService.SDK_CACHE_PREFIX);
		await store.clear();
	}

	private buildPlanningOptions(): AurionPlanningOptions {
		const now = Date.now();

		return {
			start: new Date(now - PLANNING_DAYS_BEFORE_NOW * 24 * 60 * 60 * 1000),
			end: new Date(now + PLANNING_DAYS_AFTER_NOW * 24 * 60 * 60 * 1000),
		};
	}

	private async fetchPlanningFromSdk(
		email: string,
		password: string,
		options: AurionPlanningOptions | undefined,
		disableSdkCache: boolean,
	): Promise<AurionPlanningEvent[]> {
		this.track("aurion_fetch_planning_started", {
			start: options?.start?.getTime() ?? null,
			end: options?.end?.getTime() ?? null,
			disableSdkCache,
		});

		const session = new AurionSession({
			username: email,
			password,
			fetchFn: this.fetchFn,
			cache: disableSdkCache
				? false
				: {
						store: this.getSdkCacheStore(),
						sessionMaxAgeMs: SESSION_CACHE_TTL_MS,
						transportMaxAgeMs: TRANSPORT_CACHE_TTL_MS,
						timeRangeApproximation: {
							planning: {
								unit: "day",
								step: 1,
							},
						},
					},
		});

		const events = await session.getPlanning(options);
		this.track("aurion_fetch_planning_succeeded", {
			eventsCount: events.length,
			start: options?.start?.getTime() ?? null,
			end: options?.end?.getTime() ?? null,
		});

		return events;
	}

	private shouldRetryWithoutCache(error: unknown, disableSdkCache: boolean): boolean {
		if (disableSdkCache) {
			return false;
		}

		if (!isAurionError(error)) {
			return false;
		}

		return error.code === "AURION_TRANSPORT_ERROR";
	}

	private async fetchPlanningWithRetry(
		email: string,
		password: string,
		options: AurionPlanningOptions | undefined,
		disableSdkCache: boolean,
	): Promise<AurionPlanningEvent[]> {
		try {
			return await this.fetchPlanningFromSdk(email, password, options, disableSdkCache);
		} catch (error) {
			if (!this.shouldRetryWithoutCache(error, disableSdkCache)) {
				throw error;
			}

			this.track("planning_retry_after_error", {
				disableSdkCache,
				reason: isAurionError(error) ? error.code : "unknown",
			});

			return this.fetchPlanningFromSdk(email, password, options, true);
		}
	}

	async getPlanning(email: string, password: string): Promise<AurionPlanningEvent[]> {
		const planningOptions = this.buildPlanningOptions();
		const disableCache = this.isCacheDisabled();

		this.track("planning_request_started", {
			start: planningOptions?.start?.getTime() ?? null,
			end: planningOptions?.end?.getTime() ?? null,
			disableCache,
		});
		this.track("planning_cache_delegated_to_sdk", {
			store: disableCache ? "disabled" : "cloudflare-kv",
		});

		try {
			const events = await this.fetchPlanningWithRetry(
				email,
				password,
				planningOptions,
				disableCache,
			);
			this.track("planning_request_succeeded", {
				source: "aurion-sdk",
				cache: disableCache ? "disabled" : "sdk",
				eventsCount: events.length,
			});

			return events;
		} catch (error) {
			this.track("planning_request_failed", {
				cache: disableCache ? "disabled" : "sdk",
			});
			throw error;
		}
	}
}

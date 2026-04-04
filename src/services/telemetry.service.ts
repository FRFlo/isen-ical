import type { ExecutionContext } from "@cloudflare/workers-types";
import type { Env } from "../index";

type TelemetryProperties = Record<string, unknown>;

interface TelemetryEvent {
  event: string;
  distinctId: string;
  properties: TelemetryProperties;
}

export class TelemetryService {
  private readonly apiKey?: string;
  private readonly host: string;
  private readonly ctx?: ExecutionContext;

  constructor(env: Env, ctx?: ExecutionContext) {
    this.apiKey = env.POSTHOG_API_KEY;
    this.host = (env.POSTHOG_HOST || "https://eu.i.posthog.com").replace(/\/$/, "");
    this.ctx = ctx;
  }

  isEnabled(): boolean {
    return Boolean(this.apiKey);
  }

  track(event: TelemetryEvent): void {
    if (!this.apiKey) {
      return;
    }

    const payload = {
      api_key: this.apiKey,
      event: event.event,
      distinct_id: event.distinctId,
      properties: {
        ...event.properties,
        distinct_id: event.distinctId,
        $lib: "cloudflare-worker",
        $ip: null,
      },
      timestamp: new Date().toISOString(),
    };

    const sendPromise = fetch(`${this.host}/capture/`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(payload),
    }).catch((error) => {
      console.error("PostHog capture failed", error);
    });

    if (this.ctx) {
      this.ctx.waitUntil(sendPromise);
      return;
    }

    void sendPromise;
  }
}

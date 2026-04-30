/**
 * @summary In-memory sliding-window rate-limiter.
 *
 * @remarks
 * Voor een case-project is in-memory voldoende. In productie zou je dit
 * vervangen door Redis of Upstash, omdat een server-restart of meerdere
 * instances een lokale Map onbruikbaar maken.
 *
 * @example
 * ```ts
 * const runLimiter = new RateLimiter({ max: 5, windowMs: 60 * 60 * 1000 });
 * const decision = runLimiter.check(`run:${userId}`);
 * if (!decision.allowed) return new Response('Too many requests', { status: 429 });
 * ```
 */
export interface RateLimitDecision {
  readonly allowed: boolean;
  readonly resetAt: number;
  readonly remaining: number;
}

export class RateLimiter {
  private readonly hits = new Map<string, number[]>();

  public constructor(
    private readonly options: { readonly max: number; readonly windowMs: number },
  ) {}

  /**
   * Beslist of een nieuwe aanroep toegestaan is en registreert hem indien zo.
   *
   * @param key - Unieke identifier — typisch `<endpoint>:<userId>`.
   */
  public check(key: string): RateLimitDecision {
    const now = Date.now();
    const recent = (this.hits.get(key) ?? []).filter((t) => now - t < this.options.windowMs);

    if (recent.length >= this.options.max) {
      const resetAt = (recent[0] ?? now) + this.options.windowMs;
      return { allowed: false, resetAt, remaining: 0 };
    }

    recent.push(now);
    this.hits.set(key, recent);
    return {
      allowed: true,
      resetAt: now + this.options.windowMs,
      remaining: this.options.max - recent.length,
    };
  }
}

/**
 * Globale rate-limiter voor de zware run-endpoint: 5 evaluaties per uur per user.
 * Beschermt tegen runaway-API-kosten als een gebruiker per ongeluk de knop spamt.
 */
export const runLimiter = new RateLimiter({
  max: 5,
  windowMs: 60 * 60 * 1000,
});

/**
 * Lichtere limiter voor uploads — 30 per uur per user.
 */
export const uploadLimiter = new RateLimiter({
  max: 30,
  windowMs: 60 * 60 * 1000,
});

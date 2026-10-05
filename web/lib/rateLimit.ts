export class SlidingWindowLimiter {
  private entries = new Map<string, number[]>();
  check(key: string, limit: number, windowMs = 60_000, now = Date.now()) {
    const requests = (this.entries.get(key) || []).filter(time => time > now - windowMs);
    if (requests.length >= limit) return { allowed: false, retryAfter: Math.max(1, Math.ceil((requests[0] + windowMs - now) / 1000)) };
    requests.push(now);
    this.entries.set(key, requests);
    if (this.entries.size > 10_000) {
      for (const [entry, times] of this.entries) if (times[times.length - 1] <= now - windowMs) this.entries.delete(entry);
      // Fail closed for new identities rather than evicting active rate-limit state.
      if (this.entries.size > 10_000) { this.entries.delete(key); return { allowed: false, retryAfter: 60 }; }
    }
    return { allowed: true, retryAfter: 0 };
  }
}
export const rateLimiter = new SlidingWindowLimiter();

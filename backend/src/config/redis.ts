import Redis from 'ioredis';

let redisClient: Redis | null = null;

// Minimal in-memory stand-in for the subset of Redis commands this app uses
// (refresh-token storage in utils/jwt.ts and the rate limiter). It is used when
// REDIS_URL is not configured, e.g. a serverless deploy without Memorystore.
// State is per-process, which is sufficient for a single-instance deployment.
class InMemoryRedis {
  private store = new Map<string, { value: string; expireAt: number | null }>();
  private sets = new Map<string, { members: Set<string>; expireAt: number | null }>();

  private expired(meta: { expireAt: number | null } | undefined): boolean {
    return !!meta && meta.expireAt !== null && meta.expireAt <= Date.now();
  }

  private sweep(key: string): void {
    if (this.expired(this.store.get(key))) this.store.delete(key);
    if (this.expired(this.sets.get(key))) this.sets.delete(key);
  }

  async set(key: string, value: string, mode?: string, ttlSeconds?: number): Promise<'OK'> {
    const expireAt = mode === 'EX' && ttlSeconds ? Date.now() + ttlSeconds * 1000 : null;
    this.store.set(key, { value, expireAt });
    return 'OK';
  }

  async get(key: string): Promise<string | null> {
    this.sweep(key);
    return this.store.get(key)?.value ?? null;
  }

  async del(...keys: string[]): Promise<number> {
    let count = 0;
    for (const key of keys) {
      if (this.store.delete(key)) count++;
      if (this.sets.delete(key)) count++;
    }
    return count;
  }

  async sadd(key: string, ...members: string[]): Promise<number> {
    let set = this.sets.get(key);
    if (!set) {
      set = { members: new Set(), expireAt: null };
      this.sets.set(key, set);
    }
    let added = 0;
    for (const m of members) {
      if (!set.members.has(m)) {
        set.members.add(m);
        added++;
      }
    }
    return added;
  }

  async srem(key: string, ...members: string[]): Promise<number> {
    const set = this.sets.get(key);
    if (!set) return 0;
    let removed = 0;
    for (const m of members) if (set.members.delete(m)) removed++;
    return removed;
  }

  async smembers(key: string): Promise<string[]> {
    this.sweep(key);
    return this.sets.get(key) ? Array.from(this.sets.get(key)!.members) : [];
  }

  async expire(key: string, ttlSeconds: number): Promise<number> {
    const expireAt = Date.now() + ttlSeconds * 1000;
    let applied = 0;
    const s = this.store.get(key);
    const set = this.sets.get(key);
    if (s) {
      s.expireAt = expireAt;
      applied = 1;
    }
    if (set) {
      set.expireAt = expireAt;
      applied = 1;
    }
    return applied;
  }

  async ttl(key: string): Promise<number> {
    this.sweep(key);
    const meta = this.store.get(key) ?? this.sets.get(key);
    if (!meta) return -2;
    if (meta.expireAt === null) return -1;
    return Math.max(0, Math.ceil((meta.expireAt - Date.now()) / 1000));
  }

  async incr(key: string): Promise<number> {
    this.sweep(key);
    const current = this.store.get(key);
    const next = (current ? parseInt(current.value, 10) || 0 : 0) + 1;
    this.store.set(key, { value: String(next), expireAt: current?.expireAt ?? null });
    return next;
  }

  async keys(pattern: string): Promise<string[]> {
    const all = [...this.store.keys(), ...this.sets.keys()];
    if (pattern.endsWith('*')) {
      const prefix = pattern.slice(0, -1);
      return all.filter(k => k.startsWith(prefix));
    }
    return all.filter(k => k === pattern);
  }

  pipeline() {
    const ops: Array<() => Promise<unknown>> = [];
    const chain = {
      del: (...keys: string[]) => {
        ops.push(() => this.del(...keys));
        return chain;
      },
      exec: () => Promise.all(ops.map(op => op())),
    };
    return chain;
  }

  on(): this {
    return this;
  }

  async quit(): Promise<'OK'> {
    this.store.clear();
    this.sets.clear();
    return 'OK';
  }
}

export function getRedisClient(): Redis {
  if (!redisClient) {
    const url = process.env.REDIS_URL;

    if (!url) {
      redisClient = new InMemoryRedis() as unknown as Redis;
      return redisClient;
    }

    redisClient = new Redis(url, {
      maxRetriesPerRequest: 3,
      retryStrategy(times: number) {
        if (times > 10) return null;
        return Math.min(times * 200, 2000);
      },
    });

    redisClient.on('error', err => {
      console.error('Redis connection error:', err.message);
    });
  }
  return redisClient;
}

export async function closeRedisConnection(): Promise<void> {
  if (redisClient) {
    await redisClient.quit();
    redisClient = null;
  }
}

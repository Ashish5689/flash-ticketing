import { Redis as UpstashRedis } from "@upstash/redis";
import IORedis from "ioredis";
import { env } from "./env";

type RedisSetArgs = ["EX", number] | ["EX", number, "NX"];

interface AppRedis {
  get(key: string): Promise<unknown | null>;
  set(key: string, value: string, ...args: RedisSetArgs): Promise<"OK" | null>;
  del(...keys: string[]): Promise<number>;
  incr(key: string): Promise<number>;
  expire(key: string, seconds: number): Promise<number>;
  keys(pattern: string): Promise<string[]>;
  zadd(key: string, score: number, member: string): Promise<number>;
  zrank(key: string, member: string): Promise<number | null>;
  zrange(key: string, start: number, stop: number): Promise<string[]>;
  zrem(key: string, ...members: string[]): Promise<number>;
  sadd(key: string, member: string): Promise<number>;
  sismember(key: string, member: string): Promise<number>;
  eval(script: string, numKeys: number, ...args: string[]): Promise<unknown>;
  multi(): {
    zadd(key: string, score: number, member: string): ReturnType<AppRedis["multi"]>;
    set(key: string, value: string, ...args: RedisSetArgs): ReturnType<AppRedis["multi"]>;
    sadd(key: string, member: string): ReturnType<AppRedis["multi"]>;
    expire(key: string, seconds: number): ReturnType<AppRedis["multi"]>;
    zrem(key: string, ...members: string[]): ReturnType<AppRedis["multi"]>;
    exec(): Promise<unknown[]>;
  };
  quit(): Promise<unknown>;
}

class UpstashRestAdapter implements AppRedis {
  private client: UpstashRedis;

  constructor(url: string, token: string) {
    this.client = new UpstashRedis({ url, token });
  }

  async get(key: string) {
    const value = await this.client.get<string>(key);
    return value ?? null;
  }

  async set(key: string, value: string, ...args: RedisSetArgs) {
    const [, ex, nx] = args;
    const options = nx === "NX" ? ({ ex, nx: true } as const) : ({ ex } as const);
    const result = await this.client.set(key, value, options);
    return result === "OK" ? "OK" : null;
  }

  async del(...keys: string[]) {
    return this.client.del(...keys);
  }

  async incr(key: string) {
    return this.client.incr(key);
  }

  async expire(key: string, seconds: number) {
    return this.client.expire(key, seconds);
  }

  async keys(pattern: string) {
    return this.client.keys(pattern);
  }

  async zadd(key: string, score: number, member: string) {
    return (await this.client.zadd(key, { score, member })) ?? 0;
  }

  async zrank(key: string, member: string) {
    return this.client.zrank(key, member);
  }

  async zrange(key: string, start: number, stop: number) {
    return this.client.zrange<string[]>(key, start, stop);
  }

  async zrem(key: string, ...members: string[]) {
    return this.client.zrem(key, ...members);
  }

  async sadd(key: string, member: string) {
    return this.client.sadd(key, member);
  }

  async sismember(key: string, member: string) {
    const result = await this.client.sismember(key, member);
    return result ? 1 : 0;
  }

  async eval(script: string, numKeys: number, ...args: string[]) {
    const keys = args.slice(0, numKeys);
    const argv = args.slice(numKeys);
    return this.client.eval(script, keys, argv);
  }

  multi() {
    const operations: Array<() => Promise<unknown>> = [];
    const adapter = this;
    const chain = {
      zadd(key: string, score: number, member: string) {
        operations.push(() => adapter.zadd(key, score, member));
        return chain;
      },
      set(key: string, value: string, ...args: RedisSetArgs) {
        operations.push(() => adapter.set(key, value, ...args));
        return chain;
      },
      sadd(key: string, member: string) {
        operations.push(() => adapter.sadd(key, member));
        return chain;
      },
      expire(key: string, seconds: number) {
        operations.push(() => adapter.expire(key, seconds));
        return chain;
      },
      zrem(key: string, ...members: string[]) {
        operations.push(() => adapter.zrem(key, ...members));
        return chain;
      },
      exec() {
        return Promise.all(operations.map((operation) => operation()));
      }
    };
    return chain;
  }

  async quit() {
    return undefined;
  }
}

function createRedis(): AppRedis {
  if (env.UPSTASH_REDIS_REST_URL && env.UPSTASH_REDIS_REST_TOKEN) {
    return new UpstashRestAdapter(env.UPSTASH_REDIS_REST_URL, env.UPSTASH_REDIS_REST_TOKEN);
  }

  const client = new IORedis(env.REDIS_URL!, {
    maxRetriesPerRequest: null,
    enableReadyCheck: false,
    tls: env.REDIS_URL!.startsWith("rediss://") ? {} : undefined
  });
  return client as unknown as AppRedis;
}

export const redis = createRedis();
export const redisSubscriber = redis;

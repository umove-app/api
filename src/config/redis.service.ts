import { Injectable, Inject } from '@nestjs/common';
import { RedisClientType } from 'redis';

@Injectable()
export class RedisService {
  constructor(@Inject('REDIS_CLIENT') private readonly redisClient: RedisClientType) {}

  async get(key: string): Promise<string | null> {
    return await this.redisClient.get(key);
  }

  async set(key: string, value: string, ttl?: number): Promise<void> {
    if (ttl) {
      await this.redisClient.setEx(key, ttl, value);
    } else {
      await this.redisClient.set(key, value);
    }
  }

  async del(key: string): Promise<void> {
    await this.redisClient.del(key);
  }

  async exists(key: string): Promise<boolean> {
    const result = await this.redisClient.exists(key);
    return result === 1;
  }

  async setWithExpiry(key: string, value: string, seconds: number): Promise<void> {
    await this.redisClient.setEx(key, seconds, value);
  }

  async getJson<T>(key: string): Promise<T | null> {
    const value = await this.redisClient.get(key);
    return value ? JSON.parse(value) : null;
  }

  async setJson<T>(key: string, value: T, ttl?: number): Promise<void> {
    const stringValue = JSON.stringify(value);
    await this.set(key, stringValue, ttl);
  }

  async increment(key: string): Promise<number> {
    return await this.redisClient.incr(key);
  }

  async decrement(key: string): Promise<number> {
    return await this.redisClient.decr(key);
  }

  async expire(key: string, seconds: number): Promise<void> {
    await this.redisClient.expire(key, seconds);
  }

  async ttl(key: string): Promise<number> {
    return await this.redisClient.ttl(key);
  }

  // ==================== Atomic primitives (dispatch / locking) ====================

  /**
   * Atomically set `key=value` only if it does not already exist, with an
   * expiry. Returns true if the caller acquired the key (won the lock).
   * Used for "first driver to accept wins" order locking.
   */
  async setIfNotExists(key: string, value: string, ttlSeconds: number): Promise<boolean> {
    const result = await this.redisClient.set(key, value, {
      NX: true,
      EX: ttlSeconds,
    });
    return result === 'OK';
  }

  /**
   * Atomically delete `key` only if its current value equals `value`.
   * Prevents one actor from releasing a lock held by another.
   */
  async delIfValueMatches(key: string, value: string): Promise<boolean> {
    const script =
      'if redis.call("get", KEYS[1]) == ARGV[1] then return redis.call("del", KEYS[1]) else return 0 end';
    const result = (await this.redisClient.eval(script, {
      keys: [key],
      arguments: [value],
    })) as number;
    return result === 1;
  }

  /** Add a member to a set with a TTL refresh on the whole set. */
  async addToSet(key: string, member: string, ttlSeconds?: number): Promise<void> {
    await this.redisClient.sAdd(key, member);
    if (ttlSeconds) {
      await this.redisClient.expire(key, ttlSeconds);
    }
  }

  async setMembers(key: string): Promise<string[]> {
    return (await this.redisClient.sMembers(key)) as string[];
  }

  /** Flush the current Redis database. Intended for tests / controlled tooling. */
  async flushDb(): Promise<void> {
    await this.redisClient.flushDb();
  }
}

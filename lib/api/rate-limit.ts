import { NextResponse } from 'next/server';
import { Redis } from '@upstash/redis';

const redis = new Redis({
  url: process.env.UPSTASH_REDIS_REST_URL!,
  token: process.env.UPSTASH_REDIS_REST_TOKEN!,
});

const DEFAULT_WINDOW_MS = 60 * 1000;
const DEFAULT_MAX_REQUESTS = 10;

export async function rateLimit(
  key: string,
  maxRequests: number = DEFAULT_MAX_REQUESTS,
  windowMs: number = DEFAULT_WINDOW_MS
): Promise<{ ok: boolean; response?: NextResponse }> {
  if (!process.env.UPSTASH_REDIS_REST_URL || !process.env.UPSTASH_REDIS_REST_TOKEN) {
    // Fail open if Redis configuration is missing in dev environment
    return { ok: true };
  }

  const redisKey = `ratelimit:${key}`;

  try {
    const current = await redis.get<number>(redisKey);

    if (current !== null && current >= maxRequests) {
      const ttl = await redis.ttl(redisKey);
      return {
        ok: false,
        response: NextResponse.json(
          { error: 'Too many requests. Please try again later.' },
          {
            status: 429,
            headers: {
              'Retry-After': String(Math.max(1, ttl)),
            },
          }
        ),
      };
    }

    const multi = redis.multi();
    multi.incr(redisKey);
    if (current === null) {
      multi.expire(redisKey, Math.ceil(windowMs / 1000));
    }
    await multi.exec();

    return { ok: true };
  } catch (error) {
    console.error('[RateLimit]', error);
    // Fail open on connection errors to prevent locking out users
    return { ok: true };
  }
}

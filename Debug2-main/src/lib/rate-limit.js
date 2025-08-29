// Simple in-memory rate limiter
// In production, use Redis or a proper rate limiting service

const cache = new Map();

export default function rateLimit(options) {
  const { interval, uniqueTokenPerInterval } = options;

  return {
    check: (res, limit, token) => {
      return new Promise((resolve, reject) => {
        const now = Date.now();
        const windowStart = now - interval;

        // Get or create token data
        if (!cache.has(token)) {
          cache.set(token, []);
        }

        const tokenData = cache.get(token);
        
        // Remove old entries
        const validEntries = tokenData.filter(timestamp => timestamp > windowStart);
        
        // Check if limit exceeded
        if (validEntries.length >= limit) {
          res.setHeader('X-RateLimit-Limit', limit);
          res.setHeader('X-RateLimit-Remaining', 0);
          res.setHeader('X-RateLimit-Reset', Math.ceil((windowStart + interval) / 1000));
          reject(new Error('Rate limit exceeded'));
          return;
        }

        // Add current request
        validEntries.push(now);
        cache.set(token, validEntries);

        // Set rate limit headers
        res.setHeader('X-RateLimit-Limit', limit);
        res.setHeader('X-RateLimit-Remaining', limit - validEntries.length);
        res.setHeader('X-RateLimit-Reset', Math.ceil((windowStart + interval) / 1000));

        resolve();
      });
    }
  };
}

// Clean up old entries periodically
setInterval(() => {
  const now = Date.now();
  for (const [token, timestamps] of cache.entries()) {
    const validTimestamps = timestamps.filter(timestamp => now - timestamp < 60000); // 1 minute
    if (validTimestamps.length === 0) {
      cache.delete(token);
    } else {
      cache.set(token, validTimestamps);
    }
  }
}, 60000); // Clean up every minute 
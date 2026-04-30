"""
Async Redis cache layer for FAQ pairs and BM25 results.

TTL strategy
------------
- Normal FAQ:  24 h  (config: REDIS_FAQ_TTL)
- Hot FAQ:      7 d  (config: REDIS_FAQ_HOT_TTL) — triggered when frequency > HOT_THRESHOLD
- BM25 cache:   1 h  (config: REDIS_BM25_TTL)

All writes are write-through: MySQL update → Redis set.
"""

from __future__ import annotations

import hashlib
import json
from typing import Optional

import redis.asyncio as aioredis

from config.settings import settings

# ── Connection pool ─────────────────────────────────────────────────
pool = aioredis.ConnectionPool.from_url(
    settings.REDIS_URL,
    max_connections=settings.REDIS_POOL_SIZE,
)
redis = aioredis.Redis(connection_pool=pool)


def _faq_key(question: str) -> str:
    digest = hashlib.md5(question.encode("utf-8")).hexdigest()
    return f"faq:{digest}"


def _bm25_key(query: str) -> str:
    digest = hashlib.md5(query.encode("utf-8")).hexdigest()
    return f"bm25:{digest}"


# ── FAQ Cache ───────────────────────────────────────────────────────

async def faq_cache_get(question: str) -> Optional[dict]:
    """Retrieve a cached FAQ pair. Returns decoded dict or None."""
    raw = await redis.get(_faq_key(question))
    if raw:
        return json.loads(raw)
    return None


async def faq_cache_set(question: str, answer: str, frequency: int = 0) -> None:
    """Write FAQ pair to Redis with dynamic TTL."""
    key = _faq_key(question)
    payload = json.dumps({"question": question, "answer": answer, "frequency": frequency})

    ttl = (
        settings.REDIS_FAQ_HOT_TTL
        if frequency > settings.REDIS_FAQ_HOT_THRESHOLD
        else settings.REDIS_FAQ_TTL
    )
    await redis.setex(key, ttl, payload)


async def faq_cache_delete(question: str) -> None:
    await redis.delete(_faq_key(question))


async def faq_cache_clear() -> None:
    """Flush all FAQ-prefixed keys. Use with caution."""
    keys = []
    async for key in redis.scan_iter(match="faq:*"):
        keys.append(key)
    if keys:
        await redis.delete(*keys)


# ── BM25 Cache ──────────────────────────────────────────────────────

async def bm25_cache_get(query: str) -> Optional[list[dict]]:
    raw = await redis.get(_bm25_key(query))
    if raw:
        return json.loads(raw)
    return None


async def bm25_cache_set(query: str, results: list[dict]) -> None:
    key = _bm25_key(query)
    await redis.setex(key, settings.REDIS_BM25_TTL, json.dumps(results))

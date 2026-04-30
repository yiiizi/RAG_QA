"""
RAG Q&A Pipeline — main orchestrator.

Wires together: intent → strategy routing → retrieval → generation → logging.
"""

from __future__ import annotations

import logging
from typing import Any, Optional

from config.settings import settings
from mysql_module import redis_cache
from rag_qa.generator import generate, generate_stream
from rag_qa.intent_recognizer import recognize
from rag_qa.retriever import retrieve
from rag_qa.strategy_selector import StrategyResult, selector

logger = logging.getLogger(__name__)


# ── Strategy implementations ──────────────────────────────────────

async def _strategy_chat(query: str, extra: dict[str, Any]) -> dict[str, Any]:
    """Direct LLM chat — no retrieval."""
    answer = await generate(query, contexts=None, intent="chat")
    return {"answer": answer, "sources": [], "metadata": {"intent": "chat"}}


async def _strategy_faq(query: str, extra: dict[str, Any]) -> dict[str, Any]:
    """Cache-first FAQ path: Redis → MySQL → fallback retrieval."""
    # 1. Redis
    cached = await redis_cache.faq_cache_get(query)
    if cached:
        logger.info("FAQ: Redis hit")
        return {
            "answer": cached["answer"],
            "sources": [],
            "metadata": {"intent": "faq", "cache": "redis", "frequency": cached.get("frequency", 0)},
        }

    # 2. MySQL
    from mysql_module.dao import faq_get_by_question, async_session
    async with async_session() as session:
        faq = await faq_get_by_question(session, query)
        if faq:
            logger.info(f"FAQ: MySQL hit (freq={faq.frequency})")
            # Write back to Redis
            await redis_cache.faq_cache_set(faq.question, faq.answer, faq.frequency)
            return {
                "answer": faq.answer,
                "sources": [],
                "metadata": {"intent": "faq", "cache": "mysql", "frequency": faq.frequency, "id": faq.id},
            }

    # 3. Fallback: full retrieval
    logger.info("FAQ: cache miss — falling back to full retrieval")
    contexts = retrieve(query)
    answer = await generate(query, contexts=contexts, intent="knowledge_qa")
    return {
        "answer": answer,
        "sources": contexts,
        "metadata": {"intent": "faq", "fallback": True},
    }


async def _strategy_knowledge_qa(query: str, extra: dict[str, Any]) -> dict[str, Any]:
    """Full hybrid retrieval + generation."""
    contexts = retrieve(query)
    if extra.get("kb_only") and not contexts:
        return {"answer": "知识库中未找到相关内容，请尝试换个问题或上传相关文档。", "sources": [], "metadata": {"intent": "knowledge_qa", "kb_only": True}}
    answer = await generate(query, contexts=contexts, intent="knowledge_qa")
    return {"answer": answer, "sources": contexts, "metadata": {"intent": "knowledge_qa"}}


# Register strategies
selector.register("chat", _strategy_chat)
selector.register("faq", _strategy_faq)
selector.register("knowledge_qa", _strategy_knowledge_qa)


# ── Public API ────────────────────────────────────────────────────

async def ask(query: str, kb_only: bool = False) -> StrategyResult:
    """
    Ask a question through the full RAG pipeline.

    Returns StrategyResult with answer, sources, latency, metadata.
    """
    # 1. Intent recognition
    intent, confidence = await recognize(query)

    # 2. Route through strategy selector
    result = await selector.route(intent, query, extra={"kb_only": kb_only})

    # 3. Async logging (fire and forget)
    try:
        from mysql_module.dao import async_session, qalog_insert, faq_increment_frequency
        async with async_session() as session:
            await qalog_insert(
                session,
                query=query,
                intent=intent,
                answer=result.answer,
                latency_ms=result.latency_ms,
                hit_faq=(result.metadata.get("cache") in ("redis", "mysql")),
            )
            # Update FAQ frequency if it was a cache hit
            if result.metadata.get("cache") == "mysql":
                await faq_increment_frequency(session, query)
            await session.commit()
    except Exception:
        logger.exception("Failed to log QA record (non-fatal)")

    return result


async def ask_stream(query: str, kb_only: bool = False):
    """
    Streaming version — yields chunks.

    Yields dicts:
        {"type": "sources", "data": [...]}     # first: retrieved sources
        {"type": "token", "data": "..."}        # next: token deltas
        {"type": "done", "data": {...}}         # final: metadata
    """
    if kb_only:
        # KB-only mode: skip intent, skip FAQ cache, go straight to retrieval
        sources = retrieve(query)
        if not sources:
            yield {"type": "sources", "data": []}
            yield {"type": "token", "data": "知识库中未找到相关内容，请尝试换个问题或上传相关文档。"}
            yield {"type": "done", "data": {"intent": "knowledge_qa", "kb_only": True}}
            return
        stream = generate_stream(query, contexts=sources, intent="knowledge_qa")
        yield {"type": "sources", "data": sources}
        async for token in stream:
            yield {"type": "token", "data": token}
        yield {"type": "done", "data": {"intent": "knowledge_qa", "kb_only": True}}
        return

    intent, confidence = await recognize(query)

    if intent == "chat":
        sources = []
        stream = generate_stream(query, contexts=None, intent="chat")
    elif intent == "faq":
        cached = await redis_cache.faq_cache_get(query)
        if cached:
            yield {"type": "sources", "data": []}
            yield {"type": "token", "data": cached["answer"]}
            yield {"type": "done", "data": {"intent": "faq", "cache": "redis"}}
            return
        from mysql_module.dao import faq_get_by_question, async_session
        async with async_session() as session:
            faq = await faq_get_by_question(session, query)
        if faq:
            yield {"type": "sources", "data": []}
            yield {"type": "token", "data": faq.answer}
            yield {"type": "done", "data": {"intent": "faq", "cache": "mysql"}}
            return
        # Fallback
        sources = retrieve(query)
        stream = generate_stream(query, contexts=sources, intent="knowledge_qa")
    else:
        sources = retrieve(query)
        stream = generate_stream(query, contexts=sources, intent="knowledge_qa")

    yield {"type": "sources", "data": sources}

    async for token in stream:
        yield {"type": "token", "data": token}

    yield {"type": "done", "data": {"intent": intent}}

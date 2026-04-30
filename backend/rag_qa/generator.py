"""
LLM Generator: wraps OpenAI-compatible chat-completion API.

Supports:
- Non-streaming (standard)
- Streaming SSE (for WebSocket push)
"""

from __future__ import annotations

import logging
from typing import AsyncIterator, Optional

import httpx

from config.settings import settings

logger = logging.getLogger(__name__)


def _build_knowledge_qa_prompt(query: str, context: str) -> tuple[str, str]:
    """Build system + user messages for the knowledge-QA path."""
    system = (
        "You are a knowledgeable assistant. Answer the user's question "
        "based ONLY on the provided context below. If the context does not "
        "contain enough information, say so honestly. Do not make up facts.\n\n"
        "## Context\n"
        f"{context}\n\n"
        "## Instructions\n"
        "- Answer concisely in the same language as the question.\n"
        "- Cite specific details from the context when possible.\n"
        "- Use bullet points for lists."
    )
    return system, query


def _build_chat_prompt(query: str) -> tuple[str, str]:
    """Build system + user messages for the chat (casual) path."""
    system = (
        "You are a friendly and helpful AI assistant. "
        "Respond naturally to the user in their language."
    )
    return system, query


async def generate(
    query: str,
    contexts: list[dict] | None = None,
    stream: bool = False,
    intent: str = "knowledge_qa",
) -> str:
    """
    Generate an answer via LLM.

    Parameters
    ----------
    query : str
        The user question.
    contexts : list[dict] | None
        Retrieved knowledge passages.
    stream : bool
        If True, returns early (actual streaming done via generate_stream).
    intent : str
        Used to select the prompt template.

    Returns
    -------
    str
        The LLM reply text.
    """
    if intent == "chat" or not contexts:
        system, user = _build_chat_prompt(query)
    else:
        joined = "\n\n---\n\n".join(ctx["text"] for ctx in contexts)
        system, user = _build_knowledge_qa_prompt(query, joined)

    async with httpx.AsyncClient(timeout=settings.LLM_TIMEOUT) as client:
        resp = await client.post(
            f"{settings.LLM_API_BASE}/chat/completions",
            headers={
                "Authorization": f"Bearer {settings.LLM_API_KEY}",
                "Content-Type": "application/json",
            },
            json={
                "model": settings.LLM_MODEL,
                "messages": [
                    {"role": "system", "content": system},
                    {"role": "user", "content": user},
                ],
                "temperature": settings.LLM_TEMPERATURE,
                "max_tokens": settings.LLM_MAX_TOKENS,
                "stream": False,
            },
        )

    if resp.status_code != 200:
        logger.error(f"LLM request failed ({resp.status_code}): {resp.text}")
        return "Sorry, I encountered an error generating a response. Please try again."

    return resp.json()["choices"][0]["message"]["content"]


async def generate_stream(
    query: str,
    contexts: list[dict] | None = None,
    intent: str = "knowledge_qa",
) -> AsyncIterator[str]:
    """
    Stream LLM tokens via SSE.

    Yields content deltas (str). Call from a WebSocket endpoint.
    """
    if intent == "chat" or not contexts:
        system, user = _build_chat_prompt(query)
    else:
        joined = "\n\n---\n\n".join(ctx["text"] for ctx in contexts)
        system, user = _build_knowledge_qa_prompt(query, joined)

    async with httpx.AsyncClient(timeout=settings.LLM_TIMEOUT) as client:
        async with client.stream(
            "POST",
            f"{settings.LLM_API_BASE}/chat/completions",
            headers={
                "Authorization": f"Bearer {settings.LLM_API_KEY}",
                "Content-Type": "application/json",
            },
            json={
                "model": settings.LLM_MODEL,
                "messages": [
                    {"role": "system", "content": system},
                    {"role": "user", "content": user},
                ],
                "temperature": settings.LLM_TEMPERATURE,
                "max_tokens": settings.LLM_MAX_TOKENS,
                "stream": True,
            },
        ) as resp:
            if resp.status_code != 200:
                logger.error(f"LLM stream failed ({resp.status_code})")
                yield "Sorry, an error occurred."
                return

            async for line in resp.aiter_lines():
                if line.startswith("data: "):
                    data = line[6:]
                    if data == "[DONE]":
                        return
                    import json
                    try:
                        chunk = json.loads(data)
                        delta = chunk["choices"][0].get("delta", {})
                        content = delta.get("content", "")
                        if content:
                            yield content
                    except (json.JSONDecodeError, KeyError, IndexError):
                        continue

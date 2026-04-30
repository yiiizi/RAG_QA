"""
Intent Recognizer: classify user query into one of three intents.

Intents
-------
- chat           Casual conversation → route directly to LLM (no retrieval)
- faq            High-frequency Q&A  → check Redis/MySQL cache first
- knowledge_qa   Domain knowledge    → full hybrid retrieval + generation

Strategy: lightweight keyword-rule matching first (fast, no model cost),
then fall back to LLM classification for ambiguous cases.
"""

from __future__ import annotations

import logging
import re
from typing import Literal

import httpx

from config.settings import settings

logger = logging.getLogger(__name__)

Intent = Literal["chat", "faq", "knowledge_qa"]

# ── Keyword-rule patterns ──────────────────────────────────────────

# Greetings / small talk → chat
_CHAT_PATTERNS: list[re.Pattern] = [
    re.compile(r"^(你好|您好|hi|hello|嗨|早上好|晚上好|下午好)[!！。.]*$"),
    re.compile(r"^(谢谢|感谢|多谢|thanks|thank you)[!！。.]*$"),
    re.compile(r"^(再见|拜拜|bye|goodbye|88)[!！。.]*$"),
    re.compile(r"^(你是谁|你是|你的名字|what are you|who are you)"),
    re.compile(r"^(天气|今天|昨天|明天).{0,10}$"),
    re.compile(r"^(讲个笑话|笑话|好玩|有趣)"),
]

# FAQ-like short factual questions → faq
_FAQ_PATTERNS: list[re.Pattern] = [
    re.compile(r"^(如何|怎么|怎样)(重置|修改|找回|申请|办理|取消|退款|退货|注册|登录)"),
    re.compile(r"^(密码|账号|账户|订单|退款|客服|电话|地址|时间|流程|费用|价格)"),
    re.compile(r"^(忘记|找回)(密码|账号)"),
    re.compile(r"^(工作时间|营业时间|服务时间|联系方式|客服电话)"),
    re.compile(r".*(流程|步骤|条件|要求|规则|政策|费用).*(是什么|是啥|多少|什么样)"),
]


def _rule_match(text: str) -> tuple[Intent | None, float]:
    """Return (intent, confidence) from keyword rules, or (None, 0)."""
    text_stripped = text.strip().lower()

    for pat in _CHAT_PATTERNS:
        if pat.search(text_stripped):
            return "chat", 0.9

    for pat in _FAQ_PATTERNS:
        if pat.search(text_stripped):
            return "faq", 0.8

    return None, 0.0


# ── LLM fallback prompt ────────────────────────────────────────────

_INTENT_PROMPT = """Classify the user query into exactly one of these intents:

- **chat**: Casual conversation, greetings, chitchat, thanks, jokes. No domain knowledge needed.
- **faq**: Short factual question likely to have a standard answer (e.g. "How do I reset my password?", "What are your business hours?").
- **knowledge_qa**: In-depth question requiring retrieval from a knowledge base (e.g. technical docs, long-form content).

Reply with ONLY one word: chat, faq, or knowledge_qa.

User query: {query}
Intent:"""


async def _llm_classify(query: str) -> Intent:
    """Use a lightweight LLM call to classify intent."""
    prompt = _INTENT_PROMPT.format(query=query)

    async with httpx.AsyncClient(timeout=settings.LLM_TIMEOUT) as client:
        resp = await client.post(
            f"{settings.LLM_API_BASE}/chat/completions",
            headers={
                "Authorization": f"Bearer {settings.LLM_API_KEY}",
                "Content-Type": "application/json",
            },
            json={
                "model": settings.INTENT_LLM_MODEL or settings.LLM_MODEL,
                "messages": [
                    {"role": "system", "content": "You are an intent classifier. Reply with a single word only."},
                    {"role": "user", "content": prompt},
                ],
                "temperature": 0.0,
                "max_tokens": 10,
            },
        )

    if resp.status_code != 200:
        logger.warning(f"LLM intent classify failed ({resp.status_code}), defaulting to knowledge_qa")
        return "knowledge_qa"

    text = resp.json()["choices"][0]["message"]["content"].strip().lower()
    for intent in ("chat", "faq", "knowledge_qa"):
        if intent in text:
            return intent  # type: ignore[return-value]

    return "knowledge_qa"


async def recognize(query: str) -> tuple[Intent, float]:
    """
    Classify the user query.

    Returns
    -------
    (intent, confidence) — confidence in [0, 1].
    """
    # 1. Rule-based fast path
    intent, conf = _rule_match(query)
    if intent and conf >= settings.INTENT_RULE_THRESHOLD:
        logger.info(f"Intent (rule): {intent} (conf={conf:.2f})")
        return intent, conf

    # 2. LLM fallback
    logger.info("Intent: rule match low confidence, falling back to LLM")
    intent = await _llm_classify(query)
    logger.info(f"Intent (LLM): {intent}")
    return intent, 0.7

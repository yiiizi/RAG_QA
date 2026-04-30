"""
Hybrid retriever: Dense (Milvus) + Sparse (BM25) → RRF fusion → BGE-Reranker.

This is the core retrieval pipeline of the RAG system. It combines:
1. Dense recall  — Milvus ANN search with BGE-M3 embeddings
2. Sparse recall — BM25 lexical matching via rank-bm25
3. RRF fusion   — Reciprocal Rank Fusion merges both result lists
4. Re-rank      — BGE-Reranker cross-encoder for final precision ordering
"""

from __future__ import annotations

import logging

import numpy as np

from config.settings import settings
from mysql_module.bm25_scorer import search as bm25_search
from rag_qa.embedder import encode_single
from rag_qa.milvus_store import search as dense_search, is_available as milvus_available
from rag_qa.reranker import rerank

logger = logging.getLogger(__name__)


def _rrf_fusion(
    dense_results: list[dict],
    sparse_results: list[dict],
    k: int = 60,
    top_n: int = 20,
) -> list[dict]:
    """
    Reciprocal Rank Fusion.

    Each candidate gets score = sum( 1 / (k + rank_i) ) across result lists.

    Returns combined list sorted by RRF score descending.
    """
    scores: dict[str, dict] = {}  # keyed by passage text (dedup)

    for rank, item in enumerate(dense_results):
        key = item["text"]
        if key not in scores:
            scores[key] = {**item, "rrf_score": 0.0}
        scores[key]["rrf_score"] += 1.0 / (k + rank + 1)

    for rank, item in enumerate(sparse_results):
        key = item["text"]
        if key not in scores:
            scores[key] = {**item, "rrf_score": 0.0}
        scores[key]["rrf_score"] += 1.0 / (k + rank + 1)

    fused = sorted(scores.values(), key=lambda x: x["rrf_score"], reverse=True)
    return fused[:top_n]


def retrieve(
    query: str,
    dense_top_k: int | None = None,
    sparse_top_k: int | None = None,
    use_rerank: bool = True,
) -> list[dict]:
    """
    Run hybrid retrieval for a user query.

    Parameters
    ----------
    query : str
        The user question.
    dense_top_k : int, optional
        Top-K for Milvus ANN search.
    sparse_top_k : int, optional
        Top-K for BM25 search.
    use_rerank : bool
        Whether to apply BGE-Reranker after RRF fusion.

    Returns
    -------
    list[dict]
        Final ranked passages. Each dict has:
        {text, score, parent_id, parent_text, source, chunk_index}
    """
    dense_k = dense_top_k or settings.DENSE_TOP_K
    sparse_k = sparse_top_k or settings.SPARSE_TOP_K

    # ── 1. Dense retrieval ─────────────────────────────────────────
    dense_results: list[dict] = []
    if milvus_available():
        try:
            query_vec = encode_single(query)
            dense_results = dense_search(query_vec, top_k=dense_k)
        except Exception as e:
            logger.warning(f"Dense search failed (Milvus down?), falling back to BM25 only: {e}")
    else:
        logger.info("Milvus unavailable — skipping dense search")

    # ── 2. Sparse (BM25) retrieval ─────────────────────────────────
    sparse_results = bm25_search(query, top_k=sparse_k)

    # ── 3. RRF fusion ──────────────────────────────────────────────
    fused = _rrf_fusion(dense_results, sparse_results, k=settings.RRF_K)

    if not fused:
        logger.warning("No results after RRF fusion — returning empty")
        return []

    # ── 4. BGE-Reranker ────────────────────────────────────────────
    if use_rerank:
        try:
            passages = [item["text"] for item in fused]
            reranked = rerank(query, passages)

            # Map reranker output back to original items
            final: list[dict] = []
            for rr in reranked:
                original = fused[rr["index"]]
                final.append({
                    "text": original.get("parent_text", original["text"]),
                    "source": original.get("file_name", original.get("source", "")),
                    "score": rr["score"],
                    "parent_id": original.get("parent_id", ""),
                    "chunk_index": original.get("chunk_index", -1),
                })
            return final
        except Exception as e:
            logger.warning(f"Reranker failed, using fused results: {e}")

    # ── Without reranker — return fused directly ───────────────────
    return [
        {
            "text": item.get("parent_text", item["text"]),
            "source": item.get("file_name", item.get("source", "")),
            "score": item.get("rrf_score", item.get("score", 0.0)),
            "parent_id": item.get("parent_id", ""),
            "chunk_index": item.get("chunk_index", -1),
        }
        for item in fused
    ]

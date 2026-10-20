"""Optional LLM polish — rewrites explanation PROSE only.

The numbers, confidences, rankings and recommendations are computed before
this module ever runs, and it can only replace the `reason` text of an
insight with a nicer sentence built from the SAME structured evidence. If
OPENAI_API_KEY is unset or the call fails, the deterministic text stands.
Uses stdlib urllib so the engine has no hard dependency on an SDK.
"""
from __future__ import annotations

import json
import os
import urllib.request
import hashlib
import time
from collections import OrderedDict
from concurrent.futures import ThreadPoolExecutor, TimeoutError as FutureTimeout
from threading import Lock

# Socket timeouts do not bound the whole DNS/TLS/response lifecycle. Optional
# wording must fit inside Node's 15s analytics deadline. A single worker keeps
# timed-out calls from multiplying; unchanged evidence reuses a completed reply.
_WAIT_SECONDS = 2.0
_CACHE_SECONDS = 120
_pool = ThreadPoolExecutor(max_workers=1, thread_name_prefix="openai-prose")
_lock = Lock()
_pending = None
_cache = OrderedDict()


def _request_reasons(key, model, facts, count):
    try:
        payload = {
            "model": model,
            "store": False,
            "max_completion_tokens": 1600,
            "temperature": 0.2,
            "messages": [
                {
                    "role": "system",
                    "content": "Rewrite each 'reason' as one clear sentence for a school principal. "
                    "Use ONLY the numbers in the evidence — never add causes, numbers or claims. "
                    "Return JSON: {\"reasons\": [\"...\"]} in the same order.",
                },
                {"role": "user", "content": facts},
            ],
            "response_format": {"type": "json_object"},
        }
        req = urllib.request.Request(
            "https://api.openai.com/v1/chat/completions",
            data=json.dumps(payload).encode(),
            headers={"Authorization": f"Bearer {key}", "Content-Type": "application/json"},
        )
        with urllib.request.urlopen(req, timeout=10) as resp:
            data = json.loads(resp.read())
        choice = data["choices"][0]
        if choice.get("finish_reason") != "stop" or choice["message"].get("refusal"):
            return None
        reasons = json.loads(choice["message"]["content"]).get("reasons", [])
        if (isinstance(reasons, list) and len(reasons) == count
                and all(isinstance(text, str) and 0 < len(text.strip()) <= 2000 for text in reasons)):
            return [text.strip() for text in reasons]
    except Exception:
        pass  # deterministic text remains — the dashboard never depends on the LLM
    return None


def polish_reasons(insights: list[dict]) -> bool:
    global _pending
    key = os.environ.get("OPENAI_API_KEY", "").strip()
    if not key or not insights:
        return False
    model = os.environ.get("OPENAI_MODEL", "").strip() or "gpt-4o-mini"
    facts = json.dumps([{"reason": i["reason"], "evidence": i["evidence"]} for i in insights])
    fingerprint = hashlib.sha256((key + "\0" + model + "\0" + facts).encode()).hexdigest()
    now = time.monotonic()
    with _lock:
        if _pending and _pending[1].done():
            prior, future = _pending
            _cache[prior] = (now, future.result())
            _pending = None
            while len(_cache) > 32:
                _cache.popitem(last=False)
        hit = _cache.get(fingerprint)
        if hit and now - hit[0] < _CACHE_SECONDS:
            reasons = hit[1]
            future = None
        else:
            if _pending and _pending[0] != fingerprint:
                return False  # busy: retain deterministic prose, never queue more work
            if not _pending:
                _pending = (fingerprint, _pool.submit(_request_reasons, key, model, facts, len(insights)))
            future = _pending[1]
            reasons = None
    if future is not None:
        try:
            reasons = future.result(timeout=_WAIT_SECONDS)
        except FutureTimeout:
            return False  # worker continues; only the caller ever mutates its insights
    if reasons is None:
        return False
    for insight, text in zip(insights, reasons):
        insight["reason"] = text
        insight.setdefault("trace", {})["llmPolished"] = True
    return True

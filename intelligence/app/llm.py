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


def polish_reasons(insights: list[dict]) -> bool:
    key = os.environ.get("OPENAI_API_KEY", "").strip()
    if not key or not insights:
        return False
    try:
        payload = {
            "model": os.environ.get("OPENAI_MODEL", "").strip() or "gpt-4o-mini",
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
                {"role": "user", "content": json.dumps([
                    {"reason": i["reason"], "evidence": i["evidence"]} for i in insights
                ])},
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
            return False
        reasons = json.loads(choice["message"]["content"]).get("reasons", [])
        if (isinstance(reasons, list) and len(reasons) == len(insights)
                and all(isinstance(text, str) and 0 < len(text.strip()) <= 2000 for text in reasons)):
            for insight, text in zip(insights, reasons):
                insight["reason"] = text.strip()
                insight.setdefault("trace", {})["llmPolished"] = True
            return True
    except Exception:
        pass  # deterministic text remains — the dashboard never depends on the LLM
    return False

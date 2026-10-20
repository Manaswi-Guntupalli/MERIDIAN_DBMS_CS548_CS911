import copy
import io
import json
import time
from threading import Event
from unittest.mock import patch

import pytest
from app.llm import polish_reasons
from app import llm


@pytest.fixture(autouse=True)
def clear_polish_cache():
    if llm._pending:
        llm._pending[1].result(timeout=3)
    llm._pending = None
    llm._cache.clear()


def sample():
    return [{"reason": "Attendance is 90%.", "evidence": {"attendance": 90}, "trace": {}, "score": 90}]


def reply(reasons, finish="stop"):
    return io.BytesIO(json.dumps({"choices": [{"finish_reason": finish, "message": {
        "content": json.dumps({"reasons": reasons})}}]}).encode())


def test_missing_key_and_empty_insights_skip_provider(monkeypatch):
    with patch("urllib.request.urlopen") as send:
        assert not polish_reasons(sample())
        monkeypatch.setenv("OPENAI_API_KEY", "sk-fictional")
        assert not polish_reasons([])
        send.assert_not_called()


def test_polishes_only_prose_and_trace_with_bounded_request(monkeypatch):
    monkeypatch.setenv("OPENAI_API_KEY", "sk-fictional")
    items = sample()
    with patch("urllib.request.urlopen", return_value=reply(["Attendance stands at 90%."])) as send:
        assert polish_reasons(items)
        payload = json.loads(send.call_args.args[0].data)
        assert payload["store"] is False
        assert payload["max_completion_tokens"] == 1600
        assert send.call_args.kwargs["timeout"] == 10
    assert items[0]["reason"] == "Attendance stands at 90%."
    assert items[0]["trace"]["llmPolished"] is True
    assert items[0]["score"] == 90
    assert items[0]["evidence"] == {"attendance": 90}


@pytest.mark.parametrize("reasons,finish", [([], "stop"), ([None], "stop"), ([{}], "stop"),
    ([""], "stop"), (["partial"], "length"), (["a", "b"], "stop"), ("x", "stop")])
def test_malformed_output_preserves_all_original_data(monkeypatch, reasons, finish):
    monkeypatch.setenv("OPENAI_API_KEY", "sk-fictional")
    items = sample()
    before = copy.deepcopy(items)
    with patch("urllib.request.urlopen", return_value=reply(reasons, finish)):
        assert not polish_reasons(items)
    assert items == before


def test_provider_failure_preserves_original_data(monkeypatch):
    monkeypatch.setenv("OPENAI_API_KEY", "sk-fictional")
    items = sample()
    before = copy.deepcopy(items)
    with patch("urllib.request.urlopen", side_effect=TimeoutError):
        assert not polish_reasons(items)
    assert items == before


def test_slow_provider_never_blocks_dashboard_or_starts_duplicate_calls(monkeypatch):
    monkeypatch.setenv("OPENAI_API_KEY", "sk-fictional")
    monkeypatch.setattr(llm, "_WAIT_SECONDS", .02)
    release = Event()
    def slow_reply(*args, **kwargs):
        release.wait(timeout=2)
        return reply(["Attendance stands at 90%."])
    with patch("urllib.request.urlopen", side_effect=slow_reply) as send:
        try:
            items = sample()
            start = time.monotonic()
            assert not polish_reasons(items)
            assert time.monotonic() - start < .5
            assert items == sample()
            assert not polish_reasons(items)
            assert send.call_count == 1
            # Different evidence is never given a stale reply or queued behind it.
            different = sample()
            different[0]["evidence"] = {"attendance": 75}
            assert not polish_reasons(different)
            assert send.call_count == 1
            release.set()
            llm._pending[1].result(timeout=1)
            assert items == sample()  # background work cannot mutate returned data
            assert polish_reasons(items)
            assert items[0]["reason"] == "Attendance stands at 90%."
            assert send.call_count == 1
        finally:
            release.set()

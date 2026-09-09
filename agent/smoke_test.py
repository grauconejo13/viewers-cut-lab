from __future__ import annotations

import os
from importlib.metadata import version
from pathlib import Path
from types import SimpleNamespace

from google.adk.models.llm_response import LlmResponse
from google.genai import types


PLACEHOLDERS = {
    "CLICKHOUSE_HOST": "smoke-test.invalid",
    "CLICKHOUSE_PORT": "8443",
    "CLICKHOUSE_USER": "smoke-test-user",
    "CLICKHOUSE_PASSWORD": "smoke-test-password",
    "CLICKHOUSE_SECURE": "true",
    "CLICKHOUSE_DATABASE": "smoke-test-database",
}


def main() -> None:
    for name, placeholder in PLACEHOLDERS.items():
        os.environ.setdefault(name, placeholder)

    from agent import (
        _GROUNDING_STATE_KEY,
        _block_ungrounded_recommendation,
        _is_successful_grounding_query,
        _record_grounding_query,
        clickhouse_tools,
        root_agent,
    )

    server_params = clickhouse_tools.connection_params.server_params
    server_python = Path(server_params.command)

    assert version("google-adk") == "2.8.0"
    assert int(version("mcp").split(".", maxsplit=1)[0]) == 1
    assert server_python.is_file()
    assert server_params.args == ["-m", "mcp_clickhouse.main"]
    assert all(server_params.env[name] == os.environ[name] for name in PLACEHOLDERS)
    assert root_agent.name == "viewer_cut_production_agent"
    assert root_agent.model == "gemini-2.5-flash"
    assert root_agent.tools == [clickhouse_tools]
    assert not _is_successful_grounding_query("list_tables", {}, {})
    assert not _is_successful_grounding_query(
        "run_query", {"query": "SELECT * FROM another_table WHERE movie_id = 'x'"}, {}
    )
    assert _is_successful_grounding_query(
        "run_query",
        {"query": "SELECT * FROM default.viewer_cut_events WHERE movie_id = 'x'"},
        {"content": []},
    )
    assert not _is_successful_grounding_query(
        "run_query",
        {"query": "SELECT * FROM default.viewer_cut_events WHERE movie_id = 'x'"},
        {"is_error": True},
    )
    tool_context = SimpleNamespace(state={})
    _record_grounding_query(
        tool=SimpleNamespace(name="run_query"),
        args={
            "query": "SELECT * FROM default.viewer_cut_events WHERE movie_id = 'x'"
        },
        tool_context=tool_context,
        tool_response={"content": []},
    )
    assert tool_context.state[_GROUNDING_STATE_KEY] is True
    final_response = LlmResponse(
        content=types.Content(role="model", parts=[types.Part(text="Recommend action")])
    )
    assert (
        _block_ungrounded_recommendation(
            SimpleNamespace(state={}), final_response
        )
        is not None
    )
    assert (
        _block_ungrounded_recommendation(
            SimpleNamespace(state={_GROUNDING_STATE_KEY: True}), final_response
        )
        is None
    )

    print("Offline smoke test passed: ADK imports and MCP stdio configuration are valid.")
    print("No Gemini or ClickHouse network request was made.")


if __name__ == "__main__":
    main()

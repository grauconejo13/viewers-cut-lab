from __future__ import annotations

import asyncio
import os
import re
import sys
from pathlib import Path

from fastapi import FastAPI, HTTPException
from pydantic import BaseModel


APP = FastAPI(title="Viewer's Cut Production Intelligence")
_AGENT_DIR = Path(__file__).resolve().parent
_RUNNER = _AGENT_DIR / "run_agent.py"
_MOVIE_ID_PATTERN = re.compile(r"^[a-z0-9]+(?:-[a-z0-9]+)*$")
_AGENT_PREFIX = "viewer_cut_production_agent > "


class AnalyzeRequest(BaseModel):
    movie_id: str


class AnalyzeResponse(BaseModel):
    movie_id: str
    recommendation: str


def _validate_movie_id(movie_id: str) -> str:
    if len(movie_id) > 64 or not _MOVIE_ID_PATTERN.fullmatch(movie_id):
        raise HTTPException(status_code=400, detail="Invalid movie_id")
    return movie_id


def _extract_final_recommendation(stdout: str) -> str:
    lines = stdout.splitlines()
    chunks: list[str] = []
    collecting = False
    for line in lines:
        if line.startswith(_AGENT_PREFIX):
            payload = line[len(_AGENT_PREFIX) :]
            if payload.startswith("[Calling tool:") or payload.startswith("[Tool result:"):
                collecting = False
                chunks = []
                continue
            collecting = True
            chunks = [payload]
            continue
        if collecting:
            chunks.append(line)
    recommendation = "\n".join(chunks).strip()
    if not recommendation:
        raise HTTPException(status_code=502, detail="Agent returned no recommendation")
    return recommendation


@APP.get("/health")
async def health() -> dict[str, str]:
    return {"status": "ok"}


@APP.post("/analyze", response_model=AnalyzeResponse)
async def analyze(request: AnalyzeRequest) -> AnalyzeResponse:
    movie_id = _validate_movie_id(request.movie_id)

    process = await asyncio.create_subprocess_exec(
        sys.executable,
        str(_RUNNER),
        movie_id,
        cwd=str(_AGENT_DIR.parent),
        env=os.environ.copy(),
        stdout=asyncio.subprocess.PIPE,
        stderr=asyncio.subprocess.PIPE,
    )

    try:
        stdout_bytes, stderr_bytes = await asyncio.wait_for(
            process.communicate(), timeout=75
        )
    except asyncio.TimeoutError as error:
        process.kill()
        await process.communicate()
        raise HTTPException(status_code=504, detail="Production agent timed out") from error

    stdout = stdout_bytes.decode("utf-8", errors="replace")
    stderr = stderr_bytes.decode("utf-8", errors="replace")

    if process.returncode != 0:
        detail = stderr.strip() or stdout.strip() or "Production agent failed"
        raise HTTPException(status_code=502, detail=detail[-2000:])

    return AnalyzeResponse(
        movie_id=movie_id,
        recommendation=_extract_final_recommendation(stdout),
    )


if __name__ == "__main__":
    import uvicorn

    port = int(os.environ.get("PORT", "8080"))
    uvicorn.run("http_api:APP", host="0.0.0.0", port=port)

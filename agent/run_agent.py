from __future__ import annotations

import argparse
import asyncio
import re

from google.adk.runners import InMemoryRunner

from agent import root_agent


MOVIE_ID_PATTERN = re.compile(r"^[a-z0-9]+(?:-[a-z0-9]+)*$")


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(
        description="Run the Viewer’s Cut ADK agent for one fictional movie."
    )
    parser.add_argument("movie_id", nargs="?", default="luminous-archive")
    args = parser.parse_args()
    if len(args.movie_id) > 64 or not MOVIE_ID_PATTERN.fullmatch(args.movie_id):
        parser.error("movie_id must be a lowercase, hyphen-separated identifier")
    return args


async def main() -> None:
    args = parse_args()
    prompt = (
        f"Analyze the Viewer’s Cut movie {args.movie_id!r}. Query ClickHouse first, "
        "then return the four required evidence-grounded sections."
    )
    async with InMemoryRunner(agent=root_agent) as runner:
        await runner.run_debug(prompt, verbose=True)


if __name__ == "__main__":
    asyncio.run(main())

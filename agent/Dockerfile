FROM python:3.11-slim

WORKDIR /app

COPY requirements.txt /app/requirements.txt
COPY requirements-mcp.txt /app/requirements-mcp.txt

RUN python -m venv /app/.adk-venv \
    && /app/.adk-venv/bin/pip install --no-cache-dir -r /app/requirements.txt \
    && python -m venv /app/.venv \
    && /app/.venv/bin/pip install --no-cache-dir -r /app/requirements-mcp.txt

COPY . /app

ENV PORT=8080
EXPOSE 8080

CMD ["/app/.adk-venv/bin/python", "/app/http_api.py"]

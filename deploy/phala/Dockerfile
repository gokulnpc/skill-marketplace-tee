FROM python:3.12-slim

ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1 \
    PIP_NO_CACHE_DIR=1 \
    PYTHONPATH=/app/services/model-server:/app/services/tee-runner

RUN apt-get update && apt-get install -y --no-install-recommends curl ca-certificates \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

COPY services/tee-runner/pyproject.toml services/tee-runner/tee_runner /app/services/tee-runner/
COPY services/model-server/pyproject.toml services/model-server/model_server /app/services/model-server/

RUN pip install --upgrade pip \
    && pip install "/app/services/model-server" \
    && pip install "/app/services/tee-runner[dstack]"

COPY deploy/phala/entrypoint.sh /entrypoint.sh
RUN chmod +x /entrypoint.sh

ENV MODEL_MODE=ollama \
    MODEL_SERVER_URL=http://127.0.0.1:8000 \
    RUNNER_MODE=dstack \
    DSTACK_STRICT=true \
    OLLAMA_BASE_URL=http://ollama:11434 \
    OLLAMA_PULL_ON_START=true \
    MODEL_NAME=llama3.1:8b \
    MODEL_HASH=sha256:ollama-llama3.1-8b

EXPOSE 8080

ENTRYPOINT ["/entrypoint.sh"]

FROM debian:bookworm-slim

RUN apt-get update \
    && apt-get install -y --no-install-recommends sqlite3 postgresql-client \
    && rm -rf /var/lib/apt/lists/*

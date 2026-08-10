#!/usr/bin/env bash
# Starts the backend with backend/.env loaded. Spring Boot doesn't read
# .env files natively, so this replaces manually sourcing it every time.
set -euo pipefail
cd "$(dirname "$0")"

set -a
source .env
set +a

exec ./mvnw spring-boot:run

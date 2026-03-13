#!/bin/bash
set -e
# Warte auf DB und führe Migrations aus
echo "Warte auf Datenbank..."
sleep 2
alembic upgrade head || true
exec "$@"

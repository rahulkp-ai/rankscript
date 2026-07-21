#!/bin/bash
# =============================================================
#  RankScript — Neon DB initialization
#
#  Loads the schema and seed data into a fresh Neon Postgres
#  database. Run this ONCE, right after creating the Neon project.
#
#  Usage:
#    ./init_neon_db.sh "postgresql://user:password@host/rankscript?sslmode=require"
#
#  Requires the `psql` client installed locally.
#  On Ubuntu/Debian: sudo apt-get install postgresql-client
#  On macOS:          brew install libpq && brew link --force libpq
# =============================================================
set -e

CONN_STRING="$1"

if [ -z "$CONN_STRING" ]; then
  echo "Usage: ./init_neon_db.sh <neon_connection_string>"
  echo "Get this from: Neon Dashboard -> your project -> Connection Details"
  exit 1
fi

echo "Applying schema (database/00_schema.sql)..."
psql "$CONN_STRING" -f ../database/00_schema.sql

echo "Applying seed data (database/seed_data.sql)..."
psql "$CONN_STRING" -f ../database/seed_data.sql

echo "Done. Verifying tables..."
psql "$CONN_STRING" -c "\dt"

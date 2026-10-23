#!/bin/bash
# Creates the test database on first container startup.
# Docker runs all scripts in /docker-entrypoint-initdb.d/ once when the volume is empty.
set -e

psql -v ON_ERROR_STOP=1 --username "$POSTGRES_USER" --dbname "$POSTGRES_DB" <<-EOSQL
    CREATE DATABASE miniledger_test;
EOSQL

#!/usr/bin/env bash
# Throughput + p50/p99 latency profile for the login rate limiter.
# Requires autocannon (npx pulls it automatically, no global install needed).
#
# Usage: ./benchmark-ratelimit-load.sh [port]

PORT="${1:-3000}"
npx autocannon -c 50 -d 15 -p 10 "http://localhost:${PORT}/api/auth/login"

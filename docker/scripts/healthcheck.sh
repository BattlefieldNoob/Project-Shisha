#!/bin/sh
set -e
curl -f http://localhost:3000/health || exit 1
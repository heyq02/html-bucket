#!/bin/bash
set -euo pipefail

cd /home
exec node dist/api/main.js

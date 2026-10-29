#!/bin/bash
set -euo pipefail

cd /home
exec node dist/main.js

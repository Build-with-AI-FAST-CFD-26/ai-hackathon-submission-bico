#!/bin/bash
cd "$(git rev-parse --show-toplevel)"
git add frontend/
MSG="[frontend] auto: $(date '+%H:%M:%S') - $1"
git commit -m "${MSG:-'[frontend] auto: checkpoint'}"
git push origin frontend
echo "✅ Pushed to frontend branch"

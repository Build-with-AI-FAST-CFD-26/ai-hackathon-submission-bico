#!/bin/bash
cd "$(git rev-parse --show-toplevel)"
git add backend/
MSG="[backend] auto: $(date '+%H:%M:%S') - $1"
git commit -m "${MSG:-'[backend] auto: checkpoint'}"
git push origin backend
echo "✅ Pushed to backend branch"

#!/bin/bash
cd "$(git rev-parse --show-toplevel)"
git add ai/
MSG="${1:-[ai] auto: checkpoint}"
FULL_MSG="[ai] auto: $(date '+%H:%M:%S') - ${MSG}"
git commit -m "${FULL_MSG}"
git push origin ai-pipeline
echo "✅ Pushed to ai-pipeline branch at $(date)"

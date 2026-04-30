#!/usr/bin/env bash
set -euo pipefail

REPO_DIR="$(cd "$(dirname "$0")/.." && pwd)"
cd "$REPO_DIR"

if [ $# -gt 0 ]; then
  MSG="$*"
else
  read -r -p "Commit message: " MSG
fi

# show status
git status --short

# Stage all changes
git add -A

if git diff --cached --quiet; then
  echo "No changes staged. Nothing to commit."
  exit 0
fi

# Commit
git commit -m "$MSG"

# Get current branch
BRANCH=$(git rev-parse --abbrev-ref HEAD)

# If no upstream, set it on first push
if git rev-parse --abbrev-ref --symbolic-full-name @{u} >/dev/null 2>&1; then
  echo "Pushing to origin/$BRANCH"
  git push origin "$BRANCH"
else
  echo "Setting upstream and pushing to origin/$BRANCH"
  git push --set-upstream origin "$BRANCH"
fi

echo "Done."

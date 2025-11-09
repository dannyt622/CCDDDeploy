#!/bin/bash

set -e

# Usage:
#   ./deploy.sh                 # build current branch only
#   ./deploy.sh both            # build both main & theme/blue locally
#   ./deploy.sh both-push       # build both and push empty commits to trigger deploy
#   ./deploy.sh trigger-ci      # trigger GitHub Action (requires secrets set)

echo "==> CCDD deploy helper"

PROJECT_ROOT_DIR=$(cd "$(dirname "$0")" && pwd)
cd "$PROJECT_ROOT_DIR"

build_branch() {
  local BR=$1
  echo "\n==> Building branch: $BR"
  git rev-parse --verify "$BR" >/dev/null 2>&1 || { echo "Branch $BR not found"; return 1; }
  git checkout "$BR"
  cd front_end
  npm ci || npm install
  npm run build
  cd - >/dev/null
}

if [ "$1" = "both" ]; then
  build_branch main
  build_branch theme/blue
  echo "\n==> Local builds done. Push to trigger Vercel deployments:"
  echo "   git checkout main && git commit --allow-empty -m 'chore: deploy main' && git push"
  echo "   git checkout theme/blue && git commit --allow-empty -m 'chore: deploy blue' && git push"
  exit 0
fi

if [ "$1" = "both-push" ]; then
  build_branch main
  git commit --allow-empty -m "chore: deploy main" || true
  git push || true
  build_branch theme/blue
  git commit --allow-empty -m "chore: deploy blue" || true
  git push || true
  echo "\n==> Both branches pushed. Watch Vercel Deployments for progress."
  exit 0
fi

if [ "$1" = "trigger-ci" ]; then
  echo "\n==> Triggering GitHub Action (vercel-redeploy). Requires repo secrets: VERCEL_HOOK_MAIN, VERCEL_HOOK_BLUE"
  gh workflow run vercel-redeploy.yml || {
    echo "Install GitHub CLI and login: https://cli.github.com/"; exit 1;
  }
  echo "==> Dispatched. Check GitHub Actions tab."
  exit 0
fi

# default: build current branch only
CURR=$(git rev-parse --abbrev-ref HEAD)
build_branch "$CURR"
echo "\n==> Built $CURR. Push to trigger deployment:"
echo "   git commit --allow-empty -m 'chore: deploy $CURR' && git push"



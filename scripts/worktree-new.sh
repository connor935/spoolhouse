#!/usr/bin/env bash
# Create a git worktree for one redesign lane, branched off the feature trunk.
#
#   scripts/worktree-new.sh <slug> [base-branch]
#
# -> ../spoolhouse-wt/<slug> on branch redesign/<slug>, with node_modules
#    installed and .env copied. Ports are printed so parallel lanes don't clash.
# Remove after the PR merged:  git worktree remove ../spoolhouse-wt/<slug>
set -euo pipefail

slug="${1:?usage: scripts/worktree-new.sh <slug> [base-branch]}"
base="${2:-feature/redesign-spoolhouse-ui}"

root="$(git rev-parse --show-toplevel)"
dir="$(dirname "$root")/spoolhouse-wt/$slug"
branch="redesign/$slug"

if [[ -e "$dir" ]]; then
  echo "error: $dir already exists" >&2
  exit 1
fi

git -C "$root" fetch --quiet origin "$base" || true
git -C "$root" worktree add "$dir" -b "$branch" "$base"

# Gitignored files a checkout needs to run.
if [[ -f "$root/.env" ]]; then cp "$root/.env" "$dir/.env"; fi

(cd "$dir" && npm ci --no-audit --no-fund)

# Derive stable per-lane ports from the slug so lanes can run side by side.
offset=$(( $(printf '%s' "$slug" | cksum | cut -d' ' -f1) % 90 + 10 ))
cat <<EOF

Worktree ready: $dir  (branch $branch, base $base)
  cd $dir
  npm run dev -- -p 30$offset
  npm run storybook -- -p 60$offset
The dev DB is shared with the main checkout (127.0.0.1:5433).
EOF

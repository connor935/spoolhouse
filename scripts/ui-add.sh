#!/usr/bin/env bash
# Add shadcn/ui primitives in the folder-per-component layout.
#
#   scripts/ui-add.sh checkbox switch popover
#
# The shadcn CLI always writes flat components/ui/<name>.tsx files. This runs
# it, then moves every new flat file to components/ui/<name>/<name>.tsx and
# adds an index.ts barrel, so imports stay `@/components/ui/<name>`.
#
# If the CLI writes a flat file for a component that already has a folder
# (e.g. it re-fetched `button` as a dependency), the flat file is left in
# place and reported: diff it against the folder version and delete it.
set -euo pipefail

if [[ $# -eq 0 ]]; then
  echo "usage: scripts/ui-add.sh <component> [component...]" >&2
  exit 1
fi

root="$(git rev-parse --show-toplevel)"
ui="$root/components/ui"
cd "$root"

npx shadcn@latest add "$@"

conflicts=()
shopt -s nullglob
for file in "$ui"/*.tsx; do
  name="$(basename "$file" .tsx)"
  dir="$ui/$name"
  if [[ -d "$dir" ]]; then
    conflicts+=("components/ui/$name.tsx")
    continue
  fi
  mkdir -p "$dir"
  mv "$file" "$dir/$name.tsx"
  printf "export * from './%s';\n" "$name" > "$dir/index.ts"
  echo "moved components/ui/$name.tsx -> components/ui/$name/"
done

if [[ ${#conflicts[@]} -gt 0 ]]; then
  echo
  echo "These already exist as folders; the CLI wrote a flat copy next to them:" >&2
  printf '  %s\n' "${conflicts[@]}" >&2
  echo "Diff each against its folder version, keep what you need, delete the flat file." >&2
  exit 2
fi

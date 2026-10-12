// The meaning of a member's override list flips with their share mode:
// whitelist entries ARE shared, blacklist entries are EXCLUDED, and 'all'
// ignores the list. Pure so it can be unit-tested; getSharedFilaments()
// (lib/sharing.ts) is the only caller and the single place resolving group
// stock.
export function isMaterialShared(
  shareMode: string,
  overrideMaterialIds: ReadonlySet<string>,
  materialId: string
): boolean {
  if (shareMode === 'whitelist') return overrideMaterialIds.has(materialId);
  if (shareMode === 'blacklist') return !overrideMaterialIds.has(materialId);
  return true; // 'all'
}

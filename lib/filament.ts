import type { Filament, SpoolType } from "@/lib/db/schema"

export type FilamentView = {
  id: number
  name: string
  manufacturer: string
  filamentType: string
  color: string | null
  spoolTypeId: number
  // e.g. "Prusament — Standard (216 g)"
  spoolTypeLabel: string
  // Weight of the bare, empty spool (g), from the spool type
  emptyWeightGrams: number
  fullFilamentWeightGrams: number
  measuredTotalWeightGrams: number
  // Computed: how much filament is actually left on the spool (g)
  filamentLeftGrams: number
  // Computed: total weight of a brand-new full spool (empty spool + full filament)
  fullTotalWeightGrams: number
  percentLeft: number
  isEmpty: boolean
  isLow: boolean
  // Name of the current borrower, if this spool has an active lend (Epic 4)
  lentToName: string | null
}

const EMPTY_THRESHOLD_G = 5 // 5 g or less counts as empty
const LOW_THRESHOLD_PCT = 15

// Filament left = measured total weight on the scale minus the empty spool weight.
export function computeFilamentLeft(measuredTotalGrams: number, emptyWeightGrams: number): number {
  return Math.max(0, measuredTotalGrams - emptyWeightGrams)
}

export function spoolTypeLabel(st: Pick<SpoolType, "manufacturer" | "name" | "emptyWeightGrams">): string {
  return `${st.manufacturer} — ${st.name} (${st.emptyWeightGrams} g)`
}

export function toFilamentView(f: Filament, spoolType: SpoolType): FilamentView {
  const emptyWeightGrams = spoolType.emptyWeightGrams
  const filamentLeftGrams = computeFilamentLeft(f.measuredTotalWeightGrams, emptyWeightGrams)
  const fullTotalWeightGrams = emptyWeightGrams + f.fullFilamentWeightGrams
  const percentLeft =
    f.fullFilamentWeightGrams > 0
      ? Math.min(100, Math.max(0, (filamentLeftGrams / f.fullFilamentWeightGrams) * 100))
      : 0
  const isEmpty = filamentLeftGrams <= EMPTY_THRESHOLD_G

  return {
    id: f.id,
    name: f.name,
    manufacturer: f.manufacturer,
    filamentType: f.filamentType,
    color: f.color,
    spoolTypeId: f.spoolTypeId,
    spoolTypeLabel: spoolTypeLabel(spoolType),
    emptyWeightGrams,
    fullFilamentWeightGrams: f.fullFilamentWeightGrams,
    measuredTotalWeightGrams: f.measuredTotalWeightGrams,
    filamentLeftGrams,
    fullTotalWeightGrams,
    percentLeft,
    isEmpty,
    isLow: !isEmpty && percentLeft <= LOW_THRESHOLD_PCT,
    lentToName: null,
  }
}

export function formatWeight(grams: number): string {
  if (grams >= 1000) return `${(grams / 1000).toFixed(2)} kg`
  return `${Math.round(grams)} g`
}

export const FILAMENT_TYPES = ["PLA", "PETG", "ABS", "ASA", "TPU", "Nylon", "PC", "PVA", "HIPS", "Other"]

import type { Filament } from "@/lib/db/schema"

export type FilamentView = {
  id: number
  name: string
  manufacturer: string
  filamentType: string
  color: string | null
  emptySpoolWeight: number
  fullFilamentWeight: number
  measuredTotalWeight: number
  // Computed: how much filament is actually left on the spool (kg)
  filamentLeft: number
  // Computed: total weight of a brand-new full spool (empty spool + full filament)
  fullTotalWeight: number
  percentLeft: number
  isEmpty: boolean
  isLow: boolean
}

const EMPTY_THRESHOLD_KG = 0.005 // 5 g or less counts as empty
const LOW_THRESHOLD_PCT = 15

// Filament left = measured total weight on the scale minus the empty spool weight.
export function computeFilamentLeft(measuredTotalWeight: number, emptySpoolWeight: number): number {
  return Math.max(0, measuredTotalWeight - emptySpoolWeight)
}

export function toFilamentView(f: Filament): FilamentView {
  const emptySpoolWeight = Number(f.emptySpoolWeight)
  const fullFilamentWeight = Number(f.fullFilamentWeight)
  const measuredTotalWeight = Number(f.measuredTotalWeight)

  const filamentLeft = computeFilamentLeft(measuredTotalWeight, emptySpoolWeight)
  const fullTotalWeight = emptySpoolWeight + fullFilamentWeight
  const percentLeft =
    fullFilamentWeight > 0 ? Math.min(100, Math.max(0, (filamentLeft / fullFilamentWeight) * 100)) : 0
  const isEmpty = filamentLeft <= EMPTY_THRESHOLD_KG

  return {
    id: f.id,
    name: f.name,
    manufacturer: f.manufacturer,
    filamentType: f.filamentType,
    color: f.color,
    emptySpoolWeight,
    fullFilamentWeight,
    measuredTotalWeight,
    filamentLeft,
    fullTotalWeight,
    percentLeft,
    isEmpty,
    isLow: !isEmpty && percentLeft <= LOW_THRESHOLD_PCT,
  }
}

export function formatKg(kg: number): string {
  if (kg >= 1) return `${kg.toFixed(2)} kg`
  return `${Math.round(kg * 1000)} g`
}

export const FILAMENT_TYPES = ["PLA", "PETG", "ABS", "ASA", "TPU", "Nylon", "PC", "PVA", "HIPS", "Other"]

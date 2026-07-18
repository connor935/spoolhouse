import { FILAMENT_TYPES } from '@/lib/filament';

// Shared `Select` item lists + "all" sentinels for the filament-type and
// review-status filters used across the inventory filter and both catalogs.
export const FILAMENT_TYPE_ITEMS = FILAMENT_TYPES.map((t) => ({
  value: t,
  label: t,
}));

export const ALL_TYPES = '__all__';
export const TYPE_ITEMS = [
  { value: ALL_TYPES, label: 'All types' },
  ...FILAMENT_TYPE_ITEMS,
];

export const ALL_STATUS = '__all__';
export const STATUS_ITEMS = [
  { value: ALL_STATUS, label: 'All statuses' },
  { value: 'pending', label: 'Pending' },
  { value: 'rejected', label: 'Rejected' },
  { value: 'approved', label: 'Approved' },
];

// Toast copy for lend actions, shared by group-stock.tsx, borrows-panel.tsx
// and notifications-list.tsx so the wording can't drift between them.
export const LEND_TOAST = {
  requested: 'Requested to borrow — waiting for the owner',
  approved: 'Request approved',
  declined: 'Request declined',
  cancelled: 'Request cancelled',
  returned: 'Marked as returned',
} as const;

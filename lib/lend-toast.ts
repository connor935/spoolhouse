// Toast copy for lend actions, shared by the borrows, group-stock and
// notifications surfaces so the wording can't drift between them.
export const LEND_TOAST = {
  requested: 'Requested to borrow — waiting for the owner',
  approved: 'Request approved',
  declined: 'Request declined',
  cancelled: 'Request cancelled',
  returned: 'Marked as returned',
} as const;

// Static failure copy: server-action messages are masked in production, so
// these name the likely cause instead of passing the thrown text through.
export const LEND_ERROR = {
  requested: 'Could not request — someone may have asked for it first',
  answered: 'Could not answer — the request may already be handled',
  cancelled: 'Could not cancel — the owner may have answered already',
  returned: 'Could not mark returned — the lend may already be closed',
  weighed: 'Could not save the weight',
} as const;

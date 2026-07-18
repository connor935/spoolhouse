// Shared copy for the material/spool-type edit dialogs' description line:
// admin edits publish immediately, a submitter editing their own rejected
// entry resubmits it for re-review, otherwise it's pending-only visibility.
export function describeReviewStatus(
  isAdmin: boolean,
  status: string,
  noun: string
): string {
  if (isAdmin) {
    return 'Edits publish immediately and keep the current status.';
  }
  if (status === 'rejected') {
    return `Saving resubmits this ${noun} as pending for re-review.`;
  }
  return "Only you can see this until it's approved.";
}

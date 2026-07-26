import { toast } from 'sonner';

// Shared success copy for the material/spool-type "request new" flows: a
// pending submission is immediately usable by its submitter; admin
// submissions auto-approve and go straight into the catalog.
export function requestEntityToast(noun: string, created: { status: string }) {
  toast.success(
    created.status === 'approved'
      ? `${noun} added to the catalog`
      : `${noun} requested — you can use it right away`
  );
}

import Link from 'next/link';
import { notFound } from 'next/navigation';
import { getGroupByInviteCode } from '@/app/actions/groups';
import { JoinByLinkButton } from '@/components/groups/join-by-link-button';
import { requireUser } from '@/lib/auth-session';

export const dynamic = 'force-dynamic';

export default async function JoinGroupPage({
  params,
}: {
  params: Promise<{ code: string }>;
}) {
  await requireUser();
  const { code } = await params;
  const group = await getGroupByInviteCode(code);
  if (!group) notFound();

  return (
    <main className="mx-auto flex min-h-[60vh] max-w-md flex-col items-center justify-center px-4 py-8 text-center md:px-6">
      <h1 className="text-xl font-semibold tracking-tight">
        Join &quot;{group.name}&quot;?
      </h1>
      <p className="text-muted-foreground mt-1 text-sm">
        You&apos;ve been invited to join this group and share spools with its
        members.
      </p>
      <div className="mt-6 flex items-center gap-3">
        <JoinByLinkButton code={code} />
        <Link
          href="/groups"
          className="text-muted-foreground hover:text-foreground text-sm"
        >
          Cancel
        </Link>
      </div>
    </main>
  );
}

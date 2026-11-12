import { notFound } from 'next/navigation';
import { getGroupInvitePreview } from '@/app/actions/groups';
import { JoinGroupContainer } from '@/components/groups/join-group-card';
import { requireUser } from '@/lib/auth-session';

export const dynamic = 'force-dynamic';

// Standalone (no app shell): the JoinGroup board is a single centred card.
export default async function JoinGroupPage({
  params,
}: {
  params: Promise<{ code: string }>;
}) {
  await requireUser();
  const { code } = await params;
  const preview = await getGroupInvitePreview(code);
  if (!preview) notFound();

  return (
    <main className="bg-background flex min-h-dvh items-center justify-center px-4 py-10">
      <JoinGroupContainer code={code} preview={preview} />
    </main>
  );
}

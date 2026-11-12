import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';

/** "Felix Kratz" → "FK", "anna" → "AN", "Jean-Luc Picard" → "JP". */
function initials(name: string): string {
  const words = name.trim().split(/\s+/).filter(Boolean);
  if (words.length === 0) return '?';
  if (words.length === 1) return words[0].slice(0, 2).toUpperCase();
  return (words[0][0] + words[words.length - 1][0]).toUpperCase();
}

type InitialsAvatarProps = {
  name: string;
  /** The signed-in user: inverted tag, as on the group boards. */
  you?: boolean;
  className?: string;
};

// Design language: `.tag.avt` in .claude/design/spoolhouse.css. The full name
// is the accessible text; the initials are decoration.
function InitialsAvatar({ name, you = false, className }: InitialsAvatarProps) {
  return (
    <Badge
      variant={you ? 'inverted' : 'default'}
      title={name}
      data-slot="initials-avatar"
      className={cn('min-w-[26px]', className)}
    >
      <span aria-hidden="true">{initials(name)}</span>
      <span className="sr-only">{name}</span>
    </Badge>
  );
}

export { InitialsAvatar, initials };

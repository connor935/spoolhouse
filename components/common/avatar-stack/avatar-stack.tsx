import { InitialsAvatar } from '@/components/common/initials-avatar';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';

export type AvatarPerson = { id: string; name: string; you?: boolean };

type AvatarStackProps = {
  people: AvatarPerson[];
  /** Most avatars shown; past that the last slot becomes "+N". */
  max?: number;
  /** Names the list for screen readers. */
  label?: string;
  className?: string;
};

// Row of initials tags on the group cards ("FK AW JB MK TR", "FK LS PN KH +8").
function AvatarStack({
  people,
  max = 5,
  label = 'Members',
  className,
}: AvatarStackProps) {
  const overflow = people.length > max;
  const shown = overflow ? people.slice(0, Math.max(max - 1, 0)) : people;
  const rest = people.length - shown.length;

  return (
    <ul
      aria-label={label}
      data-slot="avatar-stack"
      className={cn('m-0 flex list-none flex-wrap gap-1.5 p-0', className)}
    >
      {shown.map((person) => (
        <li key={person.id} className="flex">
          <InitialsAvatar name={person.name} you={person.you} />
        </li>
      ))}
      {overflow && (
        <li className="flex">
          <Badge variant="muted" className="min-w-[26px]">
            <span aria-hidden="true">+{rest}</span>
            <span className="sr-only">and {rest} more</span>
          </Badge>
        </li>
      )}
    </ul>
  );
}

export { AvatarStack };

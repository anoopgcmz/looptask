import { Badge, type BadgeProps } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import type { TaskStatus } from '@/models/Task';

type BadgeVariant = NonNullable<BadgeProps['variant']>;

const STATUS_STYLES: Record<
  TaskStatus,
  { label: string; icon: string; variant: BadgeVariant; className?: string }
> = {
  OPEN: {
    label: 'Open',
    icon: '📝',
    variant: 'outline',
    className: 'text-[var(--tone-text)]',
  },
  IN_PROGRESS: {
    label: 'In Progress',
    icon: '⏳',
    variant: 'info',
  },
  IN_REVIEW: {
    label: 'In Review',
    icon: '👀',
    variant: 'secondary',
    className: 'text-[var(--brand-primary)]',
  },
  REVISIONS: {
    label: 'Revisions',
    icon: '✏️',
    variant: 'destructive',
  },
  FLOW_IN_PROGRESS: {
    label: 'Flow In Progress',
    icon: '🔄',
    variant: 'info',
    className: 'bg-[var(--status-info-soft)] text-[var(--color-status-info)]',
  },
  DONE: {
    label: 'Done',
    icon: '✅',
    variant: 'success',
  },
};

const SIZE_STYLES = {
  sm: 'px-2.5 py-0.5 text-xs leading-4',
  md: 'px-3 py-1 text-sm leading-5',
} as const;

export type StatusBadgeSize = keyof typeof SIZE_STYLES;

export interface StatusBadgeProps {
  status: TaskStatus;
  size?: StatusBadgeSize;
  className?: string;
  showIcon?: boolean;
}

export function StatusBadge({
  status,
  size = 'md',
  className,
  showIcon = true,
}: StatusBadgeProps) {
  const { label, icon, variant, className: statusClassName } =
    STATUS_STYLES[status];

  return (
    <Badge
      variant={variant}
      className={cn(
        'gap-1 rounded-full font-semibold normal-case shadow-sm ring-1 ring-inset ring-black/10 transition',
        'hover:ring-black/20 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--brand-primary)] focus-visible:ring-offset-2',
        'focus-visible:ring-offset-[var(--color-background)]',
        SIZE_STYLES[size],
        statusClassName,
        className,
      )}
    >
      {showIcon ? <span aria-hidden="true">{icon}</span> : null}
      <span>{label}</span>
    </Badge>
  );
}

export default StatusBadge;


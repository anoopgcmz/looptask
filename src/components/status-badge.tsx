import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import type { TaskStatus } from '@/models/Task';

const STATUS_STYLES: Record<TaskStatus, { label: string; icon: string; className: string }> = {
  OPEN: {
    label: 'Open',
    icon: '📝',
    className: 'bg-[#6B7280] text-white',
  },
  IN_PROGRESS: {
    label: 'In Progress',
    icon: '⏳',
    className: 'bg-[#3B82F6] text-white',
  },
  IN_REVIEW: {
    label: 'In Review',
    icon: '👀',
    className: 'bg-[#6366F1] text-white',
  },
  REVISIONS: {
    label: 'Revisions',
    icon: '✏️',
    className: 'bg-[#EF4444] text-white',
  },
  FLOW_IN_PROGRESS: {
    label: 'Flow In Progress',
    icon: '🔄',
    className: 'bg-[#8B5CF6] text-white',
  },
  DONE: {
    label: 'Done',
    icon: '✅',
    className: 'bg-[#10B981] text-white',
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
  const { label, icon, className: statusClassName } = STATUS_STYLES[status];

  return (
    <Badge
      className={cn(
        'gap-1 rounded-full font-semibold normal-case text-white shadow-sm ring-1 ring-inset ring-black/10 transition',
        'hover:ring-black/20 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#1F2937] focus-visible:ring-offset-2 focus-visible:ring-offset-[#F9FAFB]',
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


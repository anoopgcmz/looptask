import { Badge } from '@/components/ui/badge';
import type { TaskStatus } from '@/models/Task';

const STATUS_STYLES: Record<TaskStatus, { label: string; icon: string; className: string }> = {
  OPEN: { label: 'Open', icon: '📝', className: 'bg-gray-100 text-gray-800' },
  IN_PROGRESS: { label: 'In Progress', icon: '⏳', className: 'bg-blue-100 text-blue-800' },
  IN_REVIEW: { label: 'In Review', icon: '👀', className: 'bg-purple-100 text-purple-800' },
  REVISIONS: { label: 'Revisions', icon: '✏️', className: 'bg-yellow-100 text-yellow-800' },
  FLOW_IN_PROGRESS: {
    label: 'Flow In Progress',
    icon: '🔄',
    className: 'bg-indigo-100 text-indigo-800',
  },
  DONE: { label: 'Done', icon: '✅', className: 'bg-green-100 text-green-800' },
};

export function StatusBadge({ status }: { status: TaskStatus }) {
  const { label, icon, className } = STATUS_STYLES[status];
  return (
    <Badge className={`gap-1 ${className}`}>
      <span>{icon}</span>
      {label}
    </Badge>
  );
}

export default StatusBadge;


'use client';

import { motion } from 'framer-motion';
import { Avatar } from '@/components/ui/avatar';
import { cn } from '@/lib/utils';

export interface TimelineEvent {
  user: { name: string; avatar?: string };
  status: string;
  date: string;
  type?: 'comment' | 'update' | 'transition';
}

const ICONS: Record<NonNullable<TimelineEvent['type']>, string> = {
  comment: '💬',
  update: '✏️',
  transition: '🔀',
};

function formatTimestamp(date: string) {
  try {
    return new Intl.DateTimeFormat(undefined, {
      dateStyle: 'medium',
      timeStyle: 'short',
    }).format(new Date(date));
  } catch {
    return date;
  }
}

export function Timeline({ events }: { events: TimelineEvent[] }) {
  if (!events.length) {
    return (
      <div className="rounded-xl border border-dashed border-gray-200 bg-[#F9FAFB] px-4 py-6 text-center text-sm text-[#6B7280]">
        No activity yet.
      </div>
    );
  }

  return (
    <ul className="relative space-y-6 border-l border-gray-200 pl-6">
      {events.map((event, index) => {
        const interactive = Boolean(event.type);
        const icon = event.type ? ICONS[event.type] : '•';
        const fallbackInitial = event.user.name
          ? event.user.name.charAt(0)
          : undefined;
        return (
          <motion.li
            key={`${event.date}-${index}`}
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            className="group relative pl-4"
            aria-disabled={!interactive}
          >
            <span className="absolute -left-[26px] top-3 flex h-5 w-5 items-center justify-center rounded-full border border-[#4F46E5] bg-white text-[11px] font-semibold text-[#4F46E5]">
              {icon}
            </span>
            {index !== events.length - 1 ? (
              <span className="absolute -left-[18px] top-7 block h-full w-px bg-gray-200" aria-hidden />
            ) : null}
            <div
              className={cn(
                'flex items-start gap-3 rounded-lg border border-transparent px-4 py-3 transition-colors',
                'group-hover:border-[#E5E7EB] group-hover:bg-[#F9FAFB]',
                'group-aria-[disabled=true]:opacity-70 group-aria-[disabled=true]:hover:border-transparent group-aria-[disabled=true]:hover:bg-transparent'
              )}
            >
              <Avatar
                src={event.user.avatar}
                fallback={fallbackInitial}
                className="h-9 w-9 flex-shrink-0"
              />
              <div className="flex-1">
                <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
                  <span className="text-sm font-semibold text-[#111827]">{event.user.name}</span>
                  <time className="text-xs text-[#6B7280]">
                    {formatTimestamp(event.date)}
                  </time>
                </div>
                <p className="mt-1 text-sm text-[#6B7280]">{event.status}</p>
              </div>
            </div>
          </motion.li>
        );
      })}
    </ul>
  );
}

export default Timeline;


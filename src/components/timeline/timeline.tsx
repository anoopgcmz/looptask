'use client';

import { motion } from 'framer-motion';
import { Avatar } from '@/components/ui/avatar';

export interface TimelineEvent {
  user: { name: string; avatar?: string };
  status: string;
  date: string;
}

export function Timeline({ events }: { events: TimelineEvent[] }) {
  return (
    <div className="bg-white">
      <ul className="relative ml-4 border-l border-gray-200">
        {events.map((event, index) => (
          <motion.li
            key={index}
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            className="relative pl-8 pb-8 text-gray-700"
          >
            {index > 0 && (
              <motion.span
                className="absolute -left-px -top-8 w-px bg-[#2684FF]"
                initial={{ height: 0 }}
                animate={{ height: 32 }}
                transition={{ duration: 0.3 }}
              />
            )}
            <span className="absolute -left-2 top-1 w-4 h-4 rounded-full border-2 border-[#2684FF] bg-white" />
            <div className="flex items-start gap-4">
              <Avatar
                src={event.user.avatar}
                fallback={event.user.name.charAt(0)}
              />
              <div>
                <div className="font-medium">{event.user.name}</div>
                <div className="text-sm">
                  <span>{event.status}</span>
                  <span className="ml-2 text-gray-500">
                    {new Date(event.date).toLocaleString()}
                  </span>
                </div>
              </div>
            </div>
          </motion.li>
        ))}
      </ul>
    </div>
  );
}

export default Timeline;


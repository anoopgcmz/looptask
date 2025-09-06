'use client';

import { LoopStep } from '@/hooks/useLoopBuilder';
import { Avatar } from '@/components/ui/avatar';
import { cn } from '@/lib/utils';
import { motion } from 'framer-motion';

export interface User {
  _id: string;
  name: string;
  avatar?: string;
}

export type UserMap = Record<string, User>;

export interface StepWithStatus extends LoopStep {
  status?: 'PENDING' | 'ACTIVE' | 'COMPLETED' | 'BLOCKED';
}

export function LoopVisualizer({ steps, users }: { steps: StepWithStatus[]; users: UserMap }) {
  if (!steps.length) {
    return (
      <div className="text-sm text-gray-500">No steps defined yet.</div>
    );
  }

  const ordered = [...steps].sort((a, b) => a.index - b.index);

  return (
    <div className="flex items-center overflow-x-auto py-2">
      {ordered.map((step, idx) => {
        const user = step.assignedTo ? users[step.assignedTo] : undefined;
        const invalid = !step.assignedTo || !step.description;
        const dependencyIndexes = step.dependencies
          .map((id) => ordered.find((s) => s.id === id)?.index + 1)
          .filter((n): n is number => !!n && n > 0)
          .join(', ');
        return (
          <div key={step.id} className="flex items-center">
            <motion.div
              className={cn(
                'flex flex-col items-center p-2 min-w-[120px] rounded border bg-white',
                invalid && 'border-red-500 bg-red-50'
              )}
              initial={false}
              animate={{
                scale:
                  step.status === 'ACTIVE'
                    ? 1.05
                    : step.status === 'COMPLETED'
                    ? 0.95
                    : 1,
                opacity: step.status === 'COMPLETED' ? 0.7 : 1,
              }}
              transition={{ duration: 0.3 }}
            >
              <Avatar
                src={user?.avatar}
                fallback={user?.name?.[0] || '?'}
                className="w-10 h-10 mb-2"
              />
              <span className="text-sm text-center">
                {step.description || 'Untitled Step'}
              </span>
              <span className="mt-1 text-xs font-medium">
                {step.status ?? 'PENDING'}
              </span>
              {dependencyIndexes && (
                <span className="mt-1 text-xs text-gray-500">
                  Depends on: {dependencyIndexes}
                </span>
              )}
            </motion.div>
            {idx < ordered.length - 1 && (
              <motion.div
                className="mx-2 h-0.5 bg-gray-300"
                initial={false}
                animate={{ width: step.status === 'COMPLETED' ? 32 : 0 }}
                transition={{ duration: 0.3 }}
              />
            )}
          </div>
        );
      })}
    </div>
  );
}

export default LoopVisualizer;


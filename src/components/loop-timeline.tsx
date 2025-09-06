'use client';

import { useState } from 'react';
import { motion } from 'framer-motion';
import { LoopStep } from '@/hooks/useLoopBuilder';
import { Avatar } from '@/components/ui/avatar';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import { cn } from '@/lib/utils';

interface User {
  _id: string;
  name: string;
  avatar?: string;
}

type StepStatus = 'PENDING' | 'ACTIVE' | 'COMPLETED' | 'BLOCKED';

export interface StepWithStatus extends LoopStep {
  status?: StepStatus;
}

export default function LoopTimeline({
  steps,
  users,
  currentStep,
}: {
  steps: StepWithStatus[];
  users: User[];
  currentStep?: number;
}) {
  const [selected, setSelected] = useState<StepWithStatus | null>(null);

  if (!steps.length) {
    return <div className="text-sm text-gray-500">No steps defined yet.</div>;
  }

  const ordered = [...steps].sort((a, b) => a.index - b.index);
  const selectedUser = selected
    ? users.find((u) => u._id === selected.assignedTo)
    : null;

  const statusStyles: Record<StepStatus, string> = {
    PENDING: 'border-gray-300 bg-gray-100 text-gray-700',
    ACTIVE: 'border-blue-500 bg-blue-100 text-blue-700',
    COMPLETED: 'border-green-500 bg-green-100 text-green-700',
    BLOCKED: 'border-red-500 bg-red-100 text-red-700',
  };

  return (
    <>
      <div className="flex flex-col md:flex-row items-stretch md:items-center overflow-auto py-2">
        {ordered.map((step, idx) => {
          const user = users.find((u) => u._id === step.assignedTo);
          const isCurrent = idx === currentStep;
          return (
            <div key={step.id} className="flex flex-col md:flex-row items-center">
              <div className="relative">
                {isCurrent && (
                  <motion.span
                    layoutId="current-step"
                    className="absolute -inset-1 rounded ring-2 ring-blue-500 shadow-md pointer-events-none"
                    transition={{ type: 'spring', stiffness: 400, damping: 30 }}
                  />
                )}
                <motion.button
                  layout
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: isCurrent ? 1.05 : 1 }}
                  whileHover={{ scale: 1.05 }}
                  onClick={() => setSelected(step)}
                  className={cn(
                    'relative flex flex-col items-center p-3 min-w-[120px] rounded border cursor-pointer z-10',
                    statusStyles[step.status ?? 'PENDING']
                  )}
                  title={step.description}
                  transition={{ type: 'spring', stiffness: 300, damping: 20 }}
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
                </motion.button>
              </div>
              {idx < ordered.length - 1 && (
                <>
                  <div className="hidden md:block mx-2 h-0.5 w-8 bg-gray-300" />
                  <div className="md:hidden my-2 w-0.5 h-8 bg-gray-300" />
                </>
              )}
            </div>
          );
        })}
      </div>
      <Dialog open={!!selected} onOpenChange={() => setSelected(null)}>
        <DialogContent>
          {selected && (
            <div className="space-y-2">
              <h2 className="text-lg font-medium">
                {selected.description || 'Untitled Step'}
              </h2>
              <p className="text-sm">Status: {selected.status ?? 'PENDING'}</p>
              {selected.estimatedTime && (
                <p className="text-sm">Estimated: {selected.estimatedTime}h</p>
              )}
              {selectedUser && (
                <p className="text-sm">Assigned to: {selectedUser.name}</p>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}

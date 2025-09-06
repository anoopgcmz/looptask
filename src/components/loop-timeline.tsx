'use client';

import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { LoopStep } from '@/hooks/useLoopBuilder';
import { Avatar } from '@/components/ui/avatar';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import CommentThread from '@/components/comment-thread';
import { cn } from '@/lib/utils';

interface User {
  _id: string;
  name: string;
  avatar?: string;
}

type StepStatus = 'PENDING' | 'ACTIVE' | 'COMPLETED' | 'BLOCKED';

export interface StepWithStatus extends LoopStep {
  status?: StepStatus;
  comments?: string;
}

export default function LoopTimeline({
  steps,
  users,
  currentStep,
  taskId,
}: {
  steps: StepWithStatus[];
  users: User[];
  currentStep?: number;
  taskId?: string;
}) {
  const [selected, setSelected] = useState<StepWithStatus | null>(null);
  const [localSteps, setLocalSteps] = useState<StepWithStatus[]>(steps);
  const [reassign, setReassign] = useState<StepWithStatus | null>(null);
  const [assignee, setAssignee] = useState('');
  const [comment, setComment] = useState<StepWithStatus | null>(null);

  const handleComplete = async (s: StepWithStatus) => {
    if (!taskId) return;
    await fetch(`/api/tasks/${taskId}/loop`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ sequence: [{ index: s.index, status: 'COMPLETED' }] }),
    });
    setLocalSteps((prev) =>
      prev.map((step) =>
        step.index === s.index ? { ...step, status: 'COMPLETED' } : step
      )
    );
  };

  const handleReassign = async () => {
    if (!taskId || !reassign || !assignee) return;
    await fetch(`/api/tasks/${taskId}/loop`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ sequence: [{ index: reassign.index, assignedTo: assignee }] }),
    });
    setLocalSteps((prev) =>
      prev.map((step) =>
        step.index === reassign.index ? { ...step, assignedTo: assignee } : step
      )
    );
    setReassign(null);
  };

  useEffect(() => {
    setLocalSteps(steps);
  }, [steps]);

  if (!localSteps.length) {
    return <div className="text-sm text-gray-500">No steps defined yet.</div>;
  }

  const ordered = [...localSteps].sort((a, b) => a.index - b.index);
  const selectedUser = selected
    ? users.find((u) => u._id === selected.assignedTo)
    : null;
  const selectedDependencies = selected?.dependencies?.map(
    (d) => localSteps.find((s) => s.id === d)?.description || d
  );

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
                  {taskId && (
                    <div className="absolute top-1 right-1 flex gap-1">
                      <button
                        className="text-xs"
                        onClick={(e) => {
                          e.stopPropagation();
                          void handleComplete(step);
                        }}
                      >
                        ✓
                      </button>
                      <button
                        className="text-xs"
                        onClick={(e) => {
                          e.stopPropagation();
                          setReassign(step);
                          setAssignee(step.assignedTo);
                        }}
                      >
                        ↺
                      </button>
                      <button
                        className="text-xs"
                        onClick={(e) => {
                          e.stopPropagation();
                          setComment(step);
                        }}
                      >
                        💬
                      </button>
                    </div>
                  )}
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
              {selectedDependencies && selectedDependencies.length > 0 && (
                <p className="text-sm">
                  Dependencies: {selectedDependencies.join(', ')}
                </p>
              )}
              {selected.comments && (
                <p className="text-sm">Comments: {selected.comments}</p>
              )}
              {selectedUser && (
                <p className="text-sm">Assigned to: {selectedUser.name}</p>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>
      <Dialog open={!!reassign} onOpenChange={() => setReassign(null)}>
        <DialogContent>
          {reassign && (
            <div className="space-y-2">
              <h2 className="text-lg font-medium">Reassign Step</h2>
              <select
                className="w-full border rounded p-2 text-sm"
                value={assignee}
                onChange={(e) => setAssignee(e.target.value)}
              >
                <option value="">Select user</option>
                {users.map((u) => (
                  <option key={u._id} value={u._id}>
                    {u.name}
                  </option>
                ))}
              </select>
              <Button
                disabled={!assignee}
                onClick={() => void handleReassign()}
              >
                Save
              </Button>
            </div>
          )}
        </DialogContent>
      </Dialog>
      <Dialog open={!!comment} onOpenChange={() => setComment(null)}>
        <DialogContent>
          {comment && taskId && <CommentThread taskId={taskId} />}
        </DialogContent>
      </Dialog>
    </>
  );

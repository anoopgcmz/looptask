'use client';

import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { LoopStep } from '@/hooks/useLoopBuilder';
import { Avatar } from '@/components/ui/avatar';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import CommentThread from '@/components/comment-thread';

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

  const statusColors: Record<
    StepStatus,
    { bg: string; border: string; text: string }
  > = {
    PENDING: {
      bg: '#f3f4f6',
      border: '#d1d5db',
      text: '#374151',
    },
    ACTIVE: {
      bg: '#dbeafe',
      border: '#3b82f6',
      text: '#1e40af',
    },
    COMPLETED: {
      bg: '#dcfce7',
      border: '#22c55e',
      text: '#166534',
    },
    BLOCKED: {
      bg: '#fee2e2',
      border: '#ef4444',
      text: '#991b1b',
    },
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
                  animate={{
                    opacity: 1,
                    scale: isCurrent ? 1.05 : 1,
                    backgroundColor: statusColors[step.status ?? 'PENDING'].bg,
                    borderColor: statusColors[step.status ?? 'PENDING'].border,
                    color: statusColors[step.status ?? 'PENDING'].text,
                  }}
                  whileHover={{ scale: 1.05 }}
                  onClick={() => setSelected(step)}
                  className="relative flex flex-col items-center p-2 sm:p-3 md:p-4 min-w-24 sm:min-w-28 md:min-w-32 rounded border cursor-pointer z-10"
                  title={step.description}
                  transition={{ type: 'spring', stiffness: 300, damping: 20 }}
                >
                  <Avatar
                    src={user?.avatar}
                    fallback={user?.name?.[0] || '?'}
                    className="mb-2 sm:w-10 sm:h-10 md:w-12 md:h-12"
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
                  <motion.div
                    className="hidden md:block mx-2 h-0.5 bg-gray-300"
                    initial={false}
                    animate={{ width: step.status === 'COMPLETED' ? 32 : 0 }}
                    transition={{ duration: 0.3 }}
                  />
                  <motion.div
                    className="md:hidden my-2 w-0.5 bg-gray-300"
                    initial={false}
                    animate={{ height: step.status === 'COMPLETED' ? 32 : 0 }}
                    transition={{ duration: 0.3 }}
                  />
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

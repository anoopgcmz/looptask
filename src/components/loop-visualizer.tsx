'use client';

import { LoopStep } from '@/hooks/useLoopBuilder';
import { Avatar } from '@/components/ui/avatar';
import { cn } from '@/lib/utils';

interface User {
  _id: string;
  name: string;
  avatar?: string;
}

export function LoopVisualizer({ steps, users }: { steps: LoopStep[]; users: User[] }) {
  if (!steps.length) {
    return (
      <div className="text-sm text-gray-500">No steps defined yet.</div>
    );
  }

  const ordered = [...steps].sort((a, b) => a.index - b.index);

  return (
    <div className="flex items-center overflow-x-auto py-2">
      {ordered.map((step, idx) => {
        const user = users.find((u) => u._id === step.assignedTo);
        const invalid = !step.assignedTo || !step.description;
        const dependencyIndexes = step.dependencies
          .map((id) => ordered.find((s) => s.id === id)?.index + 1)
          .filter((n): n is number => !!n && n > 0)
          .join(', ');
        return (
          <div key={step.id} className="flex items-center">
            <div
              className={cn(
                'flex flex-col items-center p-2 min-w-[120px] rounded border bg-white',
                invalid && 'border-red-500 bg-red-50'
              )}
            >
              <Avatar
                src={user?.avatar}
                fallback={user?.name?.[0] || '?'}
                className="w-10 h-10 mb-2"
              />
              <span className="text-sm text-center">
                {step.description || 'Untitled Step'}
              </span>
              {dependencyIndexes && (
                <span className="mt-1 text-xs text-gray-500">
                  Depends on: {dependencyIndexes}
                </span>
              )}
            </div>
            {idx < ordered.length - 1 && (
              <div className="mx-2 h-0.5 w-8 bg-gray-300" />
            )}
          </div>
        );
      })}
    </div>
  );
}

export default LoopVisualizer;


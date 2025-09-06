'use client';

import { StepsProgress } from './steps-progress';

export function LoopProgress({ total, completed }: { total: number; completed: number }) {
  const percent = total ? Math.round((completed / total) * 100) : 0;
  return (
    <div className="flex flex-col gap-1">
      <StepsProgress current={completed} total={total} />
      <span className="text-xs text-gray-600">{percent}% complete</span>
    </div>
  );
}

export default LoopProgress;

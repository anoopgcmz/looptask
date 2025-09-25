import { z } from 'zod';
import type { TaskStepPayload } from '@/types/api/task';

export const stepSchema: z.ZodType<TaskStepPayload> = z
  .object({
    title: z.string().trim().min(1, 'Step title is required'),
    ownerId: z.string().trim().min(1, 'Step owner is required'),
    description: z.string().optional(),
    dueAt: z.coerce.date().optional(),
    status: z.enum(['OPEN', 'IN_PROGRESS', 'DONE']).optional(),
    completedAt: z.coerce.date().optional(),
  });

export default stepSchema;

'use client';
import { useState } from 'react';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { StepsProgress } from '@/components/steps-progress';
import { z } from 'zod';

const simpleSchema = z.object({
  title: z.string().min(1, 'Title is required'),
  owner: z.string().min(1, 'Owner is required'),
});

const flowSchemas = [
  z.object({ owner: z.string().min(1, 'Owner is required') }),
  z.object({ description: z.string().min(1, 'Description is required') }),
  z.object({ due: z.string().min(1, 'Due date is required') }),
];

export default function NewTaskPage() {
  const [simple, setSimple] = useState({ title: '', owner: '' });
  const [simpleError, setSimpleError] = useState<string | null>(null);

  const submitSimple = (e: React.FormEvent) => {
    e.preventDefault();
    const res = simpleSchema.safeParse(simple);
    if (!res.success) {
      setSimpleError(res.error.errors[0].message);
      return;
    }
    alert('Submitted simple task');
  };

  const [step, setStep] = useState(1);
  const [flow, setFlow] = useState({ owner: '', description: '', due: '' });
  const [flowError, setFlowError] = useState<string | null>(null);

  const next = () => {
    const schema = flowSchemas[step - 1];
    const key = ['owner', 'description', 'due'][step - 1] as 'owner' | 'description' | 'due';
    const res = schema.safeParse({ [key]: flow[key] });
    if (!res.success) {
      setFlowError(res.error.errors[0].message);
      return;
    }
    setFlowError(null);
    if (step < 3) setStep(step + 1);
    else alert('Flow complete');
  };

  const back = () => setStep((s) => Math.max(1, s - 1));

  const flowContent = (
    <div>
      <StepsProgress current={step} total={3} />
      {step === 1 && (
        <div className="space-y-2">
          <Input
            placeholder="Owner"
            value={flow.owner}
            onChange={(e) => setFlow({ ...flow, owner: e.target.value })}
          />
        </div>
      )}
      {step === 2 && (
        <Textarea
          placeholder="Description"
          value={flow.description}
          onChange={(e) => setFlow({ ...flow, description: e.target.value })}
        />
      )}
      {step === 3 && (
        <Input
          type="date"
          value={flow.due}
          onChange={(e) => setFlow({ ...flow, due: e.target.value })}
        />
      )}
      {flowError && <p className="text-red-600 text-sm mt-2">{flowError}</p>}
      <div className="flex gap-2 mt-4">
        {step > 1 && <Button type="button" variant="outline" onClick={back}>Back</Button>}
        <Button type="button" onClick={next}>{step < 3 ? 'Next' : 'Finish'}</Button>
      </div>
    </div>
  );

  return (
    <div className="p-4">
      <Tabs defaultValue="simple">
        <TabsList className="mb-4">
          <TabsTrigger value="simple">Simple</TabsTrigger>
          <TabsTrigger value="flow">Flow</TabsTrigger>
        </TabsList>
        <TabsContent value="simple">
          <form onSubmit={submitSimple} className="space-y-2">
            <Input
              placeholder="Title"
              value={simple.title}
              onChange={(e) => setSimple({ ...simple, title: e.target.value })}
            />
            <Input
              placeholder="Owner"
              value={simple.owner}
              onChange={(e) => setSimple({ ...simple, owner: e.target.value })}
            />
            {simpleError && (
              <p className="text-red-600 text-sm">{simpleError}</p>
            )}
            <Button type="submit">Create</Button>
          </form>
        </TabsContent>
        <TabsContent value="flow">{flowContent}</TabsContent>
      </Tabs>
    </div>
  );
}

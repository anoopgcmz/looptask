'use client';

import { Dialog, DialogTrigger, DialogContent, DialogClose } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import React from 'react';

interface DeleteTaskModalProps {
  children: React.ReactNode;
  onConfirm: () => void;
}

export default function DeleteTaskModal({ children, onConfirm }: DeleteTaskModalProps) {
  return (
    <Dialog>
      <DialogTrigger asChild>{children}</DialogTrigger>
      <DialogContent>
        <p className="mb-4">Are you sure you want to delete this task?</p>
        <div className="flex justify-end gap-2">
          <DialogClose asChild>
            <Button variant="outline">Cancel</Button>
          </DialogClose>
          <Button onClick={onConfirm}>Delete</Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}


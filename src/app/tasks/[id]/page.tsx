"use client";

import TaskDetail from "@/components/task-detail";

export default function TaskPage({ params }: { params: { id: string } }) {
  return <TaskDetail id={params.id} />;
}


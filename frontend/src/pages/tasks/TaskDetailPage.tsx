import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { completeTask, getTaskById, getTaskMeta, updateTask } from "@/lib/tasks-service";
import TaskDetailContent from "@/components/tasks/TaskDetailContent";
import type { TaskDetail } from "@/lib/tasks-types";

export default function TaskDetailPage() {
  const { id } = useParams();
  const [task, setTask] = useState<TaskDetail | null>(null);
  const [statuses, setStatuses] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const load = async () => {
    if (!id) {
      return;
    }

    setLoading(true);
    try {
      const [taskData, meta] = await Promise.all([getTaskById(id), getTaskMeta()]);
      setTask(taskData);
      setStatuses(meta.statuses);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void load();
  }, [id]);

  if (loading || !task) {
    return <p className="text-xs text-gray-500">Loading task...</p>;
  }

  return (
    <section className="space-y-3">
      <TaskDetailContent
        task={task}
        statuses={statuses}
        saving={saving}
        onStatusChange={(status) => {
          setSaving(true);
          void updateTask(task.id, { status }).then((updated) => setTask(updated)).finally(() => setSaving(false));
        }}
        onComplete={() => {
          setSaving(true);
          void completeTask(task.id).then((updated) => setTask(updated)).finally(() => setSaving(false));
        }}
      />
    </section>
  );
}

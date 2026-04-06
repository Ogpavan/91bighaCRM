import { useNavigate } from "react-router-dom";
import TaskForm from "@/components/tasks/TaskForm";
import type { TaskDetail } from "@/lib/tasks-types";

export default function CreateTaskPage() {
  const navigate = useNavigate();

  const handleSuccess = (task: TaskDetail) => {
    navigate(`/tasks/${task.id}`);
  };

  return (
    <div className="space-y-3">
      <TaskForm onSuccess={handleSuccess} onCancel={() => navigate("/tasks")} />
    </div>
  );
}

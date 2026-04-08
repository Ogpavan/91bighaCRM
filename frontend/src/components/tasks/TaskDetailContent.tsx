import type { ReactNode } from "react";
import { Link } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Select } from "@/components/ui/select";
import { formatTaskDateTime } from "@/lib/tasks-formatters";
import TaskPriorityBadge from "@/components/tasks/TaskPriorityBadge";
import TaskStatusBadge from "@/components/tasks/TaskStatusBadge";
import TaskTypeBadge from "@/components/tasks/TaskTypeBadge";
import type { TaskDetail } from "@/api/tasks-types";

type TaskDetailContentProps = {
  task: TaskDetail;
  statuses: string[];
  saving?: boolean;
  onStatusChange: (status: string) => void;
  onComplete: () => void;
};

export default function TaskDetailContent({
  task,
  statuses,
  saving = false,
  onStatusChange,
  onComplete
}: TaskDetailContentProps) {
  return (
    <div className="space-y-3">
      <Card>
        <CardHeader className="flex flex-row items-center justify-between p-4 pb-2">
          <div>
            <CardTitle className="text-sm">{task.title}</CardTitle>
            <p className="text-xs text-gray-500">Due: {formatTaskDateTime(task.dueDate)}</p>
          </div>
          <div className="flex items-center gap-2">
            <TaskTypeBadge type={task.type} />
            <TaskPriorityBadge priority={task.priority} />
          </div>
        </CardHeader>
        <CardContent className="space-y-3 p-4 pt-0">
          <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
            <Info label="Description" value={task.description || "-"} />
            <Info label="Status" value={<TaskStatusBadge status={task.status} />} />
            <Info label="Assigned To" value={task.assignedToName || "-"} />
            <Info label="Created By" value={task.createdByName || "-"} />
            <Info label="Lead" value={task.leadName || "-"} />
            <Info label="Project" value={task.projectName || "-"} />
            <Info label="Completed At" value={formatTaskDateTime(task.completedAt)} />
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <Select
              className="h-9 w-44 text-xs"
              value={task.status}
              onChange={(event) => onStatusChange(event.target.value)}
              disabled={saving}
            >
              {statuses.map((status) => (
                <option key={status} value={status}>
                  {status}
                </option>
              ))}
            </Select>

            {task.status !== "Completed" ? (
              <Button size="sm" onClick={onComplete} disabled={saving}>
                {saving ? "Saving..." : "Mark as Complete"}
              </Button>
            ) : null}

            {task.leadId ? (
              <Link to={`/leads/${task.leadId}`}>
                <Button variant="outline" size="sm">
                  View Linked Lead
                </Button>
              </Link>
            ) : null}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="p-4 pb-2">
          <CardTitle className="text-sm">Activity History</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2 p-4 pt-0">
          {task.activityHistory.map((entry, index) => (
            <div key={`${entry.type}-${index}`} className="rounded-sm border border-gray-200 p-2 text-xs">
              <p className="font-medium text-gray-800">{entry.type}</p>
              <p className="mt-1 text-gray-700">{entry.text}</p>
              <p className="text-gray-600">
                {formatTaskDateTime(entry.at)} by {entry.by || "System"}
              </p>
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  );
}

function Info({ label, value }: { label: string; value: ReactNode }) {
  return (
    <div className="rounded-sm border border-gray-200 p-2">
      <p className="text-[11px] text-gray-500">{label}</p>
      <div className="text-xs text-gray-800">{value}</div>
    </div>
  );
}

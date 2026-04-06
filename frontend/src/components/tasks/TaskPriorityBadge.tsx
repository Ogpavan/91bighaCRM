import { Badge } from "@/components/ui/badge";

const CLASS_BY_PRIORITY: Record<string, string> = {
  Low: "border-gray-300 bg-gray-100 text-gray-700 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-200",
  Medium: "border-blue-200 bg-blue-50 text-blue-700 dark:border-blue-500/30 dark:bg-blue-500/15 dark:text-blue-300",
  High: "border-orange-200 bg-orange-50 text-orange-700 dark:border-orange-500/30 dark:bg-orange-500/15 dark:text-orange-300",
  Urgent: "border-red-200 bg-red-50 text-red-700 dark:border-red-500/30 dark:bg-red-500/15 dark:text-red-300"
};

export default function TaskPriorityBadge({ priority }: { priority: string }) {
  return <Badge className={CLASS_BY_PRIORITY[priority] || ""}>{priority}</Badge>;
}

import { Badge } from "@/components/ui/badge";

const normalizeStatus = (status: string) => status.trim().toLowerCase();

export const getTaskStatusBadgeClassName = (status: string) => {
  switch (normalizeStatus(status)) {
    case "completed":
      return "border-green-200 bg-green-50 text-green-700";
    case "in progress":
      return "border-blue-200 bg-blue-50 text-blue-700";
    case "cancelled":
      return "border-red-200 bg-red-50 text-red-700";
    case "pending":
      return "border-amber-200 bg-amber-50 text-amber-700";
    default:
      return "border-gray-200 bg-gray-50 text-gray-700";
  }
};

export const getTaskStatusRowClassName = (status: string) => {
  switch (normalizeStatus(status)) {
    case "completed":
      return "bg-green-50/40";
    case "in progress":
      return "bg-blue-50/40";
    case "cancelled":
      return "bg-red-50/35";
    case "pending":
      return "bg-amber-50/40";
    default:
      return "";
  }
};

export default function TaskStatusBadge({ status }: { status: string }) {
  return (
    <Badge variant="secondary" className={getTaskStatusBadgeClassName(status)}>
      {status}
    </Badge>
  );
}

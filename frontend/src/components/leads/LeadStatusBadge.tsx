import { Badge } from "@/components/ui/badge";

const STATUS_COLOR_BY_SORT_ORDER: Record<number, "default" | "secondary" | "success" | "destructive"> = {
  1: "default",
  3: "secondary",
  6: "secondary",
  8: "success",
  9: "destructive"
};

export default function LeadStatusBadge({
  name,
  sortOrder
}: {
  name: string;
  sortOrder: number;
}) {
  const variant = STATUS_COLOR_BY_SORT_ORDER[sortOrder] || "secondary";
  const className = sortOrder === 3 ? "border-yellow-200 bg-yellow-50 text-yellow-700" : sortOrder === 6 ? "border-orange-200 bg-orange-50 text-orange-700" : "";

  return (
    <Badge variant={variant} className={className}>
      {name}
    </Badge>
  );
}

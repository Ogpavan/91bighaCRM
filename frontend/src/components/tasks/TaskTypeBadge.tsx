import { Badge } from "@/components/ui/badge";

const CLASS_BY_TYPE: Record<string, string> = {
  "Follow-up": "border-fuchsia-200 bg-fuchsia-50 text-fuchsia-700 dark:border-fuchsia-500/30 dark:bg-fuchsia-500/15 dark:text-fuchsia-300",
  "Site Visit": "border-green-200 bg-green-50 text-green-700 dark:border-green-500/30 dark:bg-green-500/15 dark:text-green-300",
  "Payment Reminder": "border-yellow-200 bg-yellow-50 text-yellow-700 dark:border-yellow-500/30 dark:bg-yellow-500/15 dark:text-yellow-300",
  "Document Collection": "border-cyan-200 bg-cyan-50 text-cyan-700 dark:border-cyan-500/30 dark:bg-cyan-500/15 dark:text-cyan-300",
  Internal: "border-gray-300 bg-gray-100 text-gray-700 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-200"
};

export default function TaskTypeBadge({ type }: { type: string }) {
  return <Badge className={CLASS_BY_TYPE[type] || ""}>{type}</Badge>;
}

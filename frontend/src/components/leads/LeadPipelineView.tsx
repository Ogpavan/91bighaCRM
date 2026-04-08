import type { Lead, LeadStatus } from "@/api/leads-types";
import LeadStatusBadge from "@/components/leads/LeadStatusBadge";

type LeadPipelineViewProps = {
  leads: Lead[];
  statuses: LeadStatus[];
};

export default function LeadPipelineView({ leads, statuses }: LeadPipelineViewProps) {
  const grouped = statuses.map((status) => ({
    status,
    leads: leads.filter((lead) => lead.statusId === status.Id)
  }));

  return (
    <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-5">
      {grouped.map((column) => (
        <div key={column.status.Id} className="rounded-sm border border-gray-200 bg-white p-2 shadow-sm">
          <div className="mb-2 flex items-center justify-between">
            <LeadStatusBadge name={column.status.Name} sortOrder={column.status.SortOrder} />
            <span className="text-xs text-gray-500">{column.leads.length}</span>
          </div>
          <div className="space-y-2">
            {column.leads.map((lead) => (
              <div key={lead.id} className="cursor-grab rounded-sm border border-gray-200 bg-gray-50 p-2 text-xs">
                <p className="font-medium text-gray-800">{lead.name}</p>
                <p className="text-gray-600">{lead.mobileNumber || "-"}</p>
                <p className="text-gray-500">{lead.telecallerName || "Unassigned"}</p>
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}

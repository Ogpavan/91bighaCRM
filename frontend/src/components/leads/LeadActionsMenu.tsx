import { useNavigate } from "react-router-dom";
import { CalendarPlus, Eye, MoreHorizontal, Pencil, RefreshCcw, Trash2 } from "lucide-react";
import { DropdownMenu, DropdownMenuItem } from "@/components/ui/dropdown-menu";
import { useAuth } from "@/components/AuthContext";

type LeadActionsMenuProps = {
  leadId: string;
  onAddFollowup: () => void;
  onScheduleVisit: () => void;
  onChangeStatus: () => void;
  onDelete: () => void;
};

export default function LeadActionsMenu({
  leadId,
  onAddFollowup,
  onScheduleVisit,
  onChangeStatus,
  onDelete
}: LeadActionsMenuProps) {
  const navigate = useNavigate();
  const { hasPermission } = useAuth();

  return (
    <DropdownMenu
      trigger={
        <span className="inline-flex h-7 w-7 items-center justify-center rounded-sm text-gray-700 hover:bg-gray-100">
          <MoreHorizontal className="h-4 w-4" />
        </span>
      }
    >
      <DropdownMenuItem onClick={() => navigate(`/leads/${leadId}`)}>
        <Eye className="mr-2 h-3.5 w-3.5" />
        View
      </DropdownMenuItem>
      {hasPermission("edit_leads") ? (
        <DropdownMenuItem onClick={() => navigate(`/leads/${leadId}/edit`)}>
          <Pencil className="mr-2 h-3.5 w-3.5" />
          Edit
        </DropdownMenuItem>
      ) : null}
      {hasPermission("edit_leads") ? (
        <DropdownMenuItem onClick={onAddFollowup}>
          <RefreshCcw className="mr-2 h-3.5 w-3.5" />
          Add Follow-up
        </DropdownMenuItem>
      ) : null}
      {hasPermission("edit_leads") ? (
        <DropdownMenuItem onClick={onScheduleVisit}>
          <CalendarPlus className="mr-2 h-3.5 w-3.5" />
          Schedule Visit
        </DropdownMenuItem>
      ) : null}
      {hasPermission("edit_leads") ? (
        <DropdownMenuItem onClick={onChangeStatus}>
          <RefreshCcw className="mr-2 h-3.5 w-3.5" />
          Change Status
        </DropdownMenuItem>
      ) : null}
      {hasPermission("delete_leads") ? (
        <DropdownMenuItem onClick={onDelete} danger>
          <Trash2 className="mr-2 h-3.5 w-3.5" />
          Delete Lead
        </DropdownMenuItem>
      ) : null}
    </DropdownMenu>
  );
}

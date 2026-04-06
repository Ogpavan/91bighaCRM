import { useEffect, useMemo, useState } from "react";
import { createPortal } from "react-dom";
import { useNavigate, useParams } from "react-router-dom";
import { ChevronLeft } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import LeadStatusBadge from "@/components/leads/LeadStatusBadge";
import {
  addLeadFollowup,
  addLeadVisit,
  getLeadActivities,
  getLeadById,
  getLeadFollowups,
  getLeadsMeta,
  getLeadVisits,
  updateLead
} from "@/lib/leads-service";
import type { Lead, LeadActivity, LeadFollowup, LeadsMetadata, LeadVisit } from "@/lib/leads-types";
import { useAuth } from "@/components/AuthContext";

const tabs = ["overview", "followups", "visits", "timeline"] as const;
type TabName = (typeof tabs)[number];

const formatDateTime = (value?: string | null) => {
  if (!value) {
    return "-";
  }

  return new Date(value).toLocaleString();
};

function DetailSkeleton() {
  return (
    <section className="space-y-3">
      <Card>
        <CardHeader className="flex flex-row items-center justify-between p-4 pb-2">
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <div className="h-8 w-8 animate-pulse rounded bg-gray-200" />
              <div className="h-5 w-32 animate-pulse rounded bg-gray-200" />
            </div>
            <div className="h-4 w-24 animate-pulse rounded bg-gray-200" />
          </div>
          <div className="flex items-center gap-2">
            <div className="h-6 w-20 animate-pulse rounded bg-gray-200" />
            <div className="h-8 w-44 animate-pulse rounded bg-gray-200" />
          </div>
        </CardHeader>
        <CardContent className="space-y-3 p-4 pt-0">
          <div className="flex items-center gap-2 border-b border-gray-200 pb-2">
            {Array.from({ length: 4 }).map((_, index) => (
              <div key={index} className="h-8 w-28 animate-pulse rounded bg-gray-200" />
            ))}
          </div>
          <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
            {Array.from({ length: 10 }).map((_, index) => (
              <div key={index} className="rounded-sm border border-gray-200 bg-white p-2">
                <div className="h-3 w-20 animate-pulse rounded bg-gray-200" />
                <div className="mt-2 h-4 w-32 animate-pulse rounded bg-gray-200" />
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </section>
  );
}

export default function LeadDetailPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { role } = useAuth();

  const [activeTab, setActiveTab] = useState<TabName>("overview");
  const [lead, setLead] = useState<Lead | null>(null);
  const [followups, setFollowups] = useState<LeadFollowup[]>([]);
  const [visits, setVisits] = useState<LeadVisit[]>([]);
  const [activities, setActivities] = useState<LeadActivity[]>([]);
  const [metadata, setMetadata] = useState<LeadsMetadata | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const [followupForm, setFollowupForm] = useState({
    type: "Call",
    notes: "",
    nextFollowUpDate: ""
  });

  const [visitModalOpen, setVisitModalOpen] = useState(false);
  const [visitForm, setVisitForm] = useState({
    visitDate: "",
    projectId: "",
    unitId: "",
    feedback: ""
  });

  const [changingStatus, setChangingStatus] = useState(false);
  const [addingFollowup, setAddingFollowup] = useState(false);
  const [savingVisit, setSavingVisit] = useState(false);

  const editLocked = useMemo(
    () => Boolean(lead && lead.statusName.toLowerCase() === "booking confirmed" && role?.toLowerCase() !== "admin"),
    [lead, role]
  );

  const loadData = async () => {
    if (!id) {
      return;
    }

    setLoading(true);
    setError("");

    try {
      const [leadResponse, followupsResponse, visitsResponse, activitiesResponse, metaResponse] = await Promise.all([
        getLeadById(id),
        getLeadFollowups(id),
        getLeadVisits(id),
        getLeadActivities(id),
        getLeadsMeta()
      ]);

      setLead(leadResponse);
      setFollowups(followupsResponse);
      setVisits(visitsResponse);
      setActivities(activitiesResponse);
      setMetadata(metaResponse);
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : "Failed to load lead");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void loadData();
  }, [id]);

  const onAddFollowup = async () => {
    if (!id) {
      return;
    }

    setAddingFollowup(true);
    try {
      await addLeadFollowup(id, {
        type: followupForm.type,
        notes: followupForm.notes,
        nextFollowUpDate: followupForm.nextFollowUpDate ? new Date(followupForm.nextFollowUpDate).toISOString() : undefined
      });

      setFollowupForm({ type: "Call", notes: "", nextFollowUpDate: "" });
      await loadData();
    } finally {
      setAddingFollowup(false);
    }
  };

  const onAddVisit = async () => {
    if (!id || !visitForm.visitDate) {
      return;
    }

    setSavingVisit(true);
    try {
      await addLeadVisit(id, {
        visitDate: new Date(visitForm.visitDate).toISOString(),
        projectId: visitForm.projectId || undefined,
        unitId: visitForm.unitId || undefined,
        feedback: visitForm.feedback || undefined
      });

      setVisitForm({ visitDate: "", projectId: "", unitId: "", feedback: "" });
      setVisitModalOpen(false);
      await loadData();
    } finally {
      setSavingVisit(false);
    }
  };

  const onChangeStatus = async (statusId: string) => {
    if (!id || !statusId) {
      return;
    }

    setChangingStatus(true);
    try {
      const updated = await updateLead(id, { statusId: Number(statusId) });
      setLead(updated);
      await loadData();
    } finally {
      setChangingStatus(false);
    }
  };

  if (loading) {
    return <DetailSkeleton />;
  }

  if (error || !lead) {
    return <p className="text-xs text-red-600">{error || "Lead not found"}</p>;
  }

  return (
    <section className="space-y-3">
      <Card>
        <CardHeader className="flex flex-row items-center justify-between p-4 pb-2">
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <Button type="button" variant="ghost" size="sm" className="h-8 w-8 p-0" onClick={() => navigate("/leads")}>
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <CardTitle className="text-sm">{lead.name}</CardTitle>
            </div>
            <p className="text-xs text-gray-500">{lead.mobileNumber || "-"}</p>
          </div>
          <div className="flex items-center gap-2">
            <LeadStatusBadge name={lead.statusName} sortOrder={lead.statusSortOrder} />
            <Select
              className="h-8 w-44 text-xs"
              disabled={editLocked || changingStatus}
              value={String(lead.statusId)}
              onChange={(event) => void onChangeStatus(event.target.value)}
            >
              {(metadata?.statuses || []).map((status) => (
                <option key={status.Id} value={status.Id}>
                  {status.Name}
                </option>
              ))}
            </Select>
          </div>
        </CardHeader>
        <CardContent className="space-y-3 p-4 pt-0">
          <div className="flex items-center gap-2 border-b border-gray-200 pb-2">
            {tabs.map((tab) => (
              <Button
                key={tab}
                variant={activeTab === tab ? "default" : "outline"}
                size="sm"
                onClick={() => setActiveTab(tab)}
                className="capitalize"
              >
                {tab === "timeline" ? "Activity Timeline" : tab}
              </Button>
            ))}
          </div>

          {activeTab === "overview" ? (
            <div className="grid grid-cols-1 gap-3 text-xs md:grid-cols-2">
              <Info label="SNo" value={String(lead.sno)} />
              <Info label="Name" value={lead.name} />
              <Info label="Date" value={formatDateTime(lead.date)} />
              <Info label="Mobile Number" value={lead.mobileNumber || "-"} />
              <Info label="WhatsApp Number" value={lead.whatsappNumber || "-"} />
              <Info label="Occupation" value={lead.occupation || "-"} />
              <Info label="Address" value={lead.address || "-"} />
              <Info label="Associate" value={lead.associate || "-"} />
              <Info label="Old Followup" value={lead.oldFollowup || "-"} />
              <Info label="Telecaller" value={lead.telecallerName || "-"} />
              <Info label="Project" value={lead.projectName || "-"} />
              <Info label="Recall" value={formatDateTime(lead.recall)} />
              <Info label="Remark" value={lead.remark || "-"} />
              <Info label="Source" value={lead.sourceName} />
              <Info label="Last Activity" value={formatDateTime(lead.lastActivityAt)} />
            </div>
          ) : null}

          {activeTab === "followups" ? (
            <div className="space-y-3">
              <div className="rounded-sm border border-gray-200 bg-gray-50 p-3">
                <p className="mb-2 text-xs font-medium text-gray-700">Add Follow-up</p>
                <div className="grid grid-cols-1 gap-2 md:grid-cols-4">
                  <Select
                    className="h-9 text-xs"
                    value={followupForm.type}
                    disabled={editLocked || addingFollowup}
                    onChange={(event) => setFollowupForm((prev) => ({ ...prev, type: event.target.value }))}
                  >
                    <option value="Call">Call</option>
                    <option value="Meeting">Meeting</option>
                    <option value="WhatsApp">WhatsApp</option>
                    <option value="Site Visit">Site Visit</option>
                  </Select>
                  <Input
                    type="datetime-local"
                    className="h-9 text-xs"
                    disabled={editLocked || addingFollowup}
                    value={followupForm.nextFollowUpDate}
                    onChange={(event) => setFollowupForm((prev) => ({ ...prev, nextFollowUpDate: event.target.value }))}
                  />
                  <Input
                    className="h-9 text-xs md:col-span-2"
                    placeholder="Notes"
                    disabled={editLocked || addingFollowup}
                    value={followupForm.notes}
                    onChange={(event) => setFollowupForm((prev) => ({ ...prev, notes: event.target.value }))}
                  />
                </div>
                <div className="mt-2 flex justify-end">
                  <Button size="sm" disabled={editLocked || addingFollowup} onClick={() => void onAddFollowup()}>
                    {addingFollowup ? "Adding..." : "Add Follow-up"}
                  </Button>
                </div>
              </div>

              <div className="space-y-2">
                {followups.map((followup) => (
                  <div
                    key={followup.id}
                    className={`rounded-sm border p-3 text-xs ${followup.isOverdue ? "border-red-200 bg-red-50" : "border-gray-200 bg-white"}`}
                  >
                    <div className="flex items-center justify-between">
                      <p className="font-medium text-gray-800">{followup.type}</p>
                      <p className={followup.isOverdue ? "text-red-600" : "text-gray-500"}>
                        Next: {formatDateTime(followup.nextFollowUpDate)}
                      </p>
                    </div>
                    <p className="mt-1 text-gray-700">{followup.notes || "-"}</p>
                    <p className="mt-1 text-gray-500">
                      By {followup.createdByName || "System"} at {formatDateTime(followup.createdAt)}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          ) : null}

          {activeTab === "visits" ? (
            <div className="space-y-3">
              <div className="flex justify-end">
                <Button size="sm" disabled={editLocked || savingVisit} onClick={() => setVisitModalOpen(true)}>
                  Add Visit
                </Button>
              </div>
              <div className="space-y-2">
                {visits.map((visit) => (
                  <div key={visit.id} className="rounded-sm border border-gray-200 bg-white p-3 text-xs">
                    <p className="font-medium text-gray-800">{formatDateTime(visit.visitDate)}</p>
                    <p className="text-gray-700">Project: {visit.projectName || "-"}</p>
                    <p className="text-gray-700">Feedback: {visit.feedback || "-"}</p>
                    <p className="text-gray-500">By {visit.createdByName || "System"}</p>
                  </div>
                ))}
              </div>
            </div>
          ) : null}

          {activeTab === "timeline" ? (
            <div className="space-y-2">
              {activities.map((activity) => (
                <div key={activity.id} className="rounded-sm border border-gray-200 bg-white p-3 text-xs">
                  <p className="font-medium text-gray-800">{activity.text}</p>
                  <p className="text-gray-600">Type: {activity.type}</p>
                  <p className="text-gray-500">
                    {formatDateTime(activity.createdAt)} by {activity.createdByName || "System"}
                  </p>
                </div>
              ))}
            </div>
          ) : null}
        </CardContent>
      </Card>

      {visitModalOpen
        ? createPortal(
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <Card className="w-full max-w-lg">
            <CardHeader className="p-4 pb-2">
              <CardTitle className="text-sm">Schedule Site Visit</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2 p-4 pt-0">
              <Input
                type="datetime-local"
                className="h-9 text-xs"
                disabled={savingVisit}
                value={visitForm.visitDate}
                onChange={(event) => setVisitForm((prev) => ({ ...prev, visitDate: event.target.value }))}
              />
              <Select
                className="h-9 text-xs"
                disabled={savingVisit}
                value={visitForm.projectId}
                onChange={(event) => setVisitForm((prev) => ({ ...prev, projectId: event.target.value }))}
              >
                <option value="">Select Project</option>
                {(metadata?.projects || []).map((project) => (
                  <option key={project.Id} value={project.Id}>
                    {project.Name}
                  </option>
                ))}
              </Select>
              <Input
                className="h-9 text-xs"
                placeholder="Unit Id (optional)"
                disabled={savingVisit}
                value={visitForm.unitId}
                onChange={(event) => setVisitForm((prev) => ({ ...prev, unitId: event.target.value }))}
              />
              <Input
                className="h-9 text-xs"
                placeholder="Feedback"
                disabled={savingVisit}
                value={visitForm.feedback}
                onChange={(event) => setVisitForm((prev) => ({ ...prev, feedback: event.target.value }))}
              />
              <div className="flex justify-end gap-2">
                <Button size="sm" variant="outline" disabled={savingVisit} onClick={() => setVisitModalOpen(false)}>
                  Cancel
                </Button>
                <Button size="sm" disabled={savingVisit} onClick={() => void onAddVisit()}>
                  {savingVisit ? "Saving..." : "Save Visit"}
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>,
        document.body
      ) : null}
    </section>
  );
}

function Info({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-sm border border-gray-200 bg-white p-2">
      <p className="text-[11px] text-gray-500">{label}</p>
      <p className="mt-1 text-sm text-gray-800">{value}</p>
    </div>
  );
}

import { useEffect, useState } from "react";
import { z } from "zod";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import DateTimePicker from "@/components/ui/date-time-picker";
import { useAuth } from "@/components/AuthContext";
import { getTaskMeta, createTask } from "@/api/tasks-service";
import { getUsers } from "@/api/users-service";
import { getLeads, getLeadsMeta } from "@/api/leads-service";
import type { TaskDetail } from "@/api/tasks-types";

const schema = z.object({
  title: z.string().min(2, "Title is required"),
  description: z.string().optional(),
  type: z.string().min(1, "Type is required"),
  priority: z.string().min(1, "Priority is required"),
  dueDate: z.string().optional(),
  assignedTo: z.string().min(1, "Assigned To is required"),
  leadId: z.string().optional(),
  projectId: z.string().optional()
});

type FormValues = z.output<typeof schema>;
type FormInputValues = z.input<typeof schema>;

type TaskFormProps = {
  onSuccess?: (task: TaskDetail) => void;
  onCancel?: () => void;
  title?: string;
  submitLabel?: string;
};

export default function TaskForm({ onSuccess, onCancel, title = "Create Task", submitLabel = "Create Task" }: TaskFormProps) {
  const { user, role } = useAuth();
  const normalizedRole = role?.trim().toLowerCase() ?? "";
  const isElevatedUser = normalizedRole === "admin" || normalizedRole === "salesmanager";
  const [types, setTypes] = useState<string[]>([]);
  const [priorities, setPriorities] = useState<string[]>([]);
  const [assignees, setAssignees] = useState<Array<{ id: string; fullName: string }>>([]);
  const [leads, setLeads] = useState<Array<{ id: string; name: string }>>([]);
  const [projects, setProjects] = useState<Array<{ Id: string; Name: string }>>([]);
  const [submitError, setSubmitError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    getValues,
    reset,
    formState: { errors }
  } = useForm<FormInputValues, unknown, FormValues>({
    resolver: zodResolver(schema)
  });

  useEffect(() => {
    const loadOptions = async () => {
      const [meta, users, leadsData, leadsMeta] = await Promise.all([
        getTaskMeta(),
        getUsers({ page: 1, limit: 100 }),
        getLeads({ page: 1, limit: 100 }),
        getLeadsMeta()
      ]);

      setTypes(meta.types);
      setPriorities(meta.priorities);
      setAssignees(users.items);
      setLeads(leadsData.items.map((lead) => ({ id: lead.id, name: lead.name })));
      setProjects(leadsMeta.projects);

      if (!getValues("type") && meta.types[0]) {
        setValue("type", meta.types[0]);
      }
      if (!getValues("priority") && meta.priorities[0]) {
        setValue("priority", meta.priorities[0]);
      }
      if (!getValues("assignedTo") && user?.id) {
        setValue("assignedTo", user.id);
      }
    };

    void loadOptions();
  }, [getValues, isElevatedUser, setValue, user?.id]);

  const dueDateValue = watch("dueDate") || "";

  const onSubmit = async (values: FormValues) => {
    setSubmitting(true);
    setSubmitError("");

    try {
      const task = await createTask({
        title: values.title,
        description: values.description,
        type: values.type,
        priority: values.priority,
        dueDate: values.dueDate ? new Date(values.dueDate).toISOString() : undefined,
        assignedTo: isElevatedUser ? values.assignedTo : user?.id || values.assignedTo,
        leadId: values.leadId || undefined,
        projectId: values.projectId || undefined
      });

      reset();
      onSuccess?.(task);
    } catch (error) {
      setSubmitError(error instanceof Error ? error.message : "Unable to create task");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Card className="w-full max-w-3xl max-h-[calc(100vh-4rem)]">
      <CardHeader className="p-4 pb-2">
        <CardTitle className="text-sm">{title}</CardTitle>
      </CardHeader>
      <CardContent className="p-4 pt-0 flex flex-col gap-3 overflow-y-auto">
        <form className="grid grid-cols-1 gap-3 md:grid-cols-2" onSubmit={handleSubmit(onSubmit)}>
          <div className="space-y-1 md:col-span-2">
            <label className="text-xs font-medium text-gray-700">Title</label>
            <Input className="h-9 text-xs" {...register("title")} />
            {errors.title ? <p className="text-[11px] text-red-600">{errors.title.message}</p> : null}
          </div>

          <div className="space-y-1 md:col-span-2">
            <label className="text-xs font-medium text-gray-700">Description</label>
            <textarea
              className="min-h-24 w-full rounded-sm border border-gray-300 px-3 py-2 text-xs outline-none transition focus:border-gray-400"
              {...register("description")}
            />
          </div>

          <div className="space-y-1">
            <label className="text-xs font-medium text-gray-700">Type</label>
            <Select className="h-9 text-xs" {...register("type")}>
              {types.map((type) => (
                <option key={type} value={type}>
                  {type}
                </option>
              ))}
            </Select>
          </div>

          <div className="space-y-1">
            <label className="text-xs font-medium text-gray-700">Priority</label>
            <Select className="h-9 text-xs" {...register("priority")}>
              {priorities.map((priority) => (
                <option key={priority} value={priority}>
                  {priority}
                </option>
              ))}
            </Select>
          </div>

          <div className="space-y-1">
            <label className="text-xs font-medium text-gray-700">Due Date</label>
            <DateTimePicker value={dueDateValue} onChange={(value) => setValue("dueDate", value)} />
            <input type="hidden" {...register("dueDate")} />
          </div>

          <div className="space-y-1">
            <label className="text-xs font-medium text-gray-700">Assign To</label>
            {isElevatedUser ? (
              <Select className="h-9 text-xs" {...register("assignedTo")}>
                {assignees.map((assignee) => (
                  <option key={assignee.id} value={assignee.id}>
                    {assignee.fullName}
                  </option>
                ))}
              </Select>
            ) : (
              <>
                <Input className="h-9 text-xs" value={user?.fullName || ""} readOnly />
                <input type="hidden" {...register("assignedTo")} />
              </>
            )}
            {!isElevatedUser ? <p className="text-[11px] text-gray-500">Regular users can create tasks only for themselves.</p> : null}
          </div>

          <div className="space-y-1">
            <label className="text-xs font-medium text-gray-700">Link Lead</label>
            <Select className="h-9 text-xs" {...register("leadId")}>
              <option value="">Not linked</option>
              {leads.map((lead) => (
                <option key={lead.id} value={lead.id}>
                  {lead.name}
                </option>
              ))}
            </Select>
          </div>

          <div className="space-y-1">
            <label className="text-xs font-medium text-gray-700">Link Project</label>
            <Select className="h-9 text-xs" {...register("projectId")}>
              <option value="">Not linked</option>
              {projects.map((project) => (
                <option key={project.Id} value={project.Id}>
                  {project.Name}
                </option>
              ))}
            </Select>
          </div>

          {submitError ? <p className="md:col-span-2 text-xs text-red-600">{submitError}</p> : null}

          <div className="md:col-span-2 flex justify-end gap-2">
            {onCancel ? (
              <Button type="button" variant="outline" size="sm" onClick={onCancel}>
                Cancel
              </Button>
            ) : null}
            <Button type="submit" size="sm" disabled={submitting}>
              {submitting ? "Creating..." : submitLabel}
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}

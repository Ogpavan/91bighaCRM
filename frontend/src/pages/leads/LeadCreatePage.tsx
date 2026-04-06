import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { ChevronLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { createLead, getLeadById, getLeadsMeta, updateLead } from "@/lib/leads-service";
import type { LeadsMetadata } from "@/lib/leads-types";

const TEN_DIGIT_PHONE = /^\d{10}$/;

const schema = z.object({
  name: z.string().min(2, "Name is required"),
  date: z.string().min(1, "Date is required"),
  mobileNumber: z.string().regex(TEN_DIGIT_PHONE, "Mobile number must be exactly 10 digits"),
  whatsappNumber: z
    .string()
    .optional()
    .refine((value) => !value || TEN_DIGIT_PHONE.test(value), "WhatsApp number must be exactly 10 digits"),
  occupation: z.string().optional(),
  address: z.string().optional(),
  associate: z.string().optional(),
  oldFollowup: z.string().optional(),
  telecallerId: z.string().optional(),
  projectId: z.string().optional(),
  recall: z.string().optional(),
  remark: z.string().optional(),
  sourceId: z.string().min(1, "Source is required")
});

type FormValues = z.output<typeof schema>;
type FormInputValues = z.input<typeof schema>;

function LeadFormSkeleton() {
  return (
    <Card>
      <CardHeader className="flex flex-row items-center gap-2 p-4 pb-2">
        <div className="h-8 w-8 animate-pulse rounded bg-gray-200" />
        <div className="h-5 w-28 animate-pulse rounded bg-gray-200" />
      </CardHeader>
      <CardContent className="p-4 pt-0">
        <div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-3">
          {Array.from({ length: 12 }).map((_, index) => (
            <div key={index} className={`space-y-2 ${index === 6 || index === 7 || index === 11 ? "md:col-span-2 xl:col-span-3" : ""}`}>
              <div className="h-3 w-24 animate-pulse rounded bg-gray-200" />
              <div className="h-9 w-full animate-pulse rounded bg-gray-200" />
            </div>
          ))}
          <div className="flex justify-end gap-2 md:col-span-2 xl:col-span-3">
            <div className="h-9 w-20 animate-pulse rounded bg-gray-200" />
            <div className="h-9 w-28 animate-pulse rounded bg-gray-200" />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

export default function LeadCreatePage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [meta, setMeta] = useState<LeadsMetadata | null>(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const isEditMode = Boolean(id);

  const {
    register,
    handleSubmit,
    setValue,
    reset,
    formState: { errors }
  } = useForm<FormInputValues, unknown, FormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      date: new Date().toISOString().slice(0, 10)
    }
  });

  useEffect(() => {
    const loadFormData = async () => {
      try {
        const [metadata, lead] = await Promise.all([
          getLeadsMeta(),
          id ? getLeadById(id) : Promise.resolve(null)
        ]);
        setMeta(metadata);
        if (lead) {
          reset({
            name: lead.name,
            date: lead.date ? lead.date.slice(0, 10) : new Date().toISOString().slice(0, 10),
            mobileNumber: lead.mobileNumber || "",
            whatsappNumber: lead.whatsappNumber || "",
            occupation: lead.occupation || "",
            address: lead.address || "",
            associate: lead.associate || "",
            oldFollowup: lead.oldFollowup || "",
            telecallerId: lead.telecallerId || "",
            projectId: lead.projectId || "",
            recall: lead.recall ? new Date(lead.recall).toISOString().slice(0, 16) : "",
            remark: lead.remark || "",
            sourceId: String(lead.sourceId)
          });
        } else if (metadata.sources[0]) {
          setValue("sourceId", String(metadata.sources[0].Id));
        }
      } catch (metaError) {
        setError(metaError instanceof Error ? metaError.message : "Failed to load form data");
      } finally {
        setLoading(false);
      }
    };

    void loadFormData();
  }, [id, reset, setValue]);

  const onSubmit = async (values: FormValues) => {
    setSubmitting(true);
    setError("");

    try {
      const payload = {
        name: values.name,
        date: values.date,
        mobileNumber: values.mobileNumber,
        whatsappNumber: values.whatsappNumber || undefined,
        occupation: values.occupation || undefined,
        address: values.address || undefined,
        associate: values.associate || undefined,
        oldFollowup: values.oldFollowup || undefined,
        telecallerId: values.telecallerId || undefined,
        projectId: values.projectId || undefined,
        recall: values.recall ? new Date(values.recall).toISOString() : undefined,
        remark: values.remark || undefined,
        sourceId: Number(values.sourceId)
      };
      const lead = isEditMode && id ? await updateLead(id, payload) : await createLead(payload);

      navigate(`/leads/${lead.id}`);
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : `Failed to ${isEditMode ? "update" : "create"} lead`);
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return <LeadFormSkeleton />;
  }

  return (
    <Card>
      <CardHeader className="flex flex-row items-center gap-2 p-4 pb-2">
        <Button type="button" variant="ghost" size="sm" className="h-8 w-8 p-0" onClick={() => navigate("/leads")}>
          <ChevronLeft className="h-4 w-4" />
        </Button>
        <CardTitle className="text-sm">{isEditMode ? "Edit Lead" : "Create Lead"}</CardTitle>
      </CardHeader>
      <CardContent className="p-4 pt-0">
        <form className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-3" onSubmit={handleSubmit(onSubmit)}>
          <div className="space-y-1">
            <label className="text-xs font-medium text-gray-700">Name</label>
            <Input className="h-9 text-xs" {...register("name")} />
            {errors.name ? <p className="text-[11px] text-red-600">{errors.name.message}</p> : null}
          </div>

          <div className="space-y-1">
            <label className="text-xs font-medium text-gray-700">Date</label>
            <Input className="h-9 text-xs" type="date" {...register("date")} />
            {errors.date ? <p className="text-[11px] text-red-600">{errors.date.message}</p> : null}
          </div>

          <div className="space-y-1">
            <label className="text-xs font-medium text-gray-700">Mobile Number</label>
            <Input className="h-9 text-xs" inputMode="numeric" maxLength={10} {...register("mobileNumber")} />
            {errors.mobileNumber ? <p className="text-[11px] text-red-600">{errors.mobileNumber.message}</p> : null}
          </div>

          <div className="space-y-1">
            <label className="text-xs font-medium text-gray-700">WhatsApp Number</label>
            <Input className="h-9 text-xs" inputMode="numeric" maxLength={10} {...register("whatsappNumber")} />
            {errors.whatsappNumber ? <p className="text-[11px] text-red-600">{errors.whatsappNumber.message}</p> : null}
          </div>

          <div className="space-y-1">
            <label className="text-xs font-medium text-gray-700">Occupation</label>
            <Input className="h-9 text-xs" {...register("occupation")} />
          </div>

          <div className="space-y-1">
            <label className="text-xs font-medium text-gray-700">Associate</label>
            <Input className="h-9 text-xs" {...register("associate")} />
          </div>

          <div className="space-y-1 md:col-span-2 xl:col-span-3">
            <label className="text-xs font-medium text-gray-700">Address</label>
            <Input className="h-9 text-xs" {...register("address")} />
          </div>

          <div className="space-y-1 md:col-span-2 xl:col-span-3">
            <label className="text-xs font-medium text-gray-700">Old Followup</label>
            <Input className="h-9 text-xs" {...register("oldFollowup")} />
          </div>

          <div className="space-y-1">
            <label className="text-xs font-medium text-gray-700">Telecaller</label>
            <Select className="h-9 text-xs" {...register("telecallerId")}>
              <option value="">Not assigned</option>
              {(meta?.telecallers || []).map((telecaller) => (
                <option key={telecaller.Id} value={telecaller.Id}>
                  {telecaller.Name}
                </option>
              ))}
            </Select>
          </div>

          <div className="space-y-1">
            <label className="text-xs font-medium text-gray-700">Project</label>
            <Select className="h-9 text-xs" {...register("projectId")}>
              <option value="">Not selected</option>
              {(meta?.projects || []).map((project) => (
                <option key={project.Id} value={project.Id}>
                  {project.Name}
                </option>
              ))}
            </Select>
          </div>

          <div className="space-y-1">
            <label className="text-xs font-medium text-gray-700">Recall</label>
            <Input className="h-9 text-xs" type="datetime-local" {...register("recall")} />
          </div>

          <div className="space-y-1">
            <label className="text-xs font-medium text-gray-700">Source</label>
            <Select className="h-9 text-xs" {...register("sourceId")}>
              {(meta?.sources || []).map((source) => (
                <option key={source.Id} value={source.Id}>
                  {source.Name}
                </option>
              ))}
            </Select>
            {errors.sourceId ? <p className="text-[11px] text-red-600">{errors.sourceId.message}</p> : null}
          </div>

          <div className="space-y-1 md:col-span-2 xl:col-span-3">
            <label className="text-xs font-medium text-gray-700">Remark</label>
            <Input className="h-9 text-xs" {...register("remark")} />
          </div>

          {error ? <p className="text-xs text-red-600 md:col-span-2 xl:col-span-3">{error}</p> : null}

          <div className="flex justify-end gap-2 md:col-span-2 xl:col-span-3">
            <Button type="button" variant="outline" size="sm" onClick={() => navigate("/leads")}>
              Cancel
            </Button>
            <Button type="submit" size="sm" disabled={submitting || loading}>
              {submitting ? "Saving..." : isEditMode ? "Update Lead" : "Create Lead"}
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}

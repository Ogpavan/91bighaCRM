import { useEffect, useState, type FormEvent } from "react";
import { createPortal } from "react-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow
} from "@/components/ui/table";
import { createProjectEntity, getProjectsEntity, type ProjectEntity } from "@/lib/projects-entity-service";

type FormState = {
  name: string;
  location: string;
  status: string;
  description: string;
};

const INITIAL_FORM: FormState = {
  name: "",
  location: "",
  status: "active",
  description: ""
};

export default function ProjectsEntityPage() {
  const [items, setItems] = useState<ProjectEntity[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [popupOpen, setPopupOpen] = useState(false);
  const [form, setForm] = useState<FormState>(INITIAL_FORM);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const loadProjects = async () => {
    setLoading(true);
    setError("");
    try {
      setItems(await getProjectsEntity());
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : "Failed to load projects.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void loadProjects();
  }, []);

  const setText = (key: keyof FormState, value: string) => {
    setForm((prev) => ({ ...prev, [key]: value }));
  };

  const onSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setSubmitting(true);
    setError("");
    setSuccess("");

    try {
      const created = await createProjectEntity({
        name: form.name,
        location: form.location || undefined,
        status: form.status,
        description: form.description || undefined
      });
      setSuccess(`Project ${created.projectCode} created successfully.`);
      setForm(INITIAL_FORM);
      setPopupOpen(false);
      await loadProjects();
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : "Failed to create project.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <section className="space-y-4">
      <Card>
        <CardHeader className="p-4 pb-2">
          <div className="flex items-center justify-between gap-3">
            <CardTitle className="text-sm">Projects</CardTitle>
            <Button size="sm" onClick={() => { setPopupOpen(true); setError(""); }}>
              Create Project
            </Button>
          </div>
        </CardHeader>
        <CardContent className="p-4 pt-0">
          {success ? <p className="mb-3 text-xs text-green-600">{success}</p> : null}
          {error && !popupOpen ? <p className="mb-3 text-xs text-red-600">{error}</p> : null}
          {loading ? (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Code</TableHead>
                    <TableHead>Name</TableHead>
                    <TableHead>Location</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Description</TableHead>
                    <TableHead>Properties</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {Array.from({ length: 6 }).map((_, index) => (
                    <TableRow key={`project-skeleton-${index}`}>
                      <TableCell><div className="h-4 w-24 animate-pulse rounded bg-gray-200" /></TableCell>
                      <TableCell><div className="h-4 w-32 animate-pulse rounded bg-gray-200" /></TableCell>
                      <TableCell><div className="h-4 w-28 animate-pulse rounded bg-gray-200" /></TableCell>
                      <TableCell><div className="h-4 w-20 animate-pulse rounded bg-gray-200" /></TableCell>
                      <TableCell><div className="h-4 w-48 animate-pulse rounded bg-gray-200" /></TableCell>
                      <TableCell><div className="h-4 w-12 animate-pulse rounded bg-gray-200" /></TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          ) : null}
          {!loading ? (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Code</TableHead>
                  <TableHead>Name</TableHead>
                  <TableHead>Location</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Description</TableHead>
                  <TableHead>Properties</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {items.map((item) => (
                  <TableRow key={item.id}>
                    <TableCell>{item.projectCode}</TableCell>
                    <TableCell>{item.name}</TableCell>
                    <TableCell>{item.location || "-"}</TableCell>
                    <TableCell className="capitalize">{item.status}</TableCell>
                    <TableCell className="max-w-72 whitespace-normal">{item.description || "-"}</TableCell>
                    <TableCell>{item.propertiesCount}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          ) : null}
        </CardContent>
      </Card>

      {popupOpen
        ? createPortal(
        <>
          <div className="fixed inset-0 z-40 bg-slate-950/30" onClick={() => !submitting && setPopupOpen(false)} />
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <Card className="w-full max-w-xl">
              <CardHeader className="p-4 pb-2">
                <div className="flex items-center justify-between gap-3">
                  <CardTitle className="text-sm">Create Project</CardTitle>
                  <Button size="sm" variant="outline" disabled={submitting} onClick={() => setPopupOpen(false)}>
                    Close
                  </Button>
                </div>
              </CardHeader>
              <CardContent className="p-4 pt-0">
                <form className="grid grid-cols-1 gap-3 md:grid-cols-2" onSubmit={onSubmit}>
                  <div className="space-y-1">
                    <label className="text-xs font-medium text-gray-700">Project Name</label>
                    <Input className="h-9 text-xs" value={form.name} onChange={(event) => setText("name", event.target.value)} required />
                  </div>
                  <div className="space-y-1">
                    <label className="text-xs font-medium text-gray-700">Location</label>
                    <Input className="h-9 text-xs" value={form.location} onChange={(event) => setText("location", event.target.value)} />
                  </div>
                  <div className="space-y-1">
                    <label className="text-xs font-medium text-gray-700">Status</label>
                    <Select className="h-9 text-xs" value={form.status} onChange={(event) => setText("status", event.target.value)}>
                      <option value="active">Active</option>
                      <option value="planning">Planning</option>
                      <option value="on-hold">On Hold</option>
                      <option value="completed">Completed</option>
                      <option value="inactive">Inactive</option>
                    </Select>
                  </div>
                  <div className="space-y-1 md:col-span-2">
                    <label className="text-xs font-medium text-gray-700">Description</label>
                    <textarea
                      className="min-h-24 w-full rounded-sm border border-gray-200 bg-white px-3 py-2 text-xs text-gray-800 outline-none focus:border-blue-600"
                      value={form.description}
                      onChange={(event) => setText("description", event.target.value)}
                    />
                  </div>
                  {error ? <p className="text-xs text-red-600 md:col-span-2">{error}</p> : null}
                  <div className="flex justify-end gap-2 md:col-span-2">
                    <Button type="button" variant="outline" size="sm" disabled={submitting} onClick={() => setPopupOpen(false)}>
                      Cancel
                    </Button>
                    <Button type="submit" size="sm" disabled={submitting}>
                      {submitting ? "Saving..." : "Save Project"}
                    </Button>
                  </div>
                </form>
              </CardContent>
            </Card>
          </div>
        </>,
        document.body
      ) : null}
    </section>
  );
}

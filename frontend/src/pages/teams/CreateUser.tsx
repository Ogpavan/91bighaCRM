import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { createUser } from "@/lib/users-service";
import { getRoles, type RoleItem } from "@/lib/roles-service";
import { getTeams, type TeamItem } from "@/lib/teams-service";

const schema = z.object({
  fullName: z.string().min(2, "Full name is required"),
  email: z.string().email("Enter a valid email"),
  phone: z.string().min(7, "Phone is required"),
  password: z.string().min(8, "Password must be at least 8 characters"),
  roleName: z.string().min(1, "Role is required"),
  teamId: z.string().optional()
});

type FormValues = z.output<typeof schema>;
type FormInputValues = z.input<typeof schema>;

export default function CreateUser() {
  const navigate = useNavigate();
  const [roles, setRoles] = useState<RoleItem[]>([]);
  const [teams, setTeams] = useState<TeamItem[]>([]);
  const [loadingOptions, setLoadingOptions] = useState(true);
  const [submitError, setSubmitError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const {
    register,
    handleSubmit,
    setValue,
    formState: { errors }
  } = useForm<FormInputValues, unknown, FormValues>({
    resolver: zodResolver(schema)
  });

  useEffect(() => {
    const loadOptions = async () => {
      setLoadingOptions(true);
      try {
        const [roleItems, teamItems] = await Promise.all([getRoles(), getTeams()]);
        setRoles(roleItems);
        setTeams(teamItems);
        if (roleItems.length) {
          setValue("roleName", roleItems[0].name);
        }
      } finally {
        setLoadingOptions(false);
      }
    };

    void loadOptions();
  }, [setValue]);

  const onSubmit = async (values: FormValues) => {
    setSubmitError("");
    setIsSubmitting(true);
    try {
      await createUser({
        fullName: values.fullName,
        email: values.email,
        phone: values.phone,
        password: values.password,
        roleName: values.roleName,
        teamId: values.teamId || undefined,
        assignedProjects: [],
        isActive: true
      });

      navigate("/users", { replace: true });
    } catch (error) {
      setSubmitError(error instanceof Error ? error.message : "Unable to create user");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Card className="rounded-sm">
      <CardHeader className="p-6 pb-3">
        <CardTitle className="text-sm text-gray-800">Add Team Member</CardTitle>
      </CardHeader>
      <CardContent className="p-6 pt-0">
        {loadingOptions ? <p className="text-xs text-gray-500">Loading form options...</p> : null}
        <form className="grid grid-cols-1 gap-4 md:grid-cols-2" onSubmit={handleSubmit(onSubmit)}>
          <div className="space-y-1">
            <label className="text-xs font-medium text-gray-700">Full Name</label>
            <Input className="h-9 text-xs" {...register("fullName")} />
            {errors.fullName ? <p className="text-[11px] text-red-600">{errors.fullName.message}</p> : null}
          </div>

          <div className="space-y-1">
            <label className="text-xs font-medium text-gray-700">Email</label>
            <Input className="h-9 text-xs" type="email" {...register("email")} />
            {errors.email ? <p className="text-[11px] text-red-600">{errors.email.message}</p> : null}
          </div>

          <div className="space-y-1">
            <label className="text-xs font-medium text-gray-700">Phone</label>
            <Input className="h-9 text-xs" {...register("phone")} />
            {errors.phone ? <p className="text-[11px] text-red-600">{errors.phone.message}</p> : null}
          </div>

          <div className="space-y-1">
            <label className="text-xs font-medium text-gray-700">Password</label>
            <Input className="h-9 text-xs" type="password" {...register("password")} />
            {errors.password ? <p className="text-[11px] text-red-600">{errors.password.message}</p> : null}
          </div>

          <div className="space-y-1">
            <label className="text-xs font-medium text-gray-700">Role</label>
            <Select className="h-9 text-xs" {...register("roleName")}>
              {roles.map((role) => (
                <option key={role.id} value={role.name}>
                  {role.name}
                </option>
              ))}
            </Select>
            {errors.roleName ? <p className="text-[11px] text-red-600">{errors.roleName.message}</p> : null}
          </div>

          <div className="space-y-1">
            <label className="text-xs font-medium text-gray-700">Team</label>
            <Select className="h-9 text-xs" {...register("teamId")}>
              <option value="">Unassigned</option>
              {teams.map((team) => (
                <option key={team.id} value={team.id}>
                  {team.name}
                </option>
              ))}
            </Select>
          </div>

          {submitError ? <p className="md:col-span-2 text-xs text-red-600">{submitError}</p> : null}

          <div className="md:col-span-2 flex justify-end gap-2">
            <Button type="button" variant="outline" className="h-9 text-xs" onClick={() => navigate("/users")}>
              Cancel
            </Button>
            <Button type="submit" className="h-9 text-xs" disabled={isSubmitting || loadingOptions}>
              {isSubmitting ? "Creating..." : "Create Member"}
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}

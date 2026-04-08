import { FormEvent, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Eye, EyeOff } from "lucide-react";
import { useAppSettings } from "@/components/AppSettingsContext";
import AuthShell from "@/components/AuthShell";
import { useAuth } from "@/components/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { type AuthUser } from "@/lib/auth";
import { apiRequest } from "@/api/api";

type RegisterApiResponse = {
  success: boolean;
  user: AuthUser;
  token: string;
  message?: string;
};

export default function SignUp() {
  const navigate = useNavigate();
  const { setSession } = useAuth();
  const { settings, loading: settingsLoading } = useAppSettings();
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError("");

    if (!settings.allow_user_signup) {
      setError("User signup is currently disabled.");
      return;
    }

    if (!firstName.trim() || !lastName.trim() || !email.trim() || !password.trim()) {
      setError("First name, last name, email, and password are required.");
      return;
    }

    setIsSubmitting(true);

    try {
      const data = await apiRequest<RegisterApiResponse>("/api/v1/auth/register", {
        method: "POST",
        body: {
          fullName: `${firstName.trim()} ${lastName.trim()}`,
          email: email.trim(),
          password,
        },
      });

      if (!data.token || !data.user) {
        setError(data.message || "Sign up failed. Please try again.");
        return;
      }

      setSession(data.token, data.user);
      navigate("/", { replace: true });
    } catch (error) {
      setError(error instanceof Error ? error.message : "Unable to connect to the server. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <AuthShell
      title={settings.allow_user_signup ? "Create account" : "Signup disabled"}
      subtitle={
        settings.allow_user_signup
          ? "Set up your workspace access in under a minute."
          : "This workspace is not accepting new self-service registrations right now."
      }
      footer={
        <p className="text-center">
          Already have an account?{" "}
          <Link to="/signin" className="font-medium text-blue-600 hover:text-blue-700">
            Sign in
          </Link>
        </p>
      }
      legal={
        <>
          By signing in, you agree to our{" "}
          <Link to="/privacy-policy" className="text-blue-600 underline hover:text-blue-700">
            Privacy Policy
          </Link>{" "}
          and{" "}
          <Link to="/terms-and-conditions" className="text-blue-600 underline hover:text-blue-700">
            Terms &amp; Conditions
          </Link>
          .
        </>
      }
    >
      {!settingsLoading && !settings.allow_user_signup ? (
        <div className="space-y-3">
          <p className="text-xs text-gray-600">
            Contact {settings.support_email || "your administrator"} if you need access.
          </p>
          <Button type="button" className="h-9 w-full text-xs" onClick={() => navigate("/signin")}>
            Go to Sign In
          </Button>
        </div>
      ) : null}

      {settings.allow_user_signup ? (
        <form className="space-y-3" onSubmit={handleSubmit}>
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="space-y-1.5">
              <label htmlFor="firstName" className="text-xs font-medium text-gray-700">
                First name
              </label>
              <Input
                id="firstName"
                type="text"
                placeholder="John"
                className="h-9 text-xs"
                value={firstName}
                onChange={(event) => setFirstName(event.target.value)}
              />
            </div>
            <div className="space-y-1.5">
              <label htmlFor="lastName" className="text-xs font-medium text-gray-700">
                Last name
              </label>
              <Input
                id="lastName"
                type="text"
                placeholder="Doe"
                className="h-9 text-xs"
                value={lastName}
                onChange={(event) => setLastName(event.target.value)}
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <label htmlFor="email" className="text-xs font-medium text-gray-700">
              Work email
            </label>
            <Input
              id="email"
              type="email"
              placeholder="name@company.com"
              className="h-9 text-xs"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
            />
          </div>

          <div className="space-y-1.5">
            <label htmlFor="password" className="text-xs font-medium text-gray-700">
              Password
            </label>
            <div className="relative">
              <Input
                id="password"
                type={showPassword ? "text" : "password"}
                placeholder="Create password"
                className="h-9 pr-9 text-xs"
                value={password}
                onChange={(event) => setPassword(event.target.value)}
              />
              <button
                type="button"
                onClick={() => setShowPassword((prev) => !prev)}
                className="absolute inset-y-0 right-0 flex w-9 items-center justify-center text-gray-500 hover:text-gray-700"
                aria-label={showPassword ? "Hide password" : "Show password"}
              >
                {showPassword ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
              </button>
            </div>
          </div>

          <label className="flex items-start gap-2 text-[11px] leading-relaxed text-gray-600">
            <input type="checkbox" className="mt-0.5 h-3.5 w-3.5 rounded-sm border-gray-300 text-blue-600 focus:ring-blue-600" />
            I agree to the Terms of Service and Privacy Policy.
          </label>

          {error && <p className="text-xs text-red-600">{error}</p>}

          <Button type="submit" className="h-9 w-full text-xs" disabled={isSubmitting}>
            {isSubmitting ? "Creating account..." : "Create account"}
          </Button>
        </form>
      ) : null}
    </AuthShell>
  );
}

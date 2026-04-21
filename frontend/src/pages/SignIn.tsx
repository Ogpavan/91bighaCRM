import { FormEvent, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Eye, EyeOff } from "lucide-react";
import AuthShell from "@/components/AuthShell";
import { useAuth } from "@/components/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { login } from "@/api/auth-service";

export default function SignIn() {
  const navigate = useNavigate();
  const { setSession } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const performLogin = async (nextEmail: string, nextPassword: string) => {
    const data = await login({ email: nextEmail.trim(), password: nextPassword });
    setSession(data.token, data.user);
    navigate("/", { replace: true });
  };

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError("");

    if (!email.trim() || !password.trim()) {
      setError("Email and password are required.");
      return;
    }

    setIsSubmitting(true);

    try {
      await performLogin(email, password);
    } catch (error) {
      setError(error instanceof Error ? error.message : "Unable to connect to the server. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <AuthShell
      title="Sign in"
      subtitle="Welcome back. Enter your credentials to continue."
      // footer={
      //   <p className="text-center">
      //     Don&apos;t have an account?{" "}
      //     <Link to="/signup" className="font-medium text-blue-600 hover:text-blue-700">
      //       Create one
      //     </Link>
      //   </p>
      // }
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
      <form className="space-y-3" onSubmit={handleSubmit}>
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
          <div className="flex items-center justify-between">
            <label htmlFor="password" className="text-xs font-medium text-gray-700">
              Password
            </label>
            <Link to="/forgot-password" className="text-[11px] font-medium text-blue-600 hover:text-blue-700">
              Forgot?
            </Link>
          </div>
          <div className="relative">
            <Input
              id="password"
              type={showPassword ? "text" : "password"}
              placeholder="Enter password"
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

        <label className="flex items-center gap-2 text-[11px] text-gray-600">
          <input type="checkbox" className="h-3.5 w-3.5 rounded-sm border-gray-300 text-blue-600 focus:ring-blue-600" />
          Keep me signed in
        </label>

        {error && <p className="text-xs text-red-600">{error}</p>}

        <Button type="submit" className="h-9 w-full text-xs" disabled={isSubmitting}>
          {isSubmitting ? "Signing in..." : "Sign in"}
        </Button>
      </form>

    </AuthShell>
  );
}

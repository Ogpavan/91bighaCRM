"use client";

import { useId, useMemo, useState } from "react";

function isValidEmail(value: string) {
  const email = value.trim();
  if (!email) return false;
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

export function HomeNewsletterForm() {
  const inputId = useId().replace(/:/g, "");
  const [email, setEmail] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [isSubscribed, setIsSubscribed] = useState(false);
  const [hasTriedSubmit, setHasTriedSubmit] = useState(false);

  const emailIsValid = useMemo(() => isValidEmail(email), [email]);
  const showInvalid = hasTriedSubmit && !emailIsValid;

  const handleSubscribe = async () => {
    setHasTriedSubmit(true);

    if (!emailIsValid || isLoading || isSubscribed) {
      return;
    }

    setIsLoading(true);
    await new Promise((resolve) => setTimeout(resolve, 1000));
    setIsLoading(false);
    setIsSubscribed(true);
  };

  return (
    <div className="d-flex align-items-center justify-content-between gap-2">
      <div className="position-relative support-custom-icons flex-grow-1">
        <div className="input-group input-group-flat">
          <input
            id={inputId}
            type="email"
            inputMode="email"
            autoComplete="email"
            className={`form-control bg-white w-100${showInvalid ? " is-invalid" : ""}${isSubscribed ? " is-valid" : ""}`}
            placeholder="Enter Email Address"
            value={email}
            onChange={(event) => {
              setEmail(event.target.value);
              setIsSubscribed(false);
              if (hasTriedSubmit) {
                setHasTriedSubmit(false);
              }
            }}
            disabled={isLoading}
            aria-invalid={showInvalid ? "true" : "false"}
          />
        </div>
        <i className="material-icons-outlined text-dark z-2" aria-hidden="true">email</i>
        {showInvalid ? (
          <div className="invalid-feedback d-block mt-1">Enter a valid email address.</div>
        ) : null}
      </div>

      <button
        type="button"
        className="btn btn-lg btn-primary d-inline-flex align-items-center gap-2"
        onClick={handleSubscribe}
        disabled={isLoading || isSubscribed}
        aria-busy={isLoading ? "true" : "false"}
      >
        {isLoading ? (
          <>
            <span className="spinner-border spinner-border-sm" aria-hidden="true" />
            <span>Subscribing...</span>
          </>
        ) : isSubscribed ? (
          <span>Subscribed</span>
        ) : (
          <span>Subscribe</span>
        )}
      </button>
    </div>
  );
}

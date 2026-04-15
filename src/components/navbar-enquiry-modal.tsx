"use client";

import { FormEvent, useState } from "react";

type FormState = {
  fullName: string;
  phone: string;
  message: string;
};

function getInitialState(): FormState {
  return { fullName: "", phone: "", message: "" };
}

export function NavbarEnquiryModal() {
  const resolvedModalId = "navbar-enquiry-modal";
  const titleId = "navbar-enquiry-modal-title";
  const [form, setForm] = useState<FormState>(() => getInitialState());
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [submitSuccess, setSubmitSuccess] = useState<string | null>(null);

  function updateField<K extends keyof FormState>(key: K, value: FormState[K]) {
    setForm((current) => ({ ...current, [key]: value }));
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (isSubmitting) return;

    setSubmitError(null);
    setSubmitSuccess(null);

    const normalizedPhone = form.phone.replace(/\D/g, "");
    const indianPhone = normalizedPhone.length === 10 ? normalizedPhone : normalizedPhone.slice(-10);
    const isValidIndianPhone = /^[6-9]\d{9}$/.test(indianPhone);

    if (!form.fullName.trim() || form.fullName.trim().length < 2) {
      setSubmitError("Enter your full name.");
      return;
    }

    if (!isValidIndianPhone) {
      setSubmitError("Enter a valid Indian mobile number.");
      return;
    }

    setIsSubmitting(true);
    try {
      const response = await fetch("/api/v1/public/enquiries", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          fullName: form.fullName,
          phone: indianPhone,
          message: form.message,
          requirement: "General Enquiry"
        })
      });

      if (!response.ok) {
        const body = (await response.json().catch(() => null)) as { message?: string } | null;
        throw new Error(body?.message || "Failed to save enquiry.");
      }

      setSubmitSuccess("Thanks! We will get back to you soon.");
      setForm(getInitialState());
    } catch (error) {
      setSubmitError(error instanceof Error ? error.message : "Failed to submit enquiry.");
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <>
      <div
        className="modal fade"
        id={resolvedModalId}
        tabIndex={-1}
        aria-hidden="true"
        aria-labelledby={titleId}
      >
        <div className="modal-dialog modal-lg modal-dialog-centered modal-dialog-scrollable">
          <div className="modal-content">
            <div className="modal-header">
              <h5 className="modal-title" id={titleId}>Send an Enquiry</h5>
              <button type="button" className="btn-close" data-bs-dismiss="modal" aria-label="Close"></button>
            </div>
            <div className="modal-body">
              <form onSubmit={handleSubmit}>
                <div className="row g-3">
                  <div className="col-12 col-md-6">
                    <label className="form-label">Full Name</label>
                    <input
                      type="text"
                      className="form-control"
                      placeholder="Enter your full name"
                      value={form.fullName}
                      onChange={(event) => updateField("fullName", event.target.value)}
                      required
                    />
                  </div>
                  <div className="col-12 col-md-6">
                    <label className="form-label">Phone Number</label>
                    <input
                      type="tel"
                      className="form-control"
                      placeholder="Enter 10-digit Indian mobile number"
                      value={form.phone}
                      onChange={(event) => updateField("phone", event.target.value)}
                      required
                    />
                  </div>
                  <div className="col-12">
                    <label className="form-label">Message</label>
                    <textarea
                      className="form-control"
                      rows={5}
                      placeholder="Tell us what kind of property or support you need"
                      value={form.message}
                      onChange={(event) => updateField("message", event.target.value)}
                    />
                  </div>

                  {submitSuccess ? (
                    <div className="col-12">
                      <div className="alert alert-success mb-0">{submitSuccess}</div>
                    </div>
                  ) : null}
                  {submitError ? (
                    <div className="col-12">
                      <div className="alert alert-danger mb-0">{submitError}</div>
                    </div>
                  ) : null}
                </div>

                <div className="d-flex justify-content-end gap-2 mt-4">
                  <button type="button" className="btn btn-light border" data-bs-dismiss="modal" disabled={isSubmitting}>
                    Close
                  </button>
                  <button type="submit" className="btn btn-dark" disabled={isSubmitting}>
                    {isSubmitting ? "Submitting..." : "Submit Enquiry"}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}

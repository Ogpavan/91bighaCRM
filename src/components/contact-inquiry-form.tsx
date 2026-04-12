"use client";

import { FormEvent, useState } from "react";

type ContactInquiryFormProps = {
  propertyTitle?: string;
  propertyCode?: string;
  defaultRequirement?: string;
  submitLabel?: string;
  compact?: boolean;
};

type FormState = {
  fullName: string;
  phone: string;
  message: string;
};

function getInitialState(): FormState {
  return {
    fullName: "",
    phone: "",
    message: ""
  };
}

export function ContactInquiryForm({
  propertyTitle,
  propertyCode,
  defaultRequirement,
  submitLabel = "Send on WhatsApp",
  compact = false
}: ContactInquiryFormProps) {
  const [form, setForm] = useState<FormState>(() => getInitialState());

  function updateField<K extends keyof FormState>(key: K, value: FormState[K]) {
    setForm((current) => ({ ...current, [key]: value }));
  }

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const normalizedPhone = form.phone.replace(/\D/g, "");
    const indianPhone = normalizedPhone.length === 10 ? normalizedPhone : normalizedPhone.slice(-10);
    const isValidIndianPhone = /^[6-9]\d{9}$/.test(indianPhone);

    if (!isValidIndianPhone) {
      return;
    }

    const details = [
      "New enquiry from 91bigha.com",
      propertyTitle ? `Property: ${propertyTitle}` : null,
      propertyCode ? `Property Code: ${propertyCode}` : null,
      `Name: ${form.fullName}`,
      `Phone: +91 ${indianPhone}`,
      `Requirement: ${defaultRequirement || "General Enquiry"}`,
      `Message: ${form.message || "Not provided"}`
    ]
      .filter(Boolean)
      .join("\n");

    const whatsappUrl = `https://wa.me/917302166711?text=${encodeURIComponent(details)}`;
    window.open(whatsappUrl, "_blank", "noopener,noreferrer");
  }

  return (
    <form
      onSubmit={handleSubmit}
      className={`contact-enquiry-form ${compact ? "contact-enquiry-form-compact" : ""}`.trim()}
    >
      <div className="row g-3">
        <div className="col-12">
          <label className="form-label">Full Name</label>
          <input
            type="text"
            className="form-control"
            placeholder="Enter your full name"
            value={form.fullName}
            onChange={(event) => updateField("fullName", event.target.value)}
            pattern="[A-Za-z ]{2,}"
            title="Enter at least 2 letters using A-Z and spaces only"
            required
          />
        </div>
        <div className="col-12">
          <label className="form-label">Phone Number</label>
          <input
            type="tel"
            className="form-control"
            placeholder="Enter 10-digit Indian mobile number"
            value={form.phone}
            onChange={(event) => updateField("phone", event.target.value)}
            pattern="^(\\+91[-\\s]?)?[6-9]\\d{9}$"
            title="Enter a valid Indian mobile number (starts with 6-9)"
            required
          />
        </div>
        <div className="col-12">
          <label className="form-label">Message</label>
          <textarea
            className="form-control"
            rows={6}
            placeholder={
              propertyTitle
                ? "Share your expected budget, move-in timeline, or preferred visit date"
                : "Tell us what kind of property or support you need"
            }
            value={form.message}
            onChange={(event) => updateField("message", event.target.value)}
          />
        </div>
        <div className="col-12 enquiry-form-actions d-flex gap-3 pt-2">
          <button type="submit" className="btn btn-primary btn-lg px-4">
            {submitLabel}
          </button>
          <a href="tel:+917302166711" className="btn btn-dark btn-lg px-4">
            Call Now
          </a>
        </div>
      </div>
    </form>
  );
}

"use client";

import { useState } from "react";

type Status = { kind: "idle" | "ok" | "err"; message: string };

export default function ContactForm() {
  const [status, setStatus] = useState<Status>({ kind: "idle", message: "" });
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSubmitting(true);
    setStatus({ kind: "idle", message: "" });

    const form = event.currentTarget;
    const data = Object.fromEntries(new FormData(form).entries());

    try {
      const res = await fetch("/api/contact", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });

      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.error ?? "Something went wrong.");
      }

      form.reset();
      setStatus({
        kind: "ok",
        message: "Thanks — we received your request and will be in touch shortly.",
      });
    } catch (err) {
      setStatus({
        kind: "err",
        message: err instanceof Error ? err.message : "Something went wrong.",
      });
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <form className="form" onSubmit={handleSubmit}>
      <div className="form__row">
        <div className="field">
          <label htmlFor="name">Full name</label>
          <input id="name" name="name" type="text" required placeholder="Jane Traveler" />
        </div>
        <div className="field">
          <label htmlFor="email">Email</label>
          <input id="email" name="email" type="email" required placeholder="jane@example.com" />
        </div>
      </div>

      <div className="field">
        <label htmlFor="destination">Where do you want to go?</label>
        <input id="destination" name="destination" type="text" placeholder="Kyoto, Patagonia, the Amalfi Coast…" />
      </div>

      <div className="field">
        <label htmlFor="message">Tell us about your trip</label>
        <textarea
          id="message"
          name="message"
          required
          placeholder="Dates, travelers, pace, and anything that would make it unforgettable."
        />
      </div>

      <button className="btn btn--primary" type="submit" disabled={submitting}>
        {submitting ? "Sending…" : "Start planning"}
      </button>

      <p
        className={
          status.kind === "ok"
            ? "form__status form__status--ok"
            : status.kind === "err"
              ? "form__status form__status--err"
              : "form__status"
        }
        role="status"
        aria-live="polite"
      >
        {status.message}
      </p>
    </form>
  );
}

/** The R&B applications — the lanes the Agency routes to. Mirrors brain/Applications/. */
export interface AppInfo {
  name: string;
  owns: string;
  model: string;
}

export const APPLICATIONS: AppInfo[] = [
  { name: "Intake", owns: "Unified lead capture + instant 24/7 response", model: "Haiku 4.5" },
  { name: "Triage", owns: "Classify, score, dedupe, and route every lead", model: "Haiku 4.5" },
  { name: "Estimator", owns: "Satellite/aerial measurement → AI estimate in minutes", model: "Opus 4.8" },
  { name: "Proposals", owns: "Tiered branded PDF + e-sign + automated follow-up", model: "Opus 4.8" },
  { name: "Scheduler", owns: "Booking tied to crew capacity, reminders, reschedules", model: "Sonnet 4.6" },
  { name: "Jobs", owns: "Status hub, homeowner updates, material lists, photos", model: "Sonnet 4.6" },
  { name: "Billing", owns: "Invoices, payment links, dunning, financing hand-off", model: "Haiku 4.5" },
  { name: "Retention", owns: "Reviews, referrals, warranty + maintenance re-engagement", model: "Haiku 4.5" },
  { name: "Dashboard", owns: "Owner metrics + reporting across the pipeline", model: "Sonnet 4.6" },
];

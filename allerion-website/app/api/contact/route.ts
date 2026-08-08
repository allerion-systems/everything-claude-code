import { NextResponse } from "next/server";

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

type ContactPayload = {
  name?: string;
  email?: string;
  destination?: string;
  message?: string;
};

/**
 * Receives trip-planning enquiries from the landing page.
 *
 * This stub validates the payload and logs it. Wire it up to your email
 * provider, CRM, or database (e.g. Resend, SendGrid, Supabase) to deliver
 * leads for real.
 */
export async function POST(request: Request) {
  let body: ContactPayload;

  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body." }, { status: 400 });
  }

  const name = body.name?.trim();
  const email = body.email?.trim();
  const message = body.message?.trim();

  if (!name || !email || !message) {
    return NextResponse.json(
      { error: "Name, email, and message are required." },
      { status: 400 },
    );
  }

  if (!EMAIL_RE.test(email)) {
    return NextResponse.json({ error: "Please provide a valid email." }, { status: 400 });
  }

  // TODO: integrate with your delivery channel of choice.
  console.log("New trip enquiry:", {
    name,
    email,
    destination: body.destination?.trim() ?? "",
    message,
    receivedAt: new Date().toISOString(),
  });

  return NextResponse.json({ ok: true });
}

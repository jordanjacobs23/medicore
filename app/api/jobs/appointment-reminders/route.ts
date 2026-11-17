import { timingSafeEqual } from "node:crypto";
import { processDueAppointmentReminders } from "@/lib/appointments/reminders";

function matchesJobSecret(request: Request, expectedSecret: string) {
  const authorization = request.headers.get("authorization") ?? "";
  const suppliedSecret = authorization.startsWith("Bearer ") ? authorization.slice(7) : "";
  const supplied = Buffer.from(suppliedSecret);
  const expected = Buffer.from(expectedSecret);
  return supplied.length === expected.length && timingSafeEqual(supplied, expected);
}

async function runReminderJob(request: Request) {
  const secret = process.env.CRON_SECRET;
  if (!secret) {
    return Response.json({ error: "Reminder job is not configured." }, { status: 503 });
  }
  if (!matchesJobSecret(request, secret)) {
    return Response.json({ error: "Unauthorized." }, { status: 401 });
  }
  if (!process.env.TWILIO_ACCOUNT_SID || !process.env.TWILIO_AUTH_TOKEN || !process.env.TWILIO_FROM_NUMBER) {
    return Response.json({ error: "SMS provider is not configured." }, { status: 503 });
  }

  const result = await processDueAppointmentReminders();
  return Response.json(result);
}

export async function GET(request: Request) {
  return runReminderJob(request);
}

export async function POST(request: Request) {
  return runReminderJob(request);
}

This is a [Next.js](https://nextjs.org) project bootstrapped with [`create-next-app`](https://nextjs.org/docs/app/api-reference/cli/create-next-app).

## Getting Started

First, run the development server:

```bash
npm run dev
# or
yarn dev
# or
pnpm dev
# or
bun dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

## Appointment schedules and reminders

Apply the `20261116120000_practitioner_schedules_and_reminders` migration with `npx prisma migrate deploy`, then use **Schedules** in the staff navigation to set each practitioner's recurring weekly hours and appointment length. Patient and staff booking, calendar availability, and reminder times use the practice time zone in Practice Settings. No slots are offered until a practitioner schedule is saved.

Patients can opt in to SMS reminders while booking. Delivery uses Twilio and requires these server environment variables:

- `TWILIO_ACCOUNT_SID`
- `TWILIO_AUTH_TOKEN`
- `TWILIO_FROM_NUMBER`
- `CRON_SECRET`

Vercel runs `GET /api/jobs/appointment-reminders` every five minutes from `vercel.json` and sends `Authorization: Bearer <CRON_SECRET>`. Other hosting platforms can call the same `GET` or `POST` endpoint on a five-minute schedule with that header. The job sends due 24-hour and 2-hour reminders and retries delivery failures up to three times.

Patient phone numbers must be stored in international E.164 format (for example, `+27123456789`) for Twilio delivery.

You can start editing the page by modifying `app/page.tsx`. The page auto-updates as you edit the file.

This project uses [`next/font`](https://nextjs.org/docs/app/building-your-application/optimizing/fonts) to automatically optimize and load [Geist](https://vercel.com/font), a new font family for Vercel.

## Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js) - your feedback and contributions are welcome!

## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

Check out our [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details.

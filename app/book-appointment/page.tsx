import { redirect } from "next/navigation";

export default function BookAppointmentRedirectPage() {
  redirect("/portal/appointments/book");
}

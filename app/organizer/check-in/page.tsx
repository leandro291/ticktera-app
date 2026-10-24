import type { Metadata } from "next";
import { CheckInPanel } from "@/modules/organizer";

export const metadata: Metadata = { title: "Check-in" };

export default function CheckInPage() {
  return <CheckInPanel />;
}

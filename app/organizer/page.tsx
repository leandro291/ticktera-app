import type { Metadata } from "next";
import { OrganizerDashboard, type SavedNotice } from "@/modules/organizer";

export const metadata: Metadata = { title: "Panel de organizador" };

const SAVED: SavedNotice[] = ["published", "draft"];

export default async function OrganizerPage({ searchParams }: PageProps<"/organizer">) {
  const { saved } = await searchParams;
  const notice = SAVED.find((s) => s === saved);
  return <OrganizerDashboard saved={notice} />;
}

import type { Metadata } from "next";
import { AuthPage } from "@/modules/auth";

export const metadata: Metadata = { title: "Ingresar" };

export default async function LoginPage({ searchParams }: PageProps<"/login">) {
  const { mode, redirect } = await searchParams;

  return (
    <main className="flex-1">
      <AuthPage initialMode={mode === "register" ? "register" : "login"} redirectTo={typeof redirect === "string" ? redirect : undefined} />
    </main>
  );
}

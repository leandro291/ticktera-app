// Health check del deploy (infra/aws/deploy.sh). No toca la BD: solo confirma que el proceso responde.
export const dynamic = "force-dynamic";

export function GET() {
  return Response.json({ status: "ok" });
}

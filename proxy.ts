import { clerkMiddleware } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";
import { parseRole } from "@/modules/auth/lib/permissions";
import { resolveRouteAccess } from "@/modules/auth/lib/route-access";

// Capa 1 (D6): bloqueo rápido por claim. La autoridad es la BD (requirePermission).
// No importa db ni lib/env: corre en el proxy.
export default clerkMiddleware(async (auth, req) => {
  const { userId, sessionClaims, redirectToSignIn } = await auth();
  const claimRole = sessionClaims?.metadata?.role;

  const access = resolveRouteAccess(req.nextUrl.pathname, {
    signedIn: !!userId,
    // Claim ausente = aún sin sincronizar (D7): no se asume customer.
    role: claimRole ? parseRole(claimRole) : undefined,
  });

  if (access === "sign-in") return redirectToSignIn({ returnBackUrl: req.url });
  if (access === "forbidden") return NextResponse.redirect(new URL("/", req.url));
});

export const config = {
  matcher: [
    "/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)",
    "/(api|trpc)(.*)",
    "/__clerk/:path*",
  ],
};

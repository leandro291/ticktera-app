"use client";

import { useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { TicketIcon } from "lucide-react";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import { nameFromEmail, safeRedirect } from "../lib/display-name";
import { useSessionStore } from "../store/use-session-store";
import { PasswordInput } from "./password-input";

export type AuthMode = "login" | "register";

const MODES: { key: AuthMode; label: string }[] = [
  { key: "login", label: "Iniciar sesión" },
  { key: "register", label: "Crear cuenta" },
];

const BRAND_IMAGE = "/images/events/ultra-lima.jpg";
const field = "h-[52px] rounded-[14px] px-4 text-base md:text-[15px]";
const label = "flex flex-col gap-2 text-sm font-medium";
const submitClass = "mt-1.5 h-[54px] rounded-2xl bg-primary text-base font-semibold text-primary-foreground hover:bg-indigo-700";
const switchClass = "font-semibold text-primary hover:text-indigo-700";

interface AuthPageProps {
  initialMode?: AuthMode;
  /** Same-site path to open after signing in. */
  redirectTo?: string;
}

function BrandLogo({ small }: { small?: boolean }) {
  return (
    <Link href="/" className="relative flex w-fit items-center gap-2 text-white hover:text-white lg:gap-2.5">
      <span className={cn("flex items-center justify-center bg-white text-primary", small ? "size-8 rounded-[10px]" : "size-[38px] rounded-[11px]")}>
        <TicketIcon className="size-5" aria-hidden />
      </span>
      <span className={cn("font-bold tracking-tight", small ? "text-lg" : "text-[21px]")}>Ticketera</span>
    </Link>
  );
}

export function AuthPage({ initialMode = "login", redirectTo }: AuthPageProps) {
  const router = useRouter();
  const signIn = useSessionStore((s) => s.signIn);
  const [mode, setMode] = useState<AuthMode>(initialMode);

  const submit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const data = new FormData(e.currentTarget);
    const email = String(data.get("email") ?? "");
    const name = String(data.get("name") ?? "").trim() || nameFromEmail(email);
    signIn({ name, email });
    router.push(safeRedirect(redirectTo));
  };

  return (
    <div className="flex min-h-dvh flex-col lg:grid lg:grid-cols-[minmax(0,640px)_minmax(0,1fr)]">
      {/* Brand panel: banner on mobile, full-height column on desktop */}
      <section className="relative flex h-[210px] shrink-0 flex-col justify-between overflow-hidden bg-stage p-4 text-white lg:h-auto lg:justify-start lg:gap-8 lg:p-10">
        <span className="absolute top-0 right-0 h-full w-[170px] overflow-hidden rounded-bl-[40px] lg:hidden">
          <Image src={BRAND_IMAGE} alt="" fill priority sizes="170px" className="object-cover" />
        </span>
        <div className="lg:hidden">
          <BrandLogo small />
        </div>
        <div className="hidden lg:block">
          <BrandLogo />
        </div>
        <span className="relative hidden h-[440px] overflow-hidden rounded-[28px] lg:block">
          <Image
            src={BRAND_IMAGE}
            alt="Multitud con las manos en alto frente a un escenario con luces doradas durante un festival nocturno"
            fill
            priority
            sizes="560px"
            className="object-cover"
          />
        </span>
        <div className="relative flex w-[190px] flex-col gap-1.5 lg:w-auto lg:gap-2.5">
          <p className="text-[22px] leading-tight font-bold tracking-[-0.02em] lg:text-[34px] lg:leading-[1.15] lg:tracking-[-0.025em]">
            Tus entradas, siempre a mano.
          </p>
          <p className="text-[13px] leading-snug text-indigo-200 lg:text-base lg:leading-[1.55]">Compra en minutos y lleva tu QR en el celular.</p>
        </div>
      </section>

      <section className="flex grow justify-center px-4 pt-6 pb-8 lg:items-center lg:py-12">
        <div className="flex w-full max-w-[440px] flex-col gap-6 lg:gap-7">
          <div className="grid grid-cols-2 gap-1 rounded-2xl bg-muted p-1">
            {MODES.map((m) => (
              <button
                key={m.key}
                type="button"
                aria-pressed={mode === m.key}
                onClick={() => setMode(m.key)}
                className={cn(
                  "h-11 rounded-xl text-[15px]",
                  mode === m.key ? "bg-background font-semibold shadow-[0_2px_8px_-4px_rgba(24,24,27,.3)]" : "font-medium text-foreground/80 hover:text-foreground",
                )}
              >
                {m.label}
              </button>
            ))}
          </div>

          {mode === "login" ? (
            <form key="login" onSubmit={submit} className="flex flex-col gap-4 lg:gap-[18px]">
              <div className="flex flex-col gap-1.5">
                <h1 className="text-[26px] leading-[1.15] font-bold tracking-[-0.025em] lg:text-[30px]">Hola de nuevo</h1>
                <p className="text-[15px] text-muted-foreground">Ingresa para ver tus entradas y comprar más rápido.</p>
              </div>
              <label className={label}>
                Correo electrónico
                <Input name="email" type="email" required autoComplete="email" placeholder="tu@email.com" className={field} />
              </label>
              <div className="flex flex-col gap-2">
                <span className="flex justify-between text-sm font-medium">
                  <label htmlFor="login-password">Contraseña</label>
                  <Link href="#" className="font-semibold">
                    ¿Olvidaste tu contraseña?
                  </Link>
                </span>
                <PasswordInput id="login-password" name="password" required autoComplete="current-password" className={field} />
              </div>
              <button type="submit" className={submitClass}>
                Iniciar sesión
              </button>
              <p className="text-center text-sm text-muted-foreground">
                ¿No tienes cuenta?{" "}
                <button type="button" onClick={() => setMode("register")} className={switchClass}>
                  Crea una gratis
                </button>
              </p>
            </form>
          ) : (
            <form key="register" onSubmit={submit} className="flex flex-col gap-4 lg:gap-[18px]">
              <div className="flex flex-col gap-1.5">
                <h1 className="text-[26px] leading-[1.15] font-bold tracking-[-0.025em] lg:text-[30px]">Crea tu cuenta</h1>
                <p className="text-[15px] text-muted-foreground">Guarda tus entradas y recibe novedades de tus eventos.</p>
              </div>
              <label className={label}>
                Nombre completo
                <Input name="name" required autoComplete="name" placeholder="Tu nombre y apellido" className={field} />
              </label>
              <label className={label}>
                Correo electrónico
                <Input name="email" type="email" required autoComplete="email" placeholder="tu@email.com" className={field} />
              </label>
              <div className="flex flex-col gap-2">
                <label htmlFor="register-password" className="text-sm font-medium">
                  Contraseña
                </label>
                <PasswordInput
                  id="register-password"
                  name="password"
                  required
                  minLength={8}
                  autoComplete="new-password"
                  aria-describedby="password-hint"
                  className={field}
                />
                <span id="password-hint" className="text-[13px] text-muted-foreground">
                  Mínimo 8 caracteres.
                </span>
              </div>
              <label className="flex cursor-pointer items-center gap-3 text-sm text-zinc-700">
                <Checkbox name="terms" required className="size-5" />
                <span>
                  Acepto los <Link href="#">Términos y condiciones</Link>
                </span>
              </label>
              <button type="submit" className={submitClass}>
                Crear cuenta
              </button>
              <p className="text-center text-sm text-muted-foreground">
                ¿Ya tienes cuenta?{" "}
                <button type="button" onClick={() => setMode("login")} className={switchClass}>
                  Inicia sesión
                </button>
              </p>
            </form>
          )}
        </div>
      </section>
    </div>
  );
}

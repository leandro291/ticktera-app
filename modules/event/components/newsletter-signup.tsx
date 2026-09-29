"use client";

import { useState } from "react";
import { CheckCircle2Icon, MailIcon } from "lucide-react";

export function NewsletterSignup() {
  const [done, setDone] = useState(false);

  return (
    <section className="mx-auto w-full max-w-[1440px] px-4 pb-10 lg:px-20 lg:pb-[88px]">
      <div className="flex flex-col gap-[18px] rounded-3xl bg-accent px-[22px] py-7 lg:flex-row lg:items-center lg:justify-between lg:gap-12 lg:rounded-[32px] lg:px-16 lg:py-14">
        <div className="flex max-w-[520px] flex-col gap-2 lg:gap-2.5">
          <h2 className="text-[22px] leading-tight font-bold tracking-[-0.02em] lg:text-[30px]">No te pierdas ningún evento</h2>
          <p className="text-sm leading-relaxed text-zinc-700 lg:text-base">
            Suscríbete y recibe las novedades de tus artistas y equipos favoritos.
          </p>
        </div>
        {done ? (
          <p role="status" className="flex items-center gap-2 text-[15px] font-semibold text-primary">
            <CheckCircle2Icon className="size-5" aria-hidden />
            ¡Listo! Te avisaremos de las novedades.
          </p>
        ) : (
          <form
            onSubmit={(e) => {
              e.preventDefault();
              setDone(true);
            }}
            className="flex flex-col gap-2.5 lg:flex-row"
          >
            <label className="flex h-[52px] items-center gap-2.5 rounded-[14px] border border-indigo-200 bg-background px-4 text-muted-foreground lg:h-14 lg:w-[360px] lg:rounded-2xl lg:px-[18px]">
              <MailIcon className="size-5 shrink-0" aria-hidden />
              <span className="sr-only">Correo electrónico</span>
              <input
                type="email"
                required
                placeholder="tu@email.com"
                className="w-full bg-transparent text-[15px] text-foreground outline-none placeholder:text-muted-foreground"
              />
            </label>
            <button type="submit" className="h-[52px] rounded-[14px] bg-primary px-[26px] text-[15px] font-semibold text-primary-foreground hover:bg-indigo-700 lg:h-14 lg:rounded-2xl">
              Suscribirme
            </button>
          </form>
        )}
      </div>
    </section>
  );
}

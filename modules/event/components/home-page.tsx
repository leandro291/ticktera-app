import { CreditCardIcon, SearchIcon, TicketIcon } from "lucide-react";
import type { EventSummary } from "../types/event";
import { EventSearchBar } from "./event-search-bar";
import { FeaturedCarousel } from "./featured-carousel";
import { HomeCatalog } from "./home-catalog";
import { NewsletterSignup } from "./newsletter-signup";

const STEPS = [
  { icon: SearchIcon, title: "Buscar", text: "Encuentra el evento, artista o ciudad que te interesa." },
  { icon: TicketIcon, title: "Elegir", text: "Selecciona tus entradas y la cantidad que necesitas." },
  { icon: CreditCardIcon, title: "Comprar", text: "Paga de forma segura y recibe tus entradas al instante." },
];

interface HomePageProps {
  featured: EventSummary[];
  upcoming: EventSummary[];
}

export function HomePage({ featured, upcoming }: HomePageProps) {
  return (
    <>
      <section className="mx-auto flex w-full max-w-[1440px] flex-col gap-2.5 px-4 pt-[22px] pb-5 lg:flex-row lg:items-end lg:justify-between lg:gap-12 lg:px-20 lg:pt-11 lg:pb-7">
        <div className="flex flex-col gap-2.5 lg:w-[560px] lg:shrink-0 lg:gap-3">
          <h1 className="text-[30px] leading-[1.12] font-bold tracking-[-0.03em] text-balance lg:text-5xl lg:leading-[1.08]">
            Encuentra tu próximo plan en vivo
          </h1>
          <p className="text-[15px] leading-normal text-muted-foreground lg:text-[17px] lg:leading-[1.55]">
            Conciertos, deportes, teatro y festivales. Compra seguro y recibe tu entrada al instante.
          </p>
        </div>
        <div className="mt-1.5 lg:mt-0 lg:w-[672px]">
          <EventSearchBar />
        </div>
      </section>

      <FeaturedCarousel events={featured} />
      <HomeCatalog events={upcoming} />

      <section id="como-funciona" className="mx-auto flex w-full max-w-[1440px] scroll-mt-20 flex-col gap-7 px-4 py-12 lg:items-center lg:gap-14 lg:px-20 lg:pt-24 lg:pb-[88px]">
        <div className="flex flex-col gap-1 lg:items-center lg:gap-2 lg:text-center">
          <h2 className="text-2xl leading-tight font-bold tracking-[-0.02em] lg:text-[32px]">Cómo funciona</h2>
          <p className="text-sm text-muted-foreground lg:text-base">Tres pasos y ya estás dentro.</p>
        </div>
        <ol className="flex w-full flex-col gap-[22px] lg:grid lg:grid-cols-3 lg:gap-8">
          {STEPS.map((step, i) => (
            <li key={step.title} className="flex gap-4 lg:flex-col">
              <div className="flex items-center gap-4">
                <span className="flex size-[52px] shrink-0 items-center justify-center rounded-2xl bg-accent text-primary lg:size-16 lg:rounded-[20px]">
                  <step.icon className="size-6 lg:size-7" aria-hidden />
                </span>
                {i < STEPS.length - 1 && <span className="hidden grow border-t-[1.5px] border-dashed border-input lg:block" aria-hidden />}
              </div>
              <div className="flex flex-col gap-[3px] lg:gap-4">
                <span className="text-xs font-semibold text-primary lg:text-[13px]">Paso {i + 1}</span>
                <h3 className="text-[17px] font-semibold lg:text-xl">{step.title}</h3>
                <p className="text-sm leading-relaxed text-muted-foreground lg:max-w-[340px] lg:text-[15px]">{step.text}</p>
              </div>
            </li>
          ))}
        </ol>
      </section>

      <NewsletterSignup />
    </>
  );
}

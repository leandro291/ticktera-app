import Link from "next/link";
import { Logo } from "./logo";

const FOOTER_COLUMNS = [
  { title: "Compañía", links: ["Sobre nosotros", "Contacto"] },
  { title: "Ayuda", links: ["Centro de ayuda", "Cómo comprar", "Reembolsos"] },
  { title: "Legal", links: ["Términos y condiciones", "Privacidad", "Cookies"] },
  { title: "Síguenos", links: ["Instagram", "Facebook", "X (Twitter)"] },
];

export function SiteFooter() {
  return (
    <footer className="border-t border-divider bg-surface">
      <div className="mx-auto flex max-w-[1440px] flex-col gap-7 px-4 pt-9 pb-7 lg:gap-12 lg:px-20 lg:pt-16 lg:pb-10">
        <div className="flex flex-col gap-7 lg:flex-row lg:justify-between lg:gap-12">
          <div className="flex flex-col gap-2.5 lg:w-[300px] lg:gap-3.5">
            <Logo />
            <p className="text-[13px] leading-relaxed text-muted-foreground lg:text-sm">
              Entradas para conciertos, deportes, teatro y festivales.
            </p>
          </div>
          <div className="grid grid-cols-2 gap-x-4 gap-y-7 lg:grid-cols-4 lg:gap-14">
            {FOOTER_COLUMNS.map((column) => (
              <div key={column.title} className="flex flex-col gap-2.5 lg:gap-3">
                <h3 className="text-[13px] font-semibold lg:text-sm">{column.title}</h3>
                {column.links.map((label) => (
                  <Link key={label} href="#" className="text-[13px] text-muted-foreground hover:text-primary lg:text-sm">
                    {label}
                  </Link>
                ))}
              </div>
            ))}
          </div>
        </div>
        <p className="border-t border-border pt-6 text-[13px] text-muted-foreground">
          © 2026 Ticketera. Todos los derechos reservados.
        </p>
      </div>
    </footer>
  );
}

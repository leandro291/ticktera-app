import { ClerkProvider } from "@clerk/nextjs";
import { shadcn } from "@clerk/ui/themes";
import type { Metadata } from "next";
import { Poppins } from "next/font/google";
import { PersistedStores } from "@/components/shared/persisted-stores";
import { QueryProvider } from "@/components/shared/query-provider";
import "./globals.css";

const poppins = Poppins({
  variable: "--font-poppins",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
});

export const metadata: Metadata = {
  title: {
    default: "Ticketera · Entradas para conciertos, deportes, teatro y festivales",
    template: "%s · Ticketera",
  },
  description:
    "Conciertos, deportes, teatro y festivales. Compra seguro y recibe tu entrada al instante.",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="es" className={`${poppins.variable} h-full`}>
      <body className="flex min-h-full flex-col">
        <ClerkProvider appearance={{ theme: shadcn }}>
          <QueryProvider>
            <PersistedStores />
            {children}
          </QueryProvider>
        </ClerkProvider>
      </body>
    </html>
  );
}
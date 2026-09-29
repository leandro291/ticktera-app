"use client";

import { useState } from "react";
import { InfoIcon, QrCodeIcon, StoreIcon } from "lucide-react";
import { Input } from "@/components/ui/input";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { cn } from "@/lib/utils";
import { formatCardNumber, formatExpiry } from "../lib/payment-format";
import type { PaymentMethod } from "../types/order";

const PAYMENT_METHODS: { key: PaymentMethod; label: string; mobileLabel: string }[] = [
  { key: "card", label: "Tarjeta", mobileLabel: "Tarjeta de crédito o débito" },
  { key: "yape", label: "Yape", mobileLabel: "Yape" },
  { key: "cash", label: "PagoEfectivo", mobileLabel: "PagoEfectivo" },
];

const DOCUMENT_TYPES = [
  { value: "dni", label: "DNI" },
  { value: "ce", label: "CE" },
  { value: "passport", label: "Pasaporte" },
];

const field = "h-[52px] rounded-[14px] px-4 text-[15px] md:text-[15px]";
const label = "flex flex-col gap-2 text-sm font-medium";
const card = "flex flex-col gap-4 rounded-[20px] border border-border bg-card px-4 py-5 lg:gap-5 lg:rounded-3xl lg:p-7";

interface CheckoutFieldsProps {
  method: PaymentMethod;
  onMethodChange: (method: PaymentMethod) => void;
  disabled?: boolean;
}

export function CheckoutFields({ method, onMethodChange, disabled }: CheckoutFieldsProps) {
  const [cardNumber, setCardNumber] = useState("");
  const [expiry, setExpiry] = useState("");

  return (
    <fieldset disabled={disabled} className="flex min-w-0 flex-col gap-4 lg:gap-6">
      <section className={card}>
        <div className="flex flex-col gap-1">
          <h2 className="text-lg font-semibold lg:text-xl">Datos del comprador</h2>
          <p className="text-[13px] text-muted-foreground lg:text-sm">Enviaremos tus entradas al correo que indiques.</p>
        </div>
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-2 lg:gap-x-5 lg:gap-y-[18px]">
          <label className={label}>
            Nombre completo
            <Input name="name" required autoComplete="name" placeholder="Como figura en tu documento" className={field} />
          </label>
          <label className={label}>
            Correo electrónico
            <Input name="email" type="email" required autoComplete="email" placeholder="tu@email.com" className={field} />
          </label>
          <div className={label}>
            <span id="document-label">Documento de identidad</span>
            <div className="flex gap-2">
              <Select items={DOCUMENT_TYPES} defaultValue="dni" name="documentType">
                <SelectTrigger aria-label="Tipo de documento" className={cn(field, "w-[110px] shrink-0 px-3 data-[size=default]:h-[52px]")}>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {DOCUMENT_TYPES.map((d) => (
                    <SelectItem key={d.value} value={d.value}>
                      {d.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Input
                name="documentNumber"
                required
                inputMode="numeric"
                aria-labelledby="document-label"
                placeholder="Número"
                className={field}
              />
            </div>
          </div>
          <label className={label}>
            Celular
            <Input name="phone" type="tel" required autoComplete="tel" placeholder="Número de celular" className={field} />
          </label>
        </div>
      </section>

      <section className={card}>
        <h2 className="text-lg font-semibold lg:text-xl">Método de pago</h2>
        <RadioGroup
          aria-label="Método de pago"
          value={method}
          onValueChange={(value) => onMethodChange(value as PaymentMethod)}
          className="grid grid-cols-1 gap-2.5 lg:grid-cols-3 lg:gap-3"
        >
          {PAYMENT_METHODS.map((m) => (
            <label
              key={m.key}
              className={cn(
                "flex h-[60px] cursor-pointer items-center gap-3 rounded-[14px] border-2 px-4 text-[15px] font-semibold lg:h-[76px] lg:rounded-2xl lg:px-[18px]",
                method === m.key ? "border-primary bg-accent" : "border-border bg-card",
              )}
            >
              <RadioGroupItem value={m.key} className="size-5 lg:size-[18px]" />
              <span className="lg:hidden">{m.mobileLabel}</span>
              <span className="hidden lg:inline">{m.label}</span>
            </label>
          ))}
        </RadioGroup>

        {method === "card" && (
          <div className="grid grid-cols-2 gap-3 lg:grid-cols-4 lg:gap-x-5 lg:gap-y-[18px]">
            <label className={cn(label, "col-span-2")}>
              Número de tarjeta
              <Input
                name="cardNumber"
                required
                inputMode="numeric"
                autoComplete="cc-number"
                placeholder="0000 0000 0000 0000"
                value={cardNumber}
                onChange={(e) => setCardNumber(formatCardNumber(e.target.value))}
                pattern="[0-9 ]{15,23}"
                className={field}
              />
            </label>
            <label className={label}>
              Vencimiento
              <Input
                name="cardExpiry"
                required
                autoComplete="cc-exp"
                placeholder="MM/AA"
                value={expiry}
                onChange={(e) => setExpiry(formatExpiry(e.target.value))}
                pattern="(0[1-9]|1[0-2])/[0-9]{2}"
                className={field}
              />
            </label>
            <label className={label}>
              CVV
              <Input
                name="cardCvv"
                required
                inputMode="numeric"
                autoComplete="cc-csc"
                placeholder="3 o 4 dígitos"
                pattern="[0-9]{3,4}"
                maxLength={4}
                className={field}
              />
            </label>
            <label className={cn(label, "col-span-2 lg:col-span-4")}>
              Nombre en la tarjeta
              <Input name="cardName" required autoComplete="cc-name" placeholder="Como aparece en la tarjeta" className={field} />
            </label>
          </div>
        )}
        {method !== "card" && (
          <p className="flex items-start gap-3 rounded-[14px] bg-accent p-4 text-sm leading-normal text-accent-foreground lg:items-center lg:gap-3.5 lg:rounded-2xl lg:px-5 lg:py-[18px] lg:text-[15px]">
            {method === "yape" ? <QrCodeIcon className="size-5 shrink-0" aria-hidden /> : <StoreIcon className="size-5 shrink-0" aria-hidden />}
            {method === "yape"
              ? "Al continuar te mostraremos un código QR para pagar desde tu app de Yape."
              : "Generaremos un código de pago para que pagues en agentes, bodegas o tu banca móvil."}
          </p>
        )}
        <p className="flex items-center gap-2 text-xs text-muted-foreground">
          <InfoIcon className="size-3.5 shrink-0" aria-hidden />
          Demo: no se realiza ningún cobro real.
        </p>
      </section>
    </fieldset>
  );
}

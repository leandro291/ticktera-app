"use client";

import { RequiredMark } from "@/components/shared/required-mark";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { cn } from "@/lib/utils";
import { buyerSchema } from "../schemas/checkout-schema";

export type DocumentType = "dni" | "ce" | "passport";

export interface BuyerValues {
  fullName: string;
  /** Correo de la cuenta: solo lectura, no viaja en el input de la acción. */
  email: string;
  phone: string;
  documentType: DocumentType;
  documentNumber: string;
}

export type BuyerField = "fullName" | "phone" | "documentNumber";
export type BuyerErrors = Partial<Record<BuyerField, string>>;

const DOCUMENT_TYPES = [
  { value: "dni", label: "DNI" },
  { value: "ce", label: "CE" },
  { value: "passport", label: "Pasaporte" },
];

const DOCUMENT_MESSAGES: Record<DocumentType, string> = {
  dni: "El DNI tiene 8 dígitos.",
  ce: "El CE tiene entre 9 y 12 letras o números.",
  passport: "El pasaporte tiene entre 6 y 12 letras o números.",
};

/** Mismas reglas que el servidor (`buyerSchema`), con mensajes por campo. Vacío = sin errores. */
export function validateBuyer(values: Omit<BuyerValues, "email">): BuyerErrors {
  const result = buyerSchema.safeParse(values);
  if (result.success) return {};
  const errors: BuyerErrors = {};
  for (const issue of result.error.issues) {
    const field = issue.path[0];
    if (field === "fullName") errors.fullName ??= "Ingresa tu nombre completo.";
    else if (field === "phone") errors.phone ??= "Ingresa un celular válido.";
    else if (field === "documentNumber") errors.documentNumber ??= DOCUMENT_MESSAGES[values.documentType];
  }
  return errors;
}

const field = "h-[52px] rounded-[14px] px-4 text-[15px] md:text-[15px]";
const label = "text-sm font-medium";
const column = "flex flex-col gap-2";
const card = "flex flex-col gap-4 rounded-[20px] border border-border bg-card px-4 py-5 lg:gap-5 lg:rounded-3xl lg:p-7";

function FieldError({ id, message }: { id: string; message?: string }) {
  return message ? (
    <p id={id} className="text-[13px] text-destructive">
      {message}
    </p>
  ) : null;
}

const invalid = (message?: string) => ({ "aria-invalid": message ? true : undefined });

interface CheckoutFieldsProps {
  defaults: BuyerValues;
  errors: BuyerErrors;
  disabled?: boolean;
}

/** Paso 1 (D1): datos del comprador. Campos sin control; el padre lee el formulario con `FormData`. */
export function CheckoutFields({ defaults, errors, disabled }: CheckoutFieldsProps) {
  return (
    <fieldset disabled={disabled} className="flex min-w-0 flex-col gap-4 lg:gap-6">
      <section className={card}>
        <div className="flex flex-col gap-1">
          <h2 className="text-lg font-semibold lg:text-xl">Datos del comprador</h2>
          <p className="text-[13px] text-muted-foreground lg:text-sm">
            Los campos con <span className="text-destructive">*</span> son obligatorios.
          </p>
        </div>
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-2 lg:gap-x-5 lg:gap-y-[18px]">
          <div className={column}>
            <label htmlFor="buyer-name" className={label}>
              Nombre completo
              <RequiredMark />
            </label>
            <Input
              id="buyer-name"
              name="fullName"
              required
              autoComplete="name"
              placeholder="Como figura en tu documento"
              defaultValue={defaults.fullName}
              aria-describedby={errors.fullName ? "buyer-name-error" : undefined}
              {...invalid(errors.fullName)}
              className={field}
            />
            <FieldError id="buyer-name-error" message={errors.fullName} />
          </div>
          <div className={column}>
            <label htmlFor="buyer-email" className={label}>
              Correo electrónico
            </label>
            <Input
              id="buyer-email"
              type="email"
              readOnly
              autoComplete="email"
              value={defaults.email}
              aria-describedby="buyer-email-hint"
              className={cn(field, "bg-muted")}
            />
            <p id="buyer-email-hint" className="text-[13px] text-muted-foreground">
              Es el correo de tu cuenta.
            </p>
          </div>
          <div className={column}>
            <span id="document-label" className={label}>
              Documento de identidad
              <RequiredMark />
            </span>
            <div className="flex gap-2">
              <Select items={DOCUMENT_TYPES} defaultValue={defaults.documentType} name="documentType">
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
                aria-labelledby="document-label"
                aria-describedby={errors.documentNumber ? "buyer-document-error" : undefined}
                {...invalid(errors.documentNumber)}
                placeholder="Número"
                defaultValue={defaults.documentNumber}
                className={field}
              />
            </div>
            <FieldError id="buyer-document-error" message={errors.documentNumber} />
          </div>
          <div className={column}>
            <label htmlFor="buyer-phone" className={label}>
              Celular
              <RequiredMark />
            </label>
            <Input
              id="buyer-phone"
              name="phone"
              type="tel"
              required
              autoComplete="tel"
              placeholder="Número de celular"
              defaultValue={defaults.phone}
              aria-describedby={errors.phone ? "buyer-phone-error" : undefined}
              {...invalid(errors.phone)}
              className={field}
            />
            <FieldError id="buyer-phone-error" message={errors.phone} />
          </div>
        </div>
      </section>
    </fieldset>
  );
}

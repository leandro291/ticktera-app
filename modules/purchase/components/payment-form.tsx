"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Elements, PaymentElement, useElements, useStripe } from "@stripe/react-stripe-js";
import type { Stripe } from "@stripe/stripe-js";
import { loadStripe } from "@stripe/stripe-js/pure";

/** Sin clave pública no hay Payment Element: el botón de pagar queda deshabilitado. Acceso estático para que Next lo inlinee. */
export const PAYMENTS_ENABLED = Boolean(process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY);

const GENERIC_ERROR = "No pudimos procesar el pago. Intenta de nuevo.";

// `pure`: Stripe.js se descarga al llegar al paso 2, no al importar el módulo. La clave pública va inlineada en el bundle (D8).
let stripePromise: Promise<Stripe | null> | undefined;
function getStripePromise() {
  const key = process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY;
  if (!key) return null;
  return (stripePromise ??= loadStripe(key));
}

interface PaymentFormProps {
  clientSecret: string;
  orderCode: string;
  /** Id del `<form>`: el botón de pagar vive fuera (resumen y barra móvil) y lo envía con `form=`. */
  formId: string;
  /** Reserva vencida: no se confirma nada. */
  disabled: boolean;
  onPayingChange: (paying: boolean) => void;
  /** `useStripe()`/`useElements()` ya cargaron: recién ahí se puede enviar el pago. */
  onReadyChange: (ready: boolean) => void;
}

/** Paso 2 (D1): Payment Element (solo tarjeta, el PaymentIntent lo restringe) y `confirmPayment`. */
export function PaymentForm({ clientSecret, orderCode, formId, disabled, onPayingChange, onReadyChange }: PaymentFormProps) {
  const stripe = getStripePromise();
  const headingRef = useRef<HTMLHeadingElement>(null);

  // Al pasar al paso 2 el foco va al encabezado del pago.
  useEffect(() => headingRef.current?.focus(), []);

  return (
    <section
      aria-labelledby="payment-heading"
      className="flex flex-col gap-4 rounded-[20px] border border-border bg-card px-4 py-5 lg:gap-5 lg:rounded-3xl lg:p-7"
    >
      <div className="flex flex-col gap-1">
        <h2 id="payment-heading" ref={headingRef} tabIndex={-1} className="text-lg font-semibold outline-none lg:text-xl">
          Pago con tarjeta
        </h2>
        <p className="text-[13px] text-muted-foreground lg:text-sm">Tarjeta de crédito o débito. El pago lo procesa Stripe: no guardamos los datos de tu tarjeta.</p>
      </div>
      {stripe ? (
        <Elements
          stripe={stripe}
          options={{
            clientSecret,
            locale: "es",
            // Los hex coinciden con --primary / --destructive: el iframe de Stripe no lee tokens CSS.
            appearance: { variables: { colorPrimary: "#4F46E5", colorDanger: "#BE123C", borderRadius: "14px" } },
          }}
        >
          <PaymentFormFields orderCode={orderCode} formId={formId} disabled={disabled} onPayingChange={onPayingChange} onReadyChange={onReadyChange} />
        </Elements>
      ) : (
        <p role="alert" className="text-sm text-destructive">
          Los pagos no están disponibles por ahora.
        </p>
      )}
    </section>
  );
}

function PaymentFormFields({ orderCode, formId, disabled, onPayingChange, onReadyChange }: Omit<PaymentFormProps, "clientSecret">) {
  const stripe = useStripe();
  const elements = useElements();
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const confirming = useRef(false);

  useEffect(() => onReadyChange(Boolean(stripe && elements)), [stripe, elements, onReadyChange]);

  const submit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!stripe || !elements || disabled || confirming.current) return;
    confirming.current = true;
    setError(null);
    onPayingChange(true);
    // AC11: nunca se decide aquí si el pago fue exitoso. Sin error, se va a la confirmación, que lee `orders.status` de la BD.
    const { error: stripeError } = await stripe.confirmPayment({
      elements,
      confirmParams: { return_url: `${window.location.origin}/checkout/confirmation?code=${encodeURIComponent(orderCode)}` },
      redirect: "if_required",
    });
    // Ya confirmado o en curso (p. ej. 3DS terminado en otra pestaña): la página de confirmación decide por `orders.status`.
    if (stripeError?.code === "payment_intent_unexpected_state") {
      router.push(`/checkout/confirmation?code=${encodeURIComponent(orderCode)}`);
      return;
    }
    if (stripeError) {
      setError(stripeError.type === "card_error" || stripeError.type === "validation_error" ? (stripeError.message ?? GENERIC_ERROR) : GENERIC_ERROR);
      confirming.current = false;
      onPayingChange(false);
      return;
    }
    router.push(`/checkout/confirmation?code=${encodeURIComponent(orderCode)}`);
  };

  return (
    <form id={formId} onSubmit={submit} className="flex flex-col gap-4">
      <PaymentElement options={{ layout: "tabs" }} onLoadError={() => setError("No pudimos cargar el formulario de pago. Recarga la página.")} />
      {error && (
        <p role="alert" className="text-sm text-destructive">
          {error}
        </p>
      )}
    </form>
  );
}

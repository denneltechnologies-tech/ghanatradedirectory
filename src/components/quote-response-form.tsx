"use client";

import { useActionState } from "react";
import { quoteResponseAction } from "@/actions/logistics";
import { idleState } from "@/lib/actions";
import { StatusMessage, SubmitButton } from "@/components/form-bits";

export type QuoteResponseValues = {
  priceAmount: string;
  currency: string;
  inclusions: string;
  estimatedPickup: string;
  estimatedDelivery: string;
  terms: string;
  validUntil: string;
};

export const emptyQuoteResponse: QuoteResponseValues = {
  priceAmount: "",
  currency: "GHS",
  inclusions: "",
  estimatedPickup: "",
  estimatedDelivery: "",
  terms: "",
  validUntil: "",
};

export function QuoteResponseForm({
  quoteRequestId,
  values = emptyQuoteResponse,
  replace = false,
}: {
  quoteRequestId: string;
  values?: QuoteResponseValues;
  replace?: boolean;
}) {
  const [state, formAction] = useActionState(quoteResponseAction, idleState);

  return (
    <form action={formAction} className="space-y-3">
      <input type="hidden" name="quoteRequestId" value={quoteRequestId} />
      <div className="grid gap-3 sm:grid-cols-3">
        <div>
          <label className="label" htmlFor={`qr-price-${quoteRequestId}`}>
            Price
          </label>
          <input
            id={`qr-price-${quoteRequestId}`}
            name="priceAmount"
            inputMode="decimal"
            defaultValue={values.priceAmount}
            className="input"
            placeholder="0.00"
          />
        </div>
        <div>
          <label className="label" htmlFor={`qr-currency-${quoteRequestId}`}>
            Currency
          </label>
          <input id={`qr-currency-${quoteRequestId}`} name="currency" defaultValue={values.currency} maxLength={3} className="input" />
        </div>
        <div>
          <label className="label" htmlFor={`qr-valid-${quoteRequestId}`}>
            Valid until
          </label>
          <input id={`qr-valid-${quoteRequestId}`} name="validUntil" type="date" defaultValue={values.validUntil} className="input" />
        </div>
      </div>
      <div className="grid gap-3 sm:grid-cols-2">
        <div>
          <label className="label" htmlFor={`qr-pickup-${quoteRequestId}`}>
            Estimated pickup
          </label>
          <input id={`qr-pickup-${quoteRequestId}`} name="estimatedPickup" defaultValue={values.estimatedPickup} className="input" placeholder="e.g. Tomorrow 9am" />
        </div>
        <div>
          <label className="label" htmlFor={`qr-delivery-${quoteRequestId}`}>
            Estimated delivery
          </label>
          <input id={`qr-delivery-${quoteRequestId}`} name="estimatedDelivery" defaultValue={values.estimatedDelivery} className="input" placeholder="e.g. Same day, 4pm" />
        </div>
      </div>
      <div>
        <label className="label" htmlFor={`qr-inclusions-${quoteRequestId}`}>
          What the price includes
        </label>
        <textarea id={`qr-inclusions-${quoteRequestId}`} name="inclusions" defaultValue={values.inclusions} rows={2} className="textarea" placeholder="Loading, fuel, tolls…" />
      </div>
      <div>
        <label className="label" htmlFor={`qr-terms-${quoteRequestId}`}>
          Terms &amp; conditions
        </label>
        <textarea id={`qr-terms-${quoteRequestId}`} name="terms" defaultValue={values.terms} rows={2} className="textarea" />
      </div>
      <StatusMessage state={state} />
      <SubmitButton className="btn-primary btn-sm">
        {replace ? "Update quote" : "Send quote"}
      </SubmitButton>
    </form>
  );
}

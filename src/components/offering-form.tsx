"use client";

import { useActionState } from "react";
import { createOfferingAction, updateOfferingAction } from "@/actions/offering";
import { idleState } from "@/lib/actions";
import { FieldError, StatusMessage, SubmitButton } from "@/components/form-bits";
import { formatMoney } from "@/lib/format";

export type OfferingValues = {
  id?: string;
  type: string;
  title: string;
  description: string;
  priceAmount: string;
  currency: string;
  priceLabel: string;
  availability: string;
  deliveryNote: string;
  actionUrl: string;
  sortOrder: string;
};

export function OfferingForm({
  businessId,
  values,
}: {
  businessId: string;
  values?: OfferingValues;
}) {
  const action = values?.id ? updateOfferingAction : createOfferingAction;
  const [state, formAction] = useActionState(action, idleState);
  const preview = values?.priceAmount ? formatMoney(values.priceAmount, values.currency || "GHS") : null;

  return (
    <form action={formAction} className="space-y-3">
      <input type="hidden" name="businessId" value={businessId} />
      {values?.id ? <input type="hidden" name="offeringId" value={values.id} /> : null}
      <div className="grid gap-3 sm:grid-cols-2">
        <div>
          <label className="label" htmlFor={`offering-type-${values?.id ?? "new"}`}>
            Type
          </label>
          <select id={`offering-type-${values?.id ?? "new"}`} name="type" defaultValue={values?.type ?? "PRODUCT"} className="select">
            <option value="PRODUCT">Product</option>
            <option value="SERVICE">Service</option>
          </select>
        </div>
        <div>
          <label className="label" htmlFor={`offering-title-${values?.id ?? "new"}`}>
            Title
          </label>
          <input id={`offering-title-${values?.id ?? "new"}`} name="title" defaultValue={values?.title ?? ""} required className="input" />
          <FieldError state={state} name="title" />
        </div>
      </div>
      <div>
        <label className="label" htmlFor={`offering-desc-${values?.id ?? "new"}`}>
          Description
        </label>
        <textarea
          id={`offering-desc-${values?.id ?? "new"}`}
          name="description"
          defaultValue={values?.description ?? ""}
          rows={2}
          maxLength={2000}
          className="textarea"
        />
      </div>
      <div className="grid gap-3 sm:grid-cols-3">
        <div>
          <label className="label" htmlFor={`offering-price-${values?.id ?? "new"}`}>
            Price
          </label>
          <input
            id={`offering-price-${values?.id ?? "new"}`}
            name="priceAmount"
            inputMode="decimal"
            defaultValue={values?.priceAmount ?? ""}
            className="input"
            placeholder="0.00"
          />
          {preview ? <p className="field-help">Shown as {preview}</p> : null}
        </div>
        <div>
          <label className="label" htmlFor={`offering-currency-${values?.id ?? "new"}`}>
            Currency
          </label>
          <input id={`offering-currency-${values?.id ?? "new"}`} name="currency" defaultValue={values?.currency ?? "GHS"} maxLength={3} className="input" />
        </div>
        <div>
          <label className="label" htmlFor={`offering-pricelabel-${values?.id ?? "new"}`}>
            Price note
          </label>
          <input
            id={`offering-pricelabel-${values?.id ?? "new"}`}
            name="priceLabel"
            defaultValue={values?.priceLabel ?? ""}
            className="input"
            placeholder="e.g. per bag"
          />
        </div>
      </div>
      <div className="grid gap-3 sm:grid-cols-2">
        <div>
          <label className="label" htmlFor={`offering-avail-${values?.id ?? "new"}`}>
            Availability
          </label>
          <input id={`offering-avail-${values?.id ?? "new"}`} name="availability" defaultValue={values?.availability ?? ""} className="input" placeholder="In stock / Made to order" />
        </div>
        <div>
          <label className="label" htmlFor={`offering-action-${values?.id ?? "new"}`}>
            Order / more info URL
          </label>
          <input id={`offering-action-${values?.id ?? "new"}`} name="actionUrl" defaultValue={values?.actionUrl ?? ""} className="input" placeholder="https://" />
          <FieldError state={state} name="actionUrl" />
        </div>
      </div>
      <div className="grid gap-3 sm:grid-cols-2">
        <div>
          <label className="label" htmlFor={`offering-delivery-${values?.id ?? "new"}`}>
            Delivery note
          </label>
          <input id={`offering-delivery-${values?.id ?? "new"}`} name="deliveryNote" defaultValue={values?.deliveryNote ?? ""} className="input" />
        </div>
        <div>
          <label className="label" htmlFor={`offering-sort-${values?.id ?? "new"}`}>
            Display order
          </label>
          <input id={`offering-sort-${values?.id ?? "new"}`} name="sortOrder" type="number" min={0} max={999} defaultValue={values?.sortOrder ?? "0"} className="input" />
        </div>
      </div>
      <StatusMessage state={state} />
      <SubmitButton className="btn-primary btn-sm">
        {values?.id ? "Save offering" : "Add offering"}
      </SubmitButton>
    </form>
  );
}

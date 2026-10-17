"use client";

import { useActionState, useMemo, useState } from "react";
import { quoteRequestAction } from "@/actions/logistics";
import { idleState } from "@/lib/actions";
import { FieldError, StatusMessage, SubmitButton } from "@/components/form-bits";
import { humanizeEnum } from "@/lib/format";
import { LogisticsServiceType } from "@/generated/prisma/enums";
import type { RegionWithDistricts } from "@/components/business-form";

export type ProviderOption = {
  id: string;
  businessName: string;
  regionName: string | null;
};

function DistrictSelect({
  name,
  label,
  regions,
  regionId,
  onRegionChange,
  idPrefix,
}: {
  name: { region: string; district: string };
  label: string;
  regions: RegionWithDistricts[];
  regionId: string;
  onRegionChange: (value: string) => void;
  idPrefix: string;
}) {
  const districts = useMemo(
    () => regions.find((region) => region.id === regionId)?.districts ?? [],
    [regions, regionId],
  );

  return (
    <div className="grid gap-3 sm:grid-cols-2">
      <div>
        <label htmlFor={`${idPrefix}-region`} className="label">
          {label} region
        </label>
        <select
          id={`${idPrefix}-region`}
          name={name.region}
          value={regionId}
          onChange={(event) => onRegionChange(event.target.value)}
          className="select"
          required
        >
          <option value="">Choose a region…</option>
          {regions.map((region) => (
            <option key={region.id} value={region.id}>
              {region.name}
            </option>
          ))}
        </select>
      </div>
      <div>
        <label htmlFor={`${idPrefix}-district`} className="label">
          {label} district (optional)
        </label>
        <select id={`${idPrefix}-district`} name={name.district} className="select" disabled={!regionId}>
          <option value="">Choose a district…</option>
          {districts.map((district) => (
            <option key={district.id} value={district.id}>
              {district.name}
            </option>
          ))}
        </select>
      </div>
    </div>
  );
}

export function QuoteRequestForm({
  providers,
  regions,
  preselectedProviderId,
  defaults,
}: {
  providers: ProviderOption[];
  regions: RegionWithDistricts[];
  preselectedProviderId?: string;
  defaults: { contactName: string; contactPhone: string; contactEmail: string };
}) {
  const [state, formAction] = useActionState(quoteRequestAction, idleState);
  const [pickupRegion, setPickupRegion] = useState("");
  const [dropoffRegion, setDropoffRegion] = useState("");

  return (
    <form action={formAction} className="space-y-5">
      <StatusMessage state={state} />

      <section className="card space-y-4 p-5">
        <h2 className="section-title">What needs moving?</h2>
        <div>
          <label htmlFor="qr-service" className="label">
            Service type
          </label>
          <select id="qr-service" name="serviceType" className="select" required defaultValue="">
            <option value="">Choose a service…</option>
            {Object.values(LogisticsServiceType).map((value) => (
              <option key={value} value={value}>
                {humanizeEnum(value)}
              </option>
            ))}
          </select>
          <FieldError state={state} name="serviceType" />
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label htmlFor="qr-cargo" className="label">
              Cargo type
            </label>
            <input id="qr-cargo" name="cargoType" className="input" placeholder="e.g. Building materials" />
          </div>
          <div>
            <label htmlFor="qr-weight" className="label">
              Approximate weight (kg)
            </label>
            <input id="qr-weight" name="weightKg" inputMode="decimal" className="input" placeholder="e.g. 500" />
          </div>
          <div>
            <label htmlFor="qr-quantity" className="label">
              Quantity / pieces
            </label>
            <input id="qr-quantity" name="quantity" type="number" min={1} className="input" />
          </div>
          <div>
            <label htmlFor="qr-date" className="label">
              Preferred date
            </label>
            <input id="qr-date" name="requestedDate" type="date" className="input" />
          </div>
          <div>
            <label htmlFor="qr-window" className="label">
              Time window
            </label>
            <input id="qr-window" name="timeWindow" className="input" placeholder="e.g. Morning" />
          </div>
          <div>
            <label htmlFor="qr-vehicle" className="label">
              Vehicle needs
            </label>
            <input id="qr-vehicle" name="vehicleNeeds" className="input" placeholder="e.g. Flatbed truck" />
          </div>
        </div>
        <div>
          <label htmlFor="qr-cargo-desc" className="label">
            Cargo description
          </label>
          <textarea id="qr-cargo-desc" name="cargoDescription" rows={2} className="textarea" placeholder="Describe the items, dimensions and any handling needs." />
        </div>
        <div>
          <label htmlFor="qr-special" className="label">
            Special handling
          </label>
          <input id="qr-special" name="specialHandling" className="input" placeholder="e.g. Fragile, keep upright" />
        </div>
      </section>

      <section className="card space-y-4 p-5">
        <h2 className="section-title">Route</h2>
        <DistrictSelect
          idPrefix="pickup"
          label="Pickup"
          name={{ region: "pickupRegionId", district: "pickupDistrictId" }}
          regions={regions}
          regionId={pickupRegion}
          onRegionChange={setPickupRegion}
        />
        <div>
          <label htmlFor="pickup-details" className="label">
            Pickup details
          </label>
          <input id="pickup-details" name="pickupDetails" className="input" placeholder="Specific address, landmark or contact" required />
          <FieldError state={state} name="pickupDetails" />
        </div>
        <DistrictSelect
          idPrefix="dropoff"
          label="Drop-off"
          name={{ region: "dropoffRegionId", district: "dropoffDistrictId" }}
          regions={regions}
          regionId={dropoffRegion}
          onRegionChange={setDropoffRegion}
        />
        <div>
          <label htmlFor="dropoff-details" className="label">
            Drop-off details
          </label>
          <input id="dropoff-details" name="dropoffDetails" className="input" placeholder="Specific address, landmark or contact" required />
          <FieldError state={state} name="dropoffDetails" />
        </div>
      </section>

      <section className="card space-y-3 p-5">
        <h2 className="section-title">Send to providers</h2>
        <p className="text-sm text-ink-600">
          Select the providers you want to receive this request. They will see your contact details.
        </p>
        <fieldset className="grid gap-2 sm:grid-cols-2">
          <legend className="sr-only">Providers</legend>
          {providers.map((provider) => (
            <label key={provider.id} className="flex items-start gap-2 rounded-lg border border-ink-200 p-3 text-sm">
              <input
                type="checkbox"
                name="recipientProfileIds"
                value={provider.id}
                defaultChecked={preselectedProviderId === provider.id}
                className="mt-0.5 h-4 w-4"
              />
              <span>
                <span className="block font-medium text-ink-900">{provider.businessName}</span>
                {provider.regionName ? (
                  <span className="block text-xs text-ink-500">{provider.regionName}</span>
                ) : null}
              </span>
            </label>
          ))}
        </fieldset>
        <FieldError state={state} name="recipientProfileIds" />
      </section>

      <section className="card space-y-4 p-5">
        <h2 className="section-title">Your contact details</h2>
        <div className="grid gap-4 sm:grid-cols-3">
          <div>
            <label htmlFor="qr-name" className="label">
              Name
            </label>
            <input id="qr-name" name="contactName" defaultValue={defaults.contactName} required className="input" />
            <FieldError state={state} name="contactName" />
          </div>
          <div>
            <label htmlFor="qr-phone" className="label">
              Phone
            </label>
            <input id="qr-phone" name="contactPhone" defaultValue={defaults.contactPhone} required className="input" placeholder="0XX XXX XXXX" />
            <FieldError state={state} name="contactPhone" />
          </div>
          <div>
            <label htmlFor="qr-email" className="label">
              Email (optional)
            </label>
            <input id="qr-email" name="contactEmail" type="email" defaultValue={defaults.contactEmail} className="input" />
            <FieldError state={state} name="contactEmail" />
          </div>
        </div>
        <div>
          <label htmlFor="qr-notes" className="label">
            Notes for providers
          </label>
          <textarea id="qr-notes" name="notes" rows={2} className="textarea" />
        </div>
        <label className="flex items-start gap-2 text-sm text-ink-700">
          <input type="checkbox" name="consentShare" value="on" className="mt-0.5 h-4 w-4" />
          <span>
            I consent to share this request and my contact details with the providers I selected.
          </span>
        </label>
        <FieldError state={state} name="consentShare" />
      </section>

      <SubmitButton className="btn-primary">Send quote request</SubmitButton>
    </form>
  );
}

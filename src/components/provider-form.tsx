"use client";

import { useActionState, useMemo, useState } from "react";
import { upsertProviderAction } from "@/actions/logistics";
import { idleState } from "@/lib/actions";
import { FieldError, StatusMessage, SubmitButton } from "@/components/form-bits";
import { humanizeEnum } from "@/lib/format";
import { CoverageScope, LogisticsServiceType } from "@/generated/prisma/enums";
import type { RegionWithDistricts } from "@/components/business-form";

export type ProviderValues = {
  businessId: string;
  description: string;
  serviceTypes: string[];
  coverage: string[];
  baseRegionId: string;
  baseDistrictId: string;
  namedRoutes: string;
  vehicleTypes: string;
  capacityMinKg: string;
  capacityMaxKg: string;
  operatingHours: string;
  trackingMethod: string;
  insurancePolicy: string;
  responseHours: string;
  contactChannel: string;
  active: boolean;
};

export function ProviderForm({
  businesses,
  regions,
  values,
  lockedBusiness = false,
}: {
  businesses: { id: string; name: string }[];
  regions: RegionWithDistricts[];
  values: ProviderValues;
  lockedBusiness?: boolean;
}) {
  const [state, formAction] = useActionState(upsertProviderAction, idleState);
  const [baseRegionId, setBaseRegionId] = useState(values.baseRegionId);

  const districts = useMemo(
    () => regions.find((region) => region.id === baseRegionId)?.districts ?? [],
    [regions, baseRegionId],
  );

  return (
    <form action={formAction} className="space-y-5">
      <StatusMessage state={state} />

      <section className="card space-y-4 p-5">
        <h2 className="section-title">Provider profile</h2>
        <div>
          <label htmlFor="provider-business" className="label">
            Linked business
          </label>
          <select
            id="provider-business"
            name="businessId"
            defaultValue={values.businessId}
            className="select"
            required
            disabled={lockedBusiness}
          >
            <option value="">Choose a business…</option>
            {businesses.map((business) => (
              <option key={business.id} value={business.id}>
                {business.name}
              </option>
            ))}
          </select>
          {lockedBusiness ? (
            <input type="hidden" name="businessId" value={values.businessId} />
          ) : null}
          <p className="field-help">
            Your logistics profile is attached to one of your published businesses.
          </p>
        </div>
        <div>
          <label htmlFor="provider-description" className="label">
            Describe your service
          </label>
          <textarea
            id="provider-description"
            name="description"
            defaultValue={values.description}
            rows={4}
            maxLength={2000}
            required
            className="textarea"
            placeholder="What you move, typical routes, vehicle types and coverage."
          />
          <FieldError state={state} name="description" />
        </div>
      </section>

      <section className="card space-y-4 p-5">
        <h2 className="section-title">Services offered</h2>
        <fieldset>
          <legend className="label">Service types</legend>
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
            {Object.values(LogisticsServiceType).map((value) => (
              <label key={value} className="flex items-center gap-2 text-sm text-ink-700">
                <input
                  type="checkbox"
                  name="serviceTypes"
                  value={value}
                  defaultChecked={values.serviceTypes.includes(value)}
                  className="h-4 w-4"
                />
                {humanizeEnum(value)}
              </label>
            ))}
          </div>
          <FieldError state={state} name="serviceTypes" />
        </fieldset>
        <fieldset>
          <legend className="label">Coverage</legend>
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
            {Object.values(CoverageScope).map((value) => (
              <label key={value} className="flex items-center gap-2 text-sm text-ink-700">
                <input
                  type="checkbox"
                  name="coverage"
                  value={value}
                  defaultChecked={values.coverage.includes(value)}
                  className="h-4 w-4"
                />
                {humanizeEnum(value)}
              </label>
            ))}
          </div>
          <FieldError state={state} name="coverage" />
        </fieldset>
        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label htmlFor="provider-region" className="label">
              Base region
            </label>
            <select
              id="provider-region"
              name="baseRegionId"
              value={baseRegionId}
              onChange={(event) => setBaseRegionId(event.target.value)}
              className="select"
            >
              <option value="">Not specified</option>
              {regions.map((region) => (
                <option key={region.id} value={region.id}>
                  {region.name}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label htmlFor="provider-district" className="label">
              Base district
            </label>
            <select
              id="provider-district"
              name="baseDistrictId"
              defaultValue={values.baseDistrictId}
              className="select"
              disabled={!baseRegionId}
            >
              <option value="">Not specified</option>
              {districts.map((district) => (
                <option key={district.id} value={district.id}>
                  {district.name}
                </option>
              ))}
            </select>
          </div>
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label htmlFor="provider-routes" className="label">
              Named routes (comma separated)
            </label>
            <input id="provider-routes" name="namedRoutes" defaultValue={values.namedRoutes} className="input" placeholder="Accra–Kumasi, Accra–Takoradi" />
          </div>
          <div>
            <label htmlFor="provider-vehicles" className="label">
              Vehicle types (comma separated)
            </label>
            <input id="provider-vehicles" name="vehicleTypes" defaultValue={values.vehicleTypes} className="input" placeholder="Motorbike, Kia truck, Refrigerated van" />
          </div>
        </div>
      </section>

      <section className="card space-y-4 p-5">
        <h2 className="section-title">Capacity &amp; terms</h2>
        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label htmlFor="provider-min" className="label">
              Minimum load (kg, optional)
            </label>
            <input id="provider-min" name="capacityMinKg" inputMode="decimal" defaultValue={values.capacityMinKg} className="input" />
          </div>
          <div>
            <label htmlFor="provider-max" className="label">
              Maximum load (kg, optional)
            </label>
            <input id="provider-max" name="capacityMaxKg" inputMode="decimal" defaultValue={values.capacityMaxKg} className="input" />
          </div>
          <div>
            <label htmlFor="provider-hours" className="label">
              Operating hours
            </label>
            <input id="provider-hours" name="operatingHours" defaultValue={values.operatingHours} className="input" placeholder="Mon–Sat 6am–8pm" />
          </div>
          <div>
            <label htmlFor="provider-tracking" className="label">
              Tracking method
            </label>
            <input id="provider-tracking" name="trackingMethod" defaultValue={values.trackingMethod} className="input" placeholder="Phone updates, GPS" />
          </div>
          <div>
            <label htmlFor="provider-insurance" className="label">
              Insurance / liability policy
            </label>
            <input id="provider-insurance" name="insurancePolicy" defaultValue={values.insurancePolicy} className="input" />
          </div>
          <div>
            <label htmlFor="provider-response" className="label">
              Typical response time (hours)
            </label>
            <input id="provider-response" name="responseHours" type="number" min={1} max={720} defaultValue={values.responseHours} className="input" />
          </div>
          <div>
            <label htmlFor="provider-channel" className="label">
              Preferred contact channel
            </label>
            <input id="provider-channel" name="contactChannel" defaultValue={values.contactChannel} className="input" placeholder="WhatsApp" />
          </div>
        </div>
        <label className="flex items-center gap-2 text-sm text-ink-700">
          <input type="checkbox" name="active" defaultChecked={values.active} className="h-4 w-4" />
          Profile is active and visible in the provider directory
        </label>
        <p className="text-xs text-ink-500">
          Quoting is not a confirmed booking. Customers agree final terms directly with you.
        </p>
      </section>

      <SubmitButton className="btn-primary">Save provider profile</SubmitButton>
    </form>
  );
}

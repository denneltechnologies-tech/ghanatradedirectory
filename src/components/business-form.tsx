"use client";

import Link from "next/link";
import { useActionState, useMemo, useState } from "react";
import { createBusinessAction, updateBusinessAction } from "@/actions/business";
import { idleState } from "@/lib/actions";
import { FieldError, StatusMessage, SubmitButton } from "@/components/form-bits";

export type CategoryOption = {
  id: string;
  name: string;
  slug: string;
  icon: string | null;
  parentId: string | null;
};

export type RegionWithDistricts = {
  id: string;
  name: string;
  slug: string;
  districts: { id: string; name: string; slug: string }[];
};

export type BusinessFormValues = {
  id?: string;
  name: string;
  description: string;
  longDescription: string;
  categoryId: string;
  phone: string;
  whatsapp: string;
  email: string;
  website: string;
  facebook: string;
  instagram: string;
  tiktok: string;
  twitter: string;
  contactHours: string;
  preferredChannel: string;
  registrationName: string;
  registrationId: string;
  deliveryOffered: boolean;
  paymentMethods: string;
  languages: string;
  tags: string;
  accessibilityNotes: string;
  regionId: string;
  districtId: string;
  locality: string;
  address: string;
  landmark: string;
  latitude: string;
  longitude: string;
};

export const emptyBusinessValues: BusinessFormValues = {
  name: "",
  description: "",
  longDescription: "",
  categoryId: "",
  phone: "",
  whatsapp: "",
  email: "",
  website: "",
  facebook: "",
  instagram: "",
  tiktok: "",
  twitter: "",
  contactHours: "",
  preferredChannel: "",
  registrationName: "",
  registrationId: "",
  deliveryOffered: false,
  paymentMethods: "",
  languages: "English, Twi",
  tags: "",
  accessibilityNotes: "",
  regionId: "",
  districtId: "",
  locality: "",
  address: "",
  landmark: "",
  latitude: "",
  longitude: "",
};

export function BusinessForm({
  mode,
  values,
  categories,
  regions,
  status,
}: {
  mode: "create" | "edit";
  values: BusinessFormValues;
  categories: CategoryOption[];
  regions: RegionWithDistricts[];
  status?: string;
}) {
  const action = mode === "create" ? createBusinessAction : updateBusinessAction;
  const [state, formAction] = useActionState(action, idleState);
  const [regionId, setRegionId] = useState(values.regionId);

  const grouped = useMemo(() => {
    const parents = categories.filter((category) => !category.parentId);
    return parents.map((parent) => ({
      parent,
      children: categories.filter((category) => category.parentId === parent.id),
    }));
  }, [categories]);

  const districts = useMemo(
    () => regions.find((region) => region.id === regionId)?.districts ?? [],
    [regions, regionId],
  );

  return (
    <form action={formAction} className="space-y-6">
      {values.id ? <input type="hidden" name="businessId" value={values.id} /> : null}
      <StatusMessage state={state} />
      {status === "created" ? (
        <p className="rounded-lg border border-brand-200 bg-brand-50 px-3 py-2 text-sm text-brand-700">
          Listing created as a draft. Add products or services, then submit it for review.
        </p>
      ) : null}

      <section className="card space-y-4 p-5">
        <h2 className="section-title">Basics</h2>
        <div>
          <label htmlFor="biz-name" className="label">
            Business name
          </label>
          <input id="biz-name" name="name" defaultValue={values.name} required className="input" />
          <FieldError state={state} name="name" />
        </div>
        <div>
          <label htmlFor="biz-category" className="label">
            Sector
          </label>
          <select id="biz-category" name="categoryId" defaultValue={values.categoryId} className="select" required>
            <option value="">Choose a sector…</option>
            {grouped.map(({ parent, children }) => (
              <optgroup key={parent.id} label={`${parent.icon ? `${parent.icon} ` : ""}${parent.name}`}>
                <option value={parent.id}>{parent.name} (general)</option>
                {children.map((child) => (
                  <option key={child.id} value={child.id}>
                    {child.name}
                  </option>
                ))}
              </optgroup>
            ))}
          </select>
          <FieldError state={state} name="categoryId" />
        </div>
        <div>
          <label htmlFor="biz-description" className="label">
            Short description
          </label>
          <textarea
            id="biz-description"
            name="description"
            defaultValue={values.description}
            rows={3}
            maxLength={400}
            required
            className="textarea"
            placeholder="One or two sentences describing what you offer and who you serve."
          />
          <p className="field-help">{values.description.length}/400 characters</p>
          <FieldError state={state} name="description" />
        </div>
        <div>
          <label htmlFor="biz-long" className="label">
            Full description (optional)
          </label>
          <textarea
            id="biz-long"
            name="longDescription"
            defaultValue={values.longDescription}
            rows={5}
            maxLength={4000}
            className="textarea"
            placeholder="Tell customers about your history, specialities and service."
          />
        </div>
        <div>
          <label htmlFor="biz-tags" className="label">
            Tags (comma separated)
          </label>
          <input
            id="biz-tags"
            name="tags"
            defaultValue={values.tags}
            className="input"
            placeholder="e.g. wholesale, organic, delivery"
          />
        </div>
      </section>

      <section className="card space-y-4 p-5">
        <h2 className="section-title">Location</h2>
        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label htmlFor="biz-region" className="label">
              Region
            </label>
            <select
              id="biz-region"
              name="regionId"
              value={regionId}
              onChange={(event) => setRegionId(event.target.value)}
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
            <FieldError state={state} name="regionId" />
          </div>
          <div>
            <label htmlFor="biz-district" className="label">
              District (optional)
            </label>
            <select
              id="biz-district"
              name="districtId"
              defaultValue={values.districtId}
              className="select"
              disabled={!regionId}
            >
              <option value="">Choose a district…</option>
              {districts.map((district) => (
                <option key={district.id} value={district.id}>
                  {district.name}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label htmlFor="biz-locality" className="label">
              Town / locality
            </label>
            <input id="biz-locality" name="locality" defaultValue={values.locality} className="input" placeholder="e.g. Tema" />
          </div>
          <div>
            <label htmlFor="biz-address" className="label">
              Street address
            </label>
            <input id="biz-address" name="address" defaultValue={values.address} className="input" />
          </div>
          <div>
            <label htmlFor="biz-landmark" className="label">
              Nearby landmark
            </label>
            <input id="biz-landmark" name="landmark" defaultValue={values.landmark} className="input" />
          </div>
        </div>
        <details className="text-sm">
          <summary className="cursor-pointer text-ink-600">Add map coordinates (optional)</summary>
          <div className="mt-3 grid gap-4 sm:grid-cols-2">
            <div>
              <label htmlFor="biz-lat" className="label">
                Latitude
              </label>
              <input id="biz-lat" name="latitude" defaultValue={values.latitude} className="input" />
            </div>
            <div>
              <label htmlFor="biz-lng" className="label">
                Longitude
              </label>
              <input id="biz-lng" name="longitude" defaultValue={values.longitude} className="input" />
            </div>
          </div>
        </details>
      </section>

      <section className="card space-y-4 p-5">
        <h2 className="section-title">Contact</h2>
        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label htmlFor="biz-phone" className="label">
              Phone
            </label>
            <input id="biz-phone" name="phone" defaultValue={values.phone} className="input" placeholder="0XX XXX XXXX" />
          </div>
          <div>
            <label htmlFor="biz-whatsapp" className="label">
              WhatsApp
            </label>
            <input id="biz-whatsapp" name="whatsapp" defaultValue={values.whatsapp} className="input" />
          </div>
          <div>
            <label htmlFor="biz-email" className="label">
              Email
            </label>
            <input id="biz-email" name="email" type="email" defaultValue={values.email} className="input" />
            <FieldError state={state} name="email" />
          </div>
          <div>
            <label htmlFor="biz-website" className="label">
              Website
            </label>
            <input id="biz-website" name="website" defaultValue={values.website} className="input" placeholder="https://" />
            <FieldError state={state} name="website" />
          </div>
          <div>
            <label htmlFor="biz-hours" className="label">
              Opening hours
            </label>
            <input id="biz-hours" name="contactHours" defaultValue={values.contactHours} className="input" placeholder="Mon–Sat 8am–6pm" />
          </div>
          <div>
            <label htmlFor="biz-channel" className="label">
              Preferred contact channel
            </label>
            <select id="biz-channel" name="preferredChannel" defaultValue={values.preferredChannel} className="select">
              <option value="">No preference</option>
              <option value="whatsapp">WhatsApp</option>
              <option value="call">Phone call</option>
              <option value="email">Email</option>
            </select>
          </div>
        </div>
        <details className="text-sm">
          <summary className="cursor-pointer text-ink-600">Social profiles (optional)</summary>
          <div className="mt-3 grid gap-4 sm:grid-cols-2">
            <input name="facebook" defaultValue={values.facebook} className="input" placeholder="Facebook URL" />
            <input name="instagram" defaultValue={values.instagram} className="input" placeholder="Instagram URL" />
            <input name="tiktok" defaultValue={values.tiktok} className="input" placeholder="TikTok URL" />
            <input name="twitter" defaultValue={values.twitter} className="input" placeholder="X / Twitter URL" />
          </div>
        </details>
      </section>

      <section className="card space-y-4 p-5">
        <h2 className="section-title">Operations &amp; compliance</h2>
        <label className="flex items-center gap-2 text-sm text-ink-700">
          <input type="checkbox" name="deliveryOffered" defaultChecked={values.deliveryOffered} className="h-4 w-4" />
          You offer delivery to customers
        </label>
        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label htmlFor="biz-payment" className="label">
              Accepted payments (comma separated)
            </label>
            <input id="biz-payment" name="paymentMethods" defaultValue={values.paymentMethods} className="input" placeholder="Cash, Mobile Money, Bank transfer" />
          </div>
          <div>
            <label htmlFor="biz-languages" className="label">
              Languages spoken (comma separated)
            </label>
            <input id="biz-languages" name="languages" defaultValue={values.languages} className="input" />
          </div>
          <div>
            <label htmlFor="biz-regname" className="label">
              Registered name (optional)
            </label>
            <input id="biz-regname" name="registrationName" defaultValue={values.registrationName} className="input" />
          </div>
          <div>
            <label htmlFor="biz-regid" className="label">
              Registration number (optional)
            </label>
            <input id="biz-regid" name="registrationId" defaultValue={values.registrationId} className="input" />
          </div>
        </div>
        <div>
          <label htmlFor="biz-access" className="label">
            Accessibility notes (optional)
          </label>
          <textarea id="biz-access" name="accessibilityNotes" defaultValue={values.accessibilityNotes} rows={2} className="textarea" />
        </div>
        <p className="text-xs text-ink-500">
          Registration details are used only for verification review and are not shown publicly.
        </p>
      </section>

      <div className="flex flex-wrap items-center gap-3">
        <SubmitButton className="btn-primary">
          {mode === "create" ? "Create draft listing" : "Save changes"}
        </SubmitButton>
        <Link href="/dashboard" className="btn-ghost">
          Cancel
        </Link>
      </div>
    </form>
  );
}

import type { Metadata } from "next";
import { listCategoryTree } from "@/lib/services/admin";
import { toggleCategoryAction, upsertCategoryAction } from "@/actions/admin";
import { formatDate } from "@/lib/format";

export const metadata: Metadata = { title: "Admin · Sectors" };

export default async function AdminCategoriesPage() {
  const categories = await listCategoryTree();

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-bold text-ink-900">Sectors &amp; categories</h2>
        <p className="text-sm text-ink-500">{categories.length} total</p>
      </div>

      <details className="card p-5">
        <summary className="cursor-pointer font-semibold text-ink-900">Add a sector or category</summary>
        <form action={upsertCategoryAction} className="mt-4 grid gap-3 sm:grid-cols-2">
          <div>
            <label className="label" htmlFor="new-name">
              Name
            </label>
            <input id="new-name" name="name" required className="input" placeholder="e.g. Building Materials" />
          </div>
          <div>
            <label className="label" htmlFor="new-parent">
              Parent category
            </label>
            <select id="new-parent" name="parentId" className="select" defaultValue="">
              <option value="">None (top level)</option>
              {categories.map((category) => (
                <option key={category.id} value={category.id}>
                  {category.name}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="label" htmlFor="new-icon">
              Icon (emoji)
            </label>
            <input id="new-icon" name="icon" className="input" maxLength={8} placeholder="🏗️" />
          </div>
          <div>
            <label className="label" htmlFor="new-sort">
              Sort order
            </label>
            <input id="new-sort" name="sortOrder" type="number" min={0} max={999} defaultValue={0} className="input" />
          </div>
          <div className="sm:col-span-2">
            <label className="label" htmlFor="new-description">
              Description
            </label>
            <input id="new-description" name="description" className="input" placeholder="Short description" />
          </div>
          <div className="flex items-center gap-4 sm:col-span-2">
            <label className="flex items-center gap-2 text-sm text-ink-700">
              <input type="checkbox" name="active" defaultChecked className="checkbox" /> Active
            </label>
            <label className="flex items-center gap-2 text-sm text-ink-700">
              <input type="checkbox" name="featured" className="checkbox" /> Featured on home
            </label>
          </div>
          <div className="sm:col-span-2">
            <button type="submit" className="btn-primary btn-sm">
              Create
            </button>
          </div>
        </form>
      </details>

      <div className="card overflow-x-auto">
        <table className="table-base">
          <thead>
            <tr>
              <th>Name</th>
              <th>Parent</th>
              <th>Businesses</th>
              <th>Order</th>
              <th>Status</th>
              <th className="text-right">Actions</th>
            </tr>
          </thead>
          <tbody>
            {categories.map((category) => (
              <tr key={category.id}>
                <td>
                  <div className="font-medium text-ink-900">
                    {category.icon ? <span className="mr-1">{category.icon}</span> : null}
                    {category.name}
                  </div>
                  <div className="text-xs text-ink-400">/{category.slug}</div>
                </td>
                <td className="text-ink-600">{category.parent?.name ?? "—"}</td>
                <td className="text-ink-600">{category._count.businesses}</td>
                <td className="text-ink-600">{category.sortOrder}</td>
                <td>
                  <span className={category.active ? "badge-brand" : "badge-neutral"}>
                    {category.active ? "Active" : "Hidden"}
                  </span>
                  {category.featured ? <span className="badge-gold ml-1">Featured</span> : null}
                </td>
                <td>
                  <div className="flex justify-end gap-2">
                    <form action={toggleCategoryAction}>
                      <input type="hidden" name="id" value={category.id} />
                      <input type="hidden" name="active" value={category.active ? "false" : "true"} />
                      <button type="submit" className="btn-secondary btn-sm">
                        {category.active ? "Hide" : "Activate"}
                      </button>
                    </form>
                    <details className="relative">
                      <summary className="btn-ghost btn-sm cursor-pointer">Edit</summary>
                      <form
                        action={upsertCategoryAction}
                        className="absolute right-0 z-10 mt-1 w-72 space-y-2 rounded-lg border border-ink-200 bg-white p-3 shadow-lg"
                      >
                        <input type="hidden" name="id" value={category.id} />
                        <input name="name" defaultValue={category.name} required className="input text-sm" />
                        <select name="parentId" defaultValue={category.parentId ?? ""} className="select text-sm">
                          <option value="">None (top level)</option>
                          {categories
                            .filter((option) => option.id !== category.id)
                            .map((option) => (
                              <option key={option.id} value={option.id}>
                                {option.name}
                              </option>
                            ))}
                        </select>
                        <input name="icon" defaultValue={category.icon ?? ""} maxLength={8} className="input text-sm" placeholder="Icon" />
                        <input
                          name="description"
                          defaultValue={category.description ?? ""}
                          className="input text-sm"
                          placeholder="Description"
                        />
                        <input
                          name="sortOrder"
                          type="number"
                          min={0}
                          max={999}
                          defaultValue={category.sortOrder}
                          className="input text-sm"
                        />
                        <label className="flex items-center gap-2 text-sm text-ink-700">
                          <input type="checkbox" name="active" defaultChecked={category.active} className="checkbox" /> Active
                        </label>
                        <label className="flex items-center gap-2 text-sm text-ink-700">
                          <input type="checkbox" name="featured" defaultChecked={category.featured} className="checkbox" /> Featured
                        </label>
                        <button type="submit" className="btn-primary btn-sm w-full">
                          Save
                        </button>
                        <p className="text-xs text-ink-400">Updated {formatDate(category.updatedAt)}</p>
                      </form>
                    </details>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

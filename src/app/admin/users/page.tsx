import type { Metadata } from "next";
import { listUsers } from "@/lib/services/admin";
import { setUserRoleAction, setUserStatusAction } from "@/actions/admin";
import { formatDate, humanizeEnum } from "@/lib/format";
import { RoleBadge, UserStatusBadge } from "@/components/badges";

export const metadata: Metadata = { title: "Admin · Users" };

export default async function AdminUsersPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const query = await searchParams;
  const rawSearch = Array.isArray(query.q) ? query.q[0] : query.q;
  const search = rawSearch?.trim() || undefined;
  const users = await listUsers(search);

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 className="text-xl font-bold text-ink-900">Users</h2>
        <form className="flex gap-2" action="/admin/users">
          <input
            name="q"
            defaultValue={search ?? ""}
            className="input text-sm"
            placeholder="Search name or email"
          />
          <button type="submit" className="btn-secondary btn-sm">
            Search
          </button>
        </form>
      </div>

      <div className="card overflow-x-auto">
        <table className="table-base">
          <thead>
            <tr>
              <th>User</th>
              <th>Role</th>
              <th>Status</th>
              <th>Activity</th>
              <th>Joined</th>
              <th className="text-right">Actions</th>
            </tr>
          </thead>
          <tbody>
            {users.map((user) => (
              <tr key={user.id}>
                <td>
                  <div className="font-medium text-ink-900">{user.displayName}</div>
                  <div className="text-xs text-ink-400">{user.email}</div>
                  {user.phone ? <div className="text-xs text-ink-400">{user.phone}</div> : null}
                </td>
                <td>
                  <div className="space-y-1.5">
                    <RoleBadge role={user.role} />
                    <form action={setUserRoleAction} className="flex items-center gap-1">
                      <input type="hidden" name="userId" value={user.id} />
                      <select
                        name="role"
                        defaultValue={user.role}
                        className="rounded border border-ink-200 bg-white px-1.5 py-0.5 text-xs text-ink-700 font-medium"
                      >
                        <option value="CUSTOMER">Customer</option>
                        <option value="BUSINESS_OWNER">Owner</option>
                        <option value="MODERATOR">Moderator</option>
                        <option value="ADMIN">Admin</option>
                        <option value="LOGISTICS_PROVIDER">Logistics</option>
                      </select>
                      <button type="submit" className="rounded bg-ink-100 hover:bg-ink-200 px-1.5 py-0.5 text-xs text-ink-700 font-medium">
                        Save
                      </button>
                    </form>
                  </div>
                </td>
                <td>
                  <UserStatusBadge status={user.status} />
                </td>
                <td className="text-xs text-ink-600">
                  {user._count.businesses} businesses · {user._count.comments} comments · {user._count.reports} reports
                </td>
                <td className="text-xs text-ink-500">
                  {formatDate(user.createdAt)}
                  {user.lastLoginAt ? <div>last seen {formatDate(user.lastLoginAt)}</div> : null}
                </td>
                <td>
                  <div className="flex justify-end gap-2">
                    {user.status === "SUSPENDED" ? (
                      <form action={setUserStatusAction}>
                        <input type="hidden" name="userId" value={user.id} />
                        <input type="hidden" name="status" value="ACTIVE" />
                        <button type="submit" className="btn-secondary btn-sm">
                          Reinstate
                        </button>
                      </form>
                    ) : (
                      <form action={setUserStatusAction}>
                        <input type="hidden" name="userId" value={user.id} />
                        <input type="hidden" name="status" value="SUSPENDED" />
                        <button type="submit" className="btn-danger btn-sm">
                          Suspend
                        </button>
                      </form>
                    )}
                    <span className="sr-only">{humanizeEnum(user.status)}</span>
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

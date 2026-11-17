"use client";

import { useCallback, useEffect, useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { KeyRound, Pencil, Plus, Search, ShieldCheck, UserRound, Users } from "lucide-react";
import { ApiError } from "@/lib/api/client";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { Input } from "@/components/ui/Input";
import { PageHeader } from "@/components/ui/PageHeader";
import { deactivateUser, fetchUsers, updateUser } from "../api";
import type { ManagedUser } from "../types";

export function UsersView() {
  const router = useRouter();
  const [users, setUsers] = useState<ManagedUser[]>([]);
  const [search, setSearch] = useState("");
  const [role, setRole] = useState("teacher");
  const [status, setStatus] = useState("");
  const [page, setPage] = useState(1);
  const [lastPage, setLastPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [editing, setEditing] = useState<ManagedUser | null>(null);
  const [confirmingId, setConfirmingId] = useState<number | null>(null);
  const [form, setForm] = useState({ name: "", email: "", password: "", status: "active" });

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    const params = new URLSearchParams({ page: String(page), per_page: "10" });
    if (search.trim()) params.set("search", search.trim());
    if (role) params.set("role", role);
    if (status) params.set("status", status);
    try {
      const result = await fetchUsers(params);
      setUsers(result.data);
      setTotal(result.meta?.total ?? result.data.length);
      setLastPage(result.meta?.last_page ?? 1);
    } catch (caught) {
      setError(caught instanceof ApiError ? caught.message : "Could not load user accounts.");
    } finally {
      setLoading(false);
    }
  }, [page, role, search, status]);

  useEffect(() => { void load(); }, [load]);

  const startEdit = (user: ManagedUser) => {
    setEditing(user);
    setForm({ name: user.name, email: user.email, password: "", status: user.status });
    setMessage("");
  };

  const save = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!editing) return;
    setSaving(true);
    setError("");
    try {
      const payload = { name: form.name, email: form.email, status: form.status, ...(form.password ? { password: form.password } : {}) };
      const result = await updateUser(editing.id, payload);
      setUsers((current) => current.map((item) => item.id === editing.id ? result.data : item));
      setEditing(null);
      setMessage("Account updated successfully.");
    } catch (caught) {
      setError(caught instanceof ApiError ? caught.message : "Could not update this account.");
    } finally {
      setSaving(false);
    }
  };

  const disable = async (user: ManagedUser) => {
    setSaving(true);
    setError("");
    try {
      await deactivateUser(user.id);
      setUsers((current) => current.map((item) => item.id === user.id ? { ...item, status: "inactive" } : item));
      setMessage(`${user.name}'s account was deactivated.`);
      setConfirmingId(null);
    } catch (caught) {
      setError(caught instanceof ApiError ? caught.message : "Could not deactivate this account.");
    } finally {
      setSaving(false);
    }
  };

  const activeCount = users.filter((user) => user.status === "active").length;

  return <>
    <PageHeader title="Users & accounts" description="Manage login accounts and access status. Teacher accounts are created with their teacher profile." actions={<Button onClick={() => router.push("/teachers/create")}><Plus className="size-4" />Create teacher account</Button>} />
    <div className="mb-5 grid gap-3 sm:grid-cols-3">
      <Card className="flex min-h-24 items-center gap-4 p-5"><Users className="size-6 text-brand-600" /><div><p className="text-sm text-muted">Matching accounts</p><p className="font-display text-2xl font-bold">{total}</p></div></Card>
      <Card className="flex min-h-24 items-center gap-4 p-5"><UserRound className="size-6 text-success" /><div><p className="text-sm text-muted">Active on this page</p><p className="font-display text-2xl font-bold">{activeCount}</p></div></Card>
      <Card className="flex min-h-24 items-center gap-4 p-5"><ShieldCheck className="size-6 text-brand-600" /><div><p className="text-sm text-muted">Current role filter</p><p className="font-display text-lg font-bold capitalize">{role || "All roles"}</p></div></Card>
    </div>

    {message && <p role="status" className="mb-4 rounded-control bg-success-soft px-4 py-3 text-sm font-medium text-success">{message}</p>}
    {error && <div role="alert" className="mb-4 flex flex-wrap items-center justify-between gap-3 rounded-control bg-danger-soft px-4 py-3 text-sm text-danger"><span>{error}</span><Button variant="secondary" size="sm" onClick={() => void load()}>Try again</Button></div>}

    {editing && <Card className="mb-5 p-5 sm:p-6"><form onSubmit={save} className="grid gap-4 sm:grid-cols-2"><div className="sm:col-span-2"><h2 className="font-display text-lg font-bold">Manage account</h2><p className="mt-1 text-sm text-muted">Update sign-in details for {editing.name}.</p></div><Input aria-label="Account name" placeholder="Full name" value={form.name} onChange={(event) => setForm({ ...form, name: event.target.value })} required /><Input aria-label="Email address" type="email" placeholder="name@example.com" value={form.email} onChange={(event) => setForm({ ...form, email: event.target.value })} required /><div className="relative"><KeyRound className="absolute top-3.5 left-3 size-4 text-muted" /><Input aria-label="New password" type="password" autoComplete="new-password" placeholder="New password (leave blank to keep current)" value={form.password} onChange={(event) => setForm({ ...form, password: event.target.value })} className="pl-9" minLength={8} /></div><select aria-label="Account status" value={form.status} onChange={(event) => setForm({ ...form, status: event.target.value })} className="h-11 rounded-control border border-hairline bg-card px-3 text-sm text-ink"><option value="active">Active</option><option value="inactive">Inactive</option><option value="suspended">Suspended</option></select><div className="flex justify-end gap-2 sm:col-span-2"><Button type="button" variant="secondary" onClick={() => setEditing(null)}>Cancel</Button><Button type="submit" loading={saving}><Pencil className="size-4" />Save account</Button></div></form></Card>}

    <Card className="overflow-hidden">
      <div className="flex flex-col gap-3 border-b border-hairline p-4 md:flex-row"><div className="relative min-w-0 flex-1"><Search className="absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted" /><Input aria-label="Search accounts" placeholder="Search by name or email" value={search} onChange={(event) => { setSearch(event.target.value); setPage(1); }} className="pl-9" /></div><select aria-label="Filter by role" value={role} onChange={(event) => { setRole(event.target.value); setPage(1); }} className="h-11 rounded-control border border-hairline bg-card px-3 text-sm text-ink"><option value="">All roles</option><option value="teacher">Teachers</option><option value="admin">Administrators</option><option value="student">Students</option></select><select aria-label="Filter by status" value={status} onChange={(event) => { setStatus(event.target.value); setPage(1); }} className="h-11 rounded-control border border-hairline bg-card px-3 text-sm text-ink"><option value="">All statuses</option><option value="active">Active</option><option value="inactive">Inactive</option><option value="suspended">Suspended</option></select></div>
      <div className="overflow-x-auto"><table className="w-full min-w-[760px] text-left text-sm"><thead className="bg-canvas text-xs font-bold uppercase tracking-wide text-muted"><tr><th className="px-5 py-3">Account</th><th className="px-5 py-3">Role</th><th className="px-5 py-3">Status</th><th className="px-5 py-3">Created</th><th className="px-5 py-3 text-right">Actions</th></tr></thead><tbody className="divide-y divide-hairline">{loading ? <tr><td colSpan={5} className="px-5 py-12 text-center text-muted">Loading accounts…</td></tr> : users.length === 0 ? <tr><td colSpan={5} className="px-5 py-12 text-center text-muted">No accounts match these filters.</td></tr> : users.map((user) => <tr key={user.id} className="hover:bg-canvas/60"><td className="px-5 py-4"><p className="font-semibold">{user.name}</p><p className="mt-0.5 text-xs text-muted">{user.email}</p></td><td className="px-5 py-4 capitalize">{user.role}</td><td className="px-5 py-4"><Badge tone={user.status === "active" ? "success" : user.status === "suspended" ? "danger" : "neutral"}>{user.status}</Badge></td><td className="px-5 py-4 text-muted">{user.created_at.slice(0, 10)}</td><td className="px-5 py-4"><div className="flex justify-end gap-2">{confirmingId === user.id ? <><span className="self-center text-xs text-danger">Deactivate this account?</span><Button variant="secondary" size="sm" onClick={() => setConfirmingId(null)}>Cancel</Button><Button variant="danger" size="sm" disabled={saving} loading={saving} onClick={() => void disable(user)}>Confirm</Button></> : <><Button variant="secondary" size="sm" onClick={() => startEdit(user)}><Pencil className="size-4" />Manage</Button>{user.status === "active" && <Button variant="danger" size="sm" disabled={saving} onClick={() => setConfirmingId(user.id)}>Deactivate</Button>}</>}</div></td></tr>)}</tbody></table></div>
      <div className="flex items-center justify-between border-t border-hairline px-4 py-3 text-sm text-muted"><span>Page {page} of {lastPage} · {total} accounts</span><div className="flex gap-2"><Button variant="secondary" size="sm" disabled={page <= 1 || loading} onClick={() => setPage((value) => value - 1)}>Previous</Button><Button variant="secondary" size="sm" disabled={page >= lastPage || loading} onClick={() => setPage((value) => value + 1)}>Next</Button></div></div>
    </Card>
  </>;
}

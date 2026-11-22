
"use client";

import { useLocale } from "@/i18n/LocaleProvider";
import { useCallback, useEffect, useState } from "react";
import { Plus, Search } from "lucide-react";
import { apiFetch, ApiError } from "@/lib/api/client";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { Input } from "@/components/ui/Input";
import { PageHeader } from "@/components/ui/PageHeader";
import { StatusSwitch } from "@/components/ui/status";

type Department = {
  id: number;
  name: string;
  code: string;
};

type Program = {
  id: number;
  code: string;
  name: string;
  status: string;
  department?: Department;
};

type Result<T> = {
  data: T[];
  meta?: {
    current_page: number;
    last_page: number;
    total: number;
  };
};

export function ProgramsView() {
  const { t } = useLocale();
  const [items, setItems] = useState<Program[]>([]);
  const [departments, setDepartments] = useState<Department[]>([]);
  const [search, setSearch] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [updatingId, setUpdatingId] = useState<number | null>(null);

  const [form, setForm] = useState({
    department_id: 0,
    code: "",
    name: "",
    description: "",
  });

  const load = useCallback(async () => {
    try {
      const q = new URLSearchParams({ per_page: "100" });

      if (search.trim()) {
        q.set("search", search.trim());
      }

      const result = await apiFetch<Result<Program>>(
        `/api/v1/admin/programs?${q}`,
      );

      setItems(result.data);
      setError("");
    } catch (e) {
      setError(
        e instanceof ApiError
          ? e.message
          : "Could not load programs.",
      );
    }
  }, [search]);

  useEffect(() => {
    void load();
  }, [load]);

  useEffect(() => {
    apiFetch<Result<Department>>(
      "/api/v1/admin/departments?status=active&per_page=100",
    )
      .then((r) => setDepartments(r.data))
      .catch(() => setDepartments([]));
  }, []);

  async function create() {
    setBusy(true);
    setError("");

    try {
      await apiFetch("/api/v1/admin/programs", {
        method: "POST",
        body: form,
      });

      setForm({
        department_id: 0,
        code: "",
        name: "",
        description: "",
      });

      await load();
    } catch (e) {
      setError(
        e instanceof ApiError
          ? Object.values(e.errors).flat()[0] ?? e.message
          : "Could not create program.",
      );
    } finally {
      setBusy(false);
    }
  }

  async function toggleStatus(program: Program) {
    if (updatingId !== null) return;

    const nextStatus =
      program.status === "active" ? "inactive" : "active";

    setUpdatingId(program.id);
    setError("");

    try {
      await apiFetch(
        `/api/v1/admin/programs/${program.id}/status`,
        {
          method: "PATCH",
          body: { status: nextStatus },
        },
      );

      await load();
    } catch (e) {
      setError(
        e instanceof ApiError
          ? e.message
          : "Could not update program status.",
      );
    } finally {
      setUpdatingId(null);
    }
  }

  return (
    <>
      <PageHeader
        title="Programs"
        description="Manage academic programs linked to departments."
      />

      {/* Create Program */}
      <Card className="mb-5 grid gap-3 p-4 md:grid-cols-5">
        <select
          aria-label="Department"
          className="h-11 rounded-control border border-hairline bg-card px-3 text-sm"
          value={form.department_id || ""}
          onChange={(e) =>
            setForm((prev) => ({
              ...prev,
              department_id: Number(e.target.value),
            }))
          }
        >
          <option value="">Department</option>
          {departments.map((d) => (
            <option key={d.id} value={d.id}>
              {d.name}
            </option>
          ))}
        </select>

        <Input
          aria-label="Program code"
          placeholder="Program code"
          value={form.code}
          onChange={(e) =>
            setForm((prev) => ({
              ...prev,
              code: e.target.value.toUpperCase(),
            }))
          }
        />

        <Input
          aria-label="Program name"
          placeholder="Program name"
          value={form.name}
          onChange={(e) =>
            setForm((prev) => ({
              ...prev,
              name: e.target.value,
            }))
          }
        />

        <Input
          aria-label="Description"
          placeholder="Description (optional)"
          value={form.description}
          onChange={(e) =>
            setForm((prev) => ({
              ...prev,
              description: e.target.value,
            }))
          }
        />

        <Button
          disabled={
            busy ||
            !form.department_id ||
            !form.code.trim() ||
            !form.name.trim()
          }
          onClick={() => void create()}
        >
          <Plus className="size-4" />
          {busy ? "Creating..." : "Create program"}
        </Button>
      </Card>

      {/* Programs Table */}
      <Card className="overflow-hidden">
        <div className="border-b border-hairline p-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted" />

            <Input
              className="pl-9"
              placeholder="Search programs..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
        </div>

        {error && (
          <p
            role="alert"
            className="m-4 rounded-control bg-danger-soft p-3 text-sm text-danger"
          >
            {error}
          </p>
        )}

        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="bg-canvas-subtle text-xs uppercase text-muted">
              <tr>
                <th className="p-4">{t("Code")}</th>
                <th className="p-4">{t("Program")}</th>
                <th className="p-4">{t("Department")}</th>
                <th className="p-4">{t("Status")}</th>
              </tr>
            </thead>

            <tbody>
              {items.map((item) => {
                const isActive = item.status === "active";
                const isUpdating = updatingId === item.id;

                return (
                  <tr
                    key={item.id}
                    className="border-t border-hairline transition-colors hover:bg-canvas-subtle"
                  >
                    {/* Code Badge */}
                    <td className="p-4">
                      <span className="inline-flex rounded-full bg-blue-50 px-3 py-1 text-xs font-semibold text-blue-700">
                        {item.code}
                      </span>
                    </td>

                    {/* Program Name */}
                    <td className="p-4 font-medium">
                      {item.name}
                    </td>

                    {/* Department Badge */}
                    <td className="p-4">
                      <span className="inline-flex rounded-full border border-hairline bg-canvas-subtle px-3 py-1 text-xs font-medium">
                        {item.department?.name ?? "Unassigned"}
                      </span>
                    </td>

                    {/* Status Toggle */}
                    <td className="p-4">
                      <StatusSwitch checked={isActive} loading={isUpdating} disabled={updatingId !== null} accessibleLabel={item.name} onToggle={() => void toggleStatus(item)} />
                    </td>
                  </tr>
                );
              })}

              {items.length === 0 && (
                <tr>
                  <td
                    colSpan={4}
                    className="p-8 text-center text-muted"
                  >
                    No programs found.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </Card>
    </>
  );
}

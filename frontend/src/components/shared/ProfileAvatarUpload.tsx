"use client";

import { useEffect, useRef, useState } from "react";
import { Camera, Trash2, UserRound } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { getToken } from "@/lib/api/session";
import { getInitials } from "@/lib/utils/name";
import { useLocale } from "@/i18n/LocaleProvider";

type Props = { name: string; avatarUrl?: string | null; onChange: (url: string | null) => void };
export function ProfileAvatarUpload({ name, avatarUrl, onChange }: Props) {
  const { t } = useLocale();
  const input = useRef<HTMLInputElement>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [loadedUrl, setLoadedUrl] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!avatarUrl) { setLoadedUrl(null); return; }
    let objectUrl = "";
    let active = true;
    const token = getToken();
    fetch(avatarUrl, { headers: token ? { Authorization: `Bearer ${token}` } : {} })
      .then((response) => { if (!response.ok) throw new Error("Avatar unavailable"); return response.blob(); })
      .then((blob) => { if (active) { objectUrl = URL.createObjectURL(blob); setLoadedUrl(objectUrl); } })
      .catch(() => { if (active) setLoadedUrl(null); });
    return () => { active = false; if (objectUrl) URL.revokeObjectURL(objectUrl); };
  }, [avatarUrl]);

  async function upload(file?: File) {
    if (!file) return;
    setError("");
    if (!/^image\/(jpeg|png|webp)$/.test(file.type)) { setError(t("Choose a JPG, PNG, or WebP image.")); return; }
    if (file.size > 2 * 1024 * 1024) { setError(t("Image must be 2 MB or smaller.")); return; }
    const localPreview = URL.createObjectURL(file);
    setPreview(localPreview);
    setBusy(true);
    try {
      const body = new FormData(); body.append("image", file);
      const response = await fetch("/api/v1/profile/avatar", { method: "POST", headers: { Accept: "application/json", ...(getToken() ? { Authorization: `Bearer ${getToken()}` } : {}) }, body });
      const result = await response.json();
      if (!response.ok) throw new Error(result.message ?? t("Could not upload profile photo."));
      onChange(result.data.avatar_url);
    } catch (caught) { setError(caught instanceof Error ? caught.message : t("Could not upload profile photo.")); }
    finally { URL.revokeObjectURL(localPreview); setPreview(null); setBusy(false); if (input.current) input.current.value = ""; }
  }

  async function remove() {
    setError(""); setBusy(true);
    try {
      const response = await fetch("/api/v1/profile/avatar", { method: "DELETE", headers: { Accept: "application/json", ...(getToken() ? { Authorization: `Bearer ${getToken()}` } : {}) } });
      if (!response.ok) { const result = await response.json().catch(() => ({})); throw new Error(result.message ?? t("Could not remove profile photo.")); }
      onChange(null);
    } catch (caught) { setError(caught instanceof Error ? caught.message : t("Could not remove profile photo.")); }
    finally { setBusy(false); }
  }

  return <div className="flex flex-wrap items-center gap-4">
    <div className="flex size-20 items-center justify-center overflow-hidden rounded-full bg-brand-50 text-xl font-bold text-brand-700 dark:bg-brand-500/15 dark:text-brand-300">
      {(preview || loadedUrl) ? <img src={preview ?? loadedUrl ?? ""} alt={t("Profile photo") + `: ${name}`} className="size-full object-cover" /> : <span aria-label={t("Default avatar")}>{getInitials(name) || <UserRound />}</span>}
    </div>
    <div className="space-y-2"><div className="flex flex-wrap gap-2">
      <input ref={input} type="file" accept="image/jpeg,image/png,image/webp" className="sr-only" aria-label={t("Choose profile photo")} onChange={(event) => void upload(event.target.files?.[0])} />
      <Button type="button" size="sm" variant="secondary" loading={busy} onClick={() => input.current?.click()}><Camera className="size-4" />{avatarUrl ? t("Change photo") : t("Upload photo")}</Button>
      {avatarUrl && <Button type="button" size="sm" variant="ghost" disabled={busy} onClick={() => void remove()}><Trash2 className="size-4" />{t("Remove photo")}</Button>}
    </div><p className="text-xs text-muted">{t("JPG, PNG, or WebP · up to 2 MB")}</p>{error && <p role="alert" className="text-xs text-danger">{error}</p>}</div>
  </div>;
}

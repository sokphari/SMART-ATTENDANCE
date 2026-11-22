"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import {
  ArrowLeft, ArrowRight, Building2, Check, CheckCircle2, ChevronDown, ChevronRight,
  DoorOpen, Layers3, MapPin, Plus, Search, Trash2, Users, X,
} from "lucide-react";
import { apiFetch, ApiError } from "@/lib/api/client";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { Input } from "@/components/ui/Input";
import { PageHeader } from "@/components/ui/PageHeader";
import { Breadcrumb, type BreadcrumbItem } from "@/components/ui/Breadcrumb";
import { StatusBadge } from "@/components/ui/status";
import { useLocale } from "@/i18n/LocaleProvider";

type Building = {
  id: number;
  code: string;
  name: string;
  description?: string | null;
  status?: string;
  floors_count?: number;
  classrooms_count?: number;
  total_seats?: number;
};

type Floor = {
  id: number;
  building_id: number;
  name: string;
  floor_number: number | null;
  classrooms_count?: number;
};

type Room = {
  id: number;
  room_code: string;
  capacity: number;
  room_type: string;
  latitude: number | null;
  longitude: number | null;
  status: string;
};

type RoomDraft = {
  key: number;
  room_code: string;
  capacity: string;
  room_type: "classroom" | "laboratory" | "lecture_hall";
  latitude: string;
  longitude: string;
  allowed_radius_meters: string;
  advanced: boolean;
};

type FloorDraft = {
  key: number;
  name: string;
  floor_number: string;
  rooms: RoomDraft[];
};

type SetupResult = {
  data: {
    id: number;
    code: string;
    name: string;
    floors_count: number;
    classrooms_count: number;
    total_seats: number;
  };
};

type Result<T> = { data: T[] };

const steps = [
  { label: "Building", icon: Building2 },
  { label: "Floors", icon: Layers3 },
  { label: "Classrooms", icon: DoorOpen },
  { label: "Review & Save", icon: CheckCircle2 },
] as const;

const labelStyle = "mb-1 block text-xs font-semibold text-muted";
const selectStyle =
  "h-9 w-full rounded-control border border-hairline bg-card px-3 text-sm text-ink outline-none focus-visible:border-brand-500 focus-visible:ring-2 focus-visible:ring-brand-100";
const roomTypes: RoomDraft["room_type"][] = ["classroom", "laboratory", "lecture_hall"];
const roomTypeLabel = (type: string) =>
  ({ classroom: "Classroom", laboratory: "Laboratory", lecture_hall: "Lecture hall" })[type] ?? type;

function errorMessage(error: unknown, fallback: string): string {
  if (error instanceof ApiError) {
    return Object.values(error.errors ?? {}).flat()[0] ?? error.message;
  }
  return fallback;
}

export function BuildingsView() {
  const { t, locale } = useLocale();
  const nextKey = useRef(1);
  const [buildings, setBuildings] = useState<Building[]>([]);
  const [selectedBuildingId, setSelectedBuildingId] = useState(0);
  const [selectedFloorId, setSelectedFloorId] = useState(0);
  const [floors, setFloors] = useState<Floor[]>([]);
  const [rooms, setRooms] = useState<Room[]>([]);
  const [search, setSearch] = useState("");
  const [showDetails, setShowDetails] = useState(false);
  const [loading, setLoading] = useState(true);
  const [browseError, setBrowseError] = useState("");

  const [wizardOpen, setWizardOpen] = useState(false);
  const [showDescription, setShowDescription] = useState(false);
  const [step, setStep] = useState(1);
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState("");
  const [buildingForm, setBuildingForm] = useState({
    code: "", name: "", description: "",
  });
  const [draftFloors, setDraftFloors] = useState<FloorDraft[]>([]);
  const [created, setCreated] = useState<SetupResult["data"] | null>(null);

  const loadBuildings = useCallback(async () => {
    try {
      const response = await apiFetch<Result<Building>>(
        "/api/v1/admin/buildings?per_page=100",
      );
      setBuildings(response.data);
      setSelectedBuildingId((current) =>
        response.data.some((building) => building.id === current)
          ? current
          : (response.data[0]?.id ?? 0),
      );
      setBrowseError("");
    } catch (error) {
      setBrowseError(errorMessage(error, "Could not load buildings."));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadBuildings();
  }, [loadBuildings]);

  useEffect(() => {
    let current = true;
    if (!selectedBuildingId) {
      setFloors([]);
      setSelectedFloorId(0);
      return;
    }

    void apiFetch<Result<Floor>>(
      `/api/v1/admin/buildings/${selectedBuildingId}/floors?per_page=100`,
    ).then((response) => {
      if (!current) return;
      setFloors(response.data);
      setSelectedFloorId((id) =>
        response.data.some((floor) => floor.id === id)
          ? id
          : (response.data[0]?.id ?? 0),
      );
    }).catch((error) => {
      if (current) {
        setFloors([]);
        setSelectedFloorId(0);
        setBrowseError(errorMessage(error, "Could not load floors."));
      }
    });

    return () => { current = false; };
  }, [selectedBuildingId]);

  useEffect(() => {
    let current = true;
    if (!selectedFloorId) {
      setRooms([]);
      return;
    }
    setRooms([]);
    void apiFetch<Result<Room>>(
      `/api/v1/admin/classrooms?floor_id=${selectedFloorId}&per_page=100`,
    ).then((response) => {
      if (current) setRooms(response.data);
    }).catch((error) => {
      if (current) setBrowseError(errorMessage(error, "Could not load classrooms."));
    });
    return () => { current = false; };
  }, [selectedFloorId]);

  function makeRoom(): RoomDraft {
    return {
      key: nextKey.current++,
      room_code: "",
      capacity: "35",
      room_type: "classroom",
      latitude: "",
      longitude: "",
      allowed_radius_meters: "100",
      advanced: false,
    };
  }

  function makeFloor(number: number): FloorDraft {
    return {
      key: nextKey.current++,
      name: number === 0 ? "Ground Floor" : `Floor ${number}`,
      floor_number: String(number),
      rooms: [],
    };
  }

  function openWizard() {
    setBuildingForm({ code: "", name: "", description: "" });
    setShowDescription(false);
    setDraftFloors([makeFloor(0)]);
    setFormError("");
    setCreated(null);
    setStep(1);
    setShowDetails(false);
    setWizardOpen(true);
  }

  function closeWizard() {
    if (saving) return;
    setWizardOpen(false);
    setFormError("");
  }

  function updateFloor(key: number, changes: Partial<FloorDraft>) {
    setDraftFloors((previous) => previous.map((floor) =>
      floor.key === key ? { ...floor, ...changes } : floor,
    ));
    setFormError("");
  }

  function updateRoom(floorKey: number, roomKey: number, changes: Partial<RoomDraft>) {
    setDraftFloors((previous) => previous.map((floor) =>
      floor.key === floorKey
        ? {
            ...floor,
            rooms: floor.rooms.map((room) =>
              room.key === roomKey ? { ...room, ...changes } : room,
            ),
          }
        : floor,
    ));
    setFormError("");
  }

  function validate(currentStep: number): string {
    if (currentStep === 1) {
      if (!buildingForm.code.trim() || !buildingForm.name.trim()) {
        return "Enter a building code and name.";
      }
      if (buildingForm.code.length > 30 || buildingForm.name.length > 150) {
        return "Building code or name is too long.";
      }
    }
    if (currentStep === 2) {
      if (!draftFloors.length) return "Add at least one floor.";
      const names = new Set<string>();
      const numbers = new Set<string>();
      for (const floor of draftFloors) {
        const number = Number(floor.floor_number);
        if (!floor.name.trim() || !Number.isInteger(number) ||
          floor.floor_number.trim() === "" || number < -2 || number > 200) {
          return "Every floor needs a name and a valid number (-2 to 200).";
        }
        const name = floor.name.trim().toLowerCase();
        if (names.has(name) || numbers.has(String(number))) {
          return "Floor names and floor numbers must be unique within the building.";
        }
        names.add(name);
        numbers.add(String(number));
      }
    }
    if (currentStep === 3) {
      const codes = new Set<string>();
      for (const floor of draftFloors) {
        if (!floor.rooms.length) {
          return `Add at least one classroom to ${floor.name}.`;
        }
        for (const room of floor.rooms) {
          const code = room.room_code.trim().toUpperCase();
          const seats = Number(room.capacity);
          if (!code || code.length > 50) return "Enter a room code (up to 50 characters).";
          if (codes.has(code)) return `Room code ${code} is used more than once.`;
          codes.add(code);
          if (!Number.isInteger(seats) || seats < 1 || seats > 2000) {
            return `Enter a capacity between 1 and 2000 for ${code}.`;
          }
          const lat = room.latitude.trim();
          const lng = room.longitude.trim();
          if (Boolean(lat) !== Boolean(lng)) {
            return `Enter both GPS coordinates for ${code}, or leave both empty.`;
          }
          if (lat && (!Number.isFinite(Number(lat)) || Number(lat) < -90 || Number(lat) > 90 ||
            !Number.isFinite(Number(lng)) || Number(lng) < -180 || Number(lng) > 180)) {
            return `Invalid GPS coordinates for ${code}.`;
          }
          const radius = Number(room.allowed_radius_meters);
          if (!Number.isInteger(radius) || radius < 10 || radius > 1000) {
            return `GPS radius must be between 10 and 1000 meters for ${code}.`;
          }
        }
      }
    }
    return "";
  }

  function goNext() {
    const message = validate(step);
    setFormError(message);
    if (!message) setStep((value) => Math.min(value + 1, 4));
  }

  async function saveBuilding() {
    if (saving) return;
    for (const candidate of [1, 2, 3]) {
      const message = validate(candidate);
      if (message) {
        setFormError(message);
        setStep(candidate);
        return;
      }
    }
    setSaving(true);
    setFormError("");
    try {
      const payload = {
        building: {
          code: buildingForm.code.trim().toUpperCase(),
          name: buildingForm.name.trim(),
          description: buildingForm.description.trim() || null,
        },
        floors: draftFloors.map((floor) => ({
          name: floor.name.trim(),
          floor_number: Number(floor.floor_number),
          rooms: floor.rooms.map((room) => ({
            room_code: room.room_code.trim().toUpperCase(),
            capacity: Number(room.capacity),
            room_type: room.room_type,
            latitude: room.latitude.trim() ? Number(room.latitude) : null,
            longitude: room.longitude.trim() ? Number(room.longitude) : null,
            allowed_radius_meters: Number(room.allowed_radius_meters),
          })),
        })),
      };
      const response = await apiFetch<SetupResult>("/api/v1/admin/buildings/setup", {
        method: "POST",
        body: payload,
      });
      setCreated(response.data);
      setSelectedBuildingId(response.data.id);
      setSelectedFloorId(0);
      setStep(5);
      await loadBuildings();
    } catch (error) {
      setFormError(errorMessage(error, "Could not create the building. No partial setup was saved."));
    } finally {
      setSaving(false);
    }
  }

  const totalRooms = draftFloors.reduce((sum, floor) => sum + floor.rooms.length, 0);
  const totalSeats = draftFloors.reduce(
    (sum, floor) => sum + floor.rooms.reduce((seats, room) => seats + (Number(room.capacity) || 0), 0),
    0,
  );
  const visibleBuildings = buildings.filter((building) =>
    `${building.name} ${building.code}`.toLowerCase().includes(search.toLowerCase()),
  );
  const selectedBuilding = buildings.find((building) => building.id === selectedBuildingId);
  const totalClassrooms = buildings.reduce((sum, building) => sum + (building.classrooms_count ?? 0), 0);
  const totalBuildingSeats = buildings.reduce((sum, building) => sum + (building.total_seats ?? 0), 0);
  const breadcrumbItems: BreadcrumbItem[] = [
    { label: "Dashboard", href: "/dashboard" },
    wizardOpen
      ? { label: "Buildings & Rooms", onClick: closeWizard, disabled: saving }
      : { label: "Buildings & Rooms" },
    ...(wizardOpen
      ? [
          {
            label: "Create Building",
            ...(step > 1 && step < 5 ? { onClick: () => { setStep(1); setFormError(""); } } : {}),
          },
          ...(step > 1
            ? [{
                label: step === 5 ? "Success" : steps[step - 1].label,
              }]
            : []),
        ]
      : []),
  ];

  return (
    <>
      <Breadcrumb items={breadcrumbItems.map((item) => ({ ...item, label: t(item.label) }))} />
      <PageHeader
        title={t("Buildings & Rooms")}
        description="Manage campus buildings, floors, and classrooms in one place."
      />

      <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
        <p className="text-sm text-muted">{t("Organize classrooms by building and floor. GPS is optional for rooms.")}</p>
        <Button variant={wizardOpen ? "secondary" : "primary"} disabled={saving}
          onClick={wizardOpen ? closeWizard : openWizard}>
          {wizardOpen ? <ArrowLeft className="size-4" /> : <Plus className="size-4" />}
          {wizardOpen ? "Back to Buildings" : "Create Building"}
        </Button>
      </div>

      {browseError && (
        <p role="alert" className="mb-4 rounded-control bg-danger-soft p-3 text-sm text-danger">
          {browseError}
        </p>
      )}

      {wizardOpen && (
        <Card className="mb-4 w-full overflow-hidden">
          <div className="flex items-start justify-between gap-4 border-b border-hairline bg-canvas-subtle px-5 py-4 sm:px-6">
            <div className="flex min-w-0 items-start gap-3">
              <span className="flex size-10 shrink-0 items-center justify-center rounded-control bg-brand-50 text-brand-600 dark:bg-brand-950/60 dark:text-brand-300">
                {step === 5 ? <CheckCircle2 className="size-5" /> : <Building2 className="size-5" />}
              </span>
              <div>
                <h2 className="text-lg font-bold">
                  {step === 5 ? "Building created" : step === 1 ? "Create a new building" : steps[step - 1]?.label}
                </h2>
                <p className="mt-0.5 text-sm text-muted">
                  {step === 5 ? "Your building and classrooms are ready." : `Step ${step} of 4 · ${step === 1 ? "Start with the building identity, then add floors and classrooms." : "Complete this step to continue through the setup."}`}
                </p>
              </div>
            </div>
            {step < 5 && <Button variant="secondary" size="icon" aria-label={t("Close wizard")} onClick={closeWizard} disabled={saving}>
              <X className="size-4" />
            </Button>}
          </div>

          {step < 5 && (
            <ol aria-label={t("Building setup progress")} className="grid grid-cols-2 gap-2 border-b border-hairline px-5 py-4 sm:grid-cols-4 sm:px-6">
              {steps.map((item, index) => {
                const current = index + 1;
                const Icon = item.icon;
                return (
                  <li key={item.label} className="min-w-0">
                    <button
                      type="button"
                      disabled={current > step || saving}
                      onClick={() => { setStep(current); setFormError(""); }}
                      aria-current={current === step ? "step" : undefined}
                      className={`flex min-h-12 w-full items-center gap-2 rounded-control border px-3 py-2 text-left transition-colors disabled:cursor-not-allowed disabled:opacity-55 ${current === step ? "border-brand-400 bg-brand-50 dark:bg-brand-950/60" : current < step ? "border-success/30 bg-success-soft" : "border-hairline bg-card"}`}
                    >
                      <span className={`flex size-8 shrink-0 items-center justify-center rounded-full border text-xs font-bold transition-colors ${
                        current < step
                          ? "border-emerald-500 bg-emerald-500 text-white"
                          : current === step
                            ? "border-brand-600 bg-brand-600 text-white"
                            : "border-hairline bg-canvas text-muted"
                      }`}>
                        {current < step ? <Check className="size-3.5" /> : <Icon className="size-3.5" />}
                      </span>
                      <span className={`text-xs font-semibold ${current === step ? "text-ink" : "text-muted"}`}>{item.label}</span>
                    </button>
                  </li>
                );
              })}
            </ol>
          )}

          <div className="space-y-5 p-5 sm:p-6">
            {step === 1 && (
              <div className="grid gap-6 lg:grid-cols-[minmax(0,1.2fr)_minmax(16rem,0.8fr)]">
                <section className="space-y-5">
                  <div>
                    <h3 className="font-display text-base font-bold">{t("Building details")}</h3>
                    <p className="mt-1 text-sm text-muted">{t("Choose a short code and a name staff can recognize.")}</p>
                  </div>
                  <div className="grid gap-4 sm:grid-cols-2">
                    <div>
                      <label htmlFor="setup-building-code" className={labelStyle}>{t("Building code *")}</label>
                      <Input className="h-11" id="setup-building-code" maxLength={30} placeholder={t("e.g. A1")} autoComplete="off" value={buildingForm.code}
                        onChange={(event) => {
                          setBuildingForm((value) => ({ ...value, code: event.target.value.toUpperCase() }));
                          setFormError("");
                        }} />
                      <p className="mt-1.5 text-xs text-muted">{t("Short, unique, and easy to identify.")}</p>
                    </div>
                    <div>
                      <label htmlFor="setup-building-name" className={labelStyle}>{t("Building name *")}</label>
                      <Input className="h-11" id="setup-building-name" maxLength={150} placeholder={t("e.g. Main Campus Building A")} value={buildingForm.name}
                        onChange={(event) => {
                          setBuildingForm((value) => ({ ...value, name: event.target.value }));
                          setFormError("");
                        }} />
                      <p className="mt-1.5 text-xs text-muted">{t("This name appears throughout room and class setup.")}</p>
                    </div>
                  </div>
                  <div>
                    <button type="button" aria-expanded={showDescription} aria-controls="setup-description-panel"
                      className="flex items-center gap-1.5 text-sm font-semibold text-brand-700 hover:underline"
                      onClick={() => setShowDescription((value) => !value)}>
                      <ChevronDown className={`size-4 transition-transform ${showDescription ? "rotate-180" : ""}`} />
                      {showDescription ? "Hide description" : "Add description (optional)"}
                    </button>
                    {showDescription && (
                      <div id="setup-description-panel" className="mt-3">
                        <label htmlFor="setup-building-description" className={labelStyle}>{t("Description (optional)")}</label>
                        <textarea id="setup-building-description" rows={3} maxLength={5000}
                          className={`${selectStyle} h-auto min-h-24 py-2`}
                          placeholder={t("Where is this building located?")}
                          value={buildingForm.description}
                          onChange={(event) => setBuildingForm((value) => ({ ...value, description: event.target.value }))} />
                      </div>
                    )}
                  </div>
                </section>
                <aside className="rounded-panel border border-brand-200 bg-gradient-to-br from-brand-50 to-card p-5 dark:border-brand-700/60 dark:from-brand-950/70 dark:to-card">
                  <div className="flex size-12 items-center justify-center rounded-panel bg-brand-600 text-white shadow-soft"><Building2 className="size-6" /></div>
                  <p className="mt-5 text-xs font-bold uppercase tracking-wide text-muted">{t("Building preview")}</p>
                  <h3 className="mt-1 break-words font-display text-xl font-bold">{buildingForm.name.trim() || "Your building name"}</h3>
                  <span className="mt-3 inline-flex rounded-pill border border-brand-200 bg-card px-3 py-1 font-mono text-sm font-bold text-brand-700 dark:border-brand-400/40 dark:bg-brand-900/50 dark:text-brand-200">
                    {buildingForm.code.trim().toUpperCase() || "CODE"}
                  </span>
                  <div className="mt-5 border-t border-brand-200/70 pt-4 text-sm text-muted dark:border-brand-700/60">
                    <p className="font-semibold text-ink">{t("What happens next?")}</p>
                    <p className="mt-1">{t("Add floors, then add classrooms and their seating capacity. GPS coordinates are optional.")}</p>
                  </div>
                </aside>
              </div>
            )}

            {step === 2 && (
              <div className="space-y-3">
                <p className="text-xs text-muted">{t("Add floors for")}<strong className="text-ink">{buildingForm.name}</strong>. Use 0 for ground floor.
                </p>
                {draftFloors.map((floor, index) => (
                  <div key={floor.key} className="grid gap-2 rounded-control border border-hairline p-3 sm:grid-cols-[1fr_100px_auto] sm:items-end">
                    <div>
                      <label htmlFor={`floor-name-${floor.key}`} className={labelStyle}>{t("Floor name *")}</label>
                      <Input className="h-9" id={`floor-name-${floor.key}`} value={floor.name}
                        onChange={(event) => updateFloor(floor.key, { name: event.target.value })} />
                    </div>
                    <div>
                      <label htmlFor={`floor-number-${floor.key}`} className={labelStyle}>{t("Number *")}</label>
                      <Input className="h-9" id={`floor-number-${floor.key}`} type="number" min={-2} max={200} value={floor.floor_number}
                        onChange={(event) => updateFloor(floor.key, { floor_number: event.target.value })} />
                    </div>
                    <Button variant="secondary" size="icon" aria-label={`Remove floor ${index + 1}`}
                      onClick={() => { setDraftFloors((value) => value.filter((item) => item.key !== floor.key)); setFormError(""); }}>
                      <Trash2 className="size-4" />
                    </Button>
                  </div>
                ))}
                <Button variant="secondary" onClick={() => {
                  const used = new Set(draftFloors.map((floor) => Number(floor.floor_number)));
                  let next = 0;
                  while (used.has(next)) next++;
                  setDraftFloors((value) => [...value, makeFloor(next)]);
                }}>
                  <Plus className="size-4" />{t("Add another floor")}</Button>
              </div>
            )}

            {step === 3 && (
              <div className="space-y-3">
                <p className="text-xs text-muted">{t("Add one or more rooms to each floor. Coordinates are only needed for GPS-based attendance.")}</p>
                {draftFloors.map((floor) => (
                  <section key={floor.key} className="overflow-hidden rounded-card border border-hairline">
                    <div className="flex items-center justify-between bg-canvas-subtle px-3 py-2">
                      <h3 className="font-semibold">{floor.name}</h3>
                      <span className="rounded-full bg-brand-50 px-2.5 py-1 text-xs font-semibold text-brand-700">
                        {floor.rooms.length} {floor.rooms.length === 1 ? "room" : "rooms"}
                      </span>
                    </div>
                    <div className="space-y-2 p-3">
                      {floor.rooms.map((room) => (
                        <div key={room.key} className="rounded-control border border-hairline p-2.5">
                          <div className="grid gap-2 sm:grid-cols-[1.3fr_0.8fr_1fr_auto] sm:items-end">
                            <div>
                              <label htmlFor={`room-code-${room.key}`} className={labelStyle}>{t("Room code *")}</label>
                              <Input className="h-9" id={`room-code-${room.key}`} maxLength={50} placeholder={t("A-101")} value={room.room_code}
                                onChange={(event) => updateRoom(floor.key, room.key, { room_code: event.target.value.toUpperCase() })} />
                            </div>
                            <div>
                              <label htmlFor={`room-seats-${room.key}`} className={labelStyle}>{t("Seats *")}</label>
                              <Input className="h-9" id={`room-seats-${room.key}`} type="number" min={1} max={2000} value={room.capacity}
                                onChange={(event) => updateRoom(floor.key, room.key, { capacity: event.target.value })} />
                            </div>
                            <div>
                              <label htmlFor={`room-type-${room.key}`} className={labelStyle}>{t("Type *")}</label>
                              <select id={`room-type-${room.key}`} className={selectStyle} value={room.room_type}
                                onChange={(event) => updateRoom(floor.key, room.key, { room_type: event.target.value as RoomDraft["room_type"] })}>
                                {roomTypes.map((type) => <option key={type} value={type}>{roomTypeLabel(type)}</option>)}
                              </select>
                            </div>
                            <Button variant="secondary" size="icon" aria-label={`Remove room ${room.room_code || room.key}`}
                              onClick={() => updateFloor(floor.key, { rooms: floor.rooms.filter((item) => item.key !== room.key) })}>
                              <Trash2 className="size-4" />
                            </Button>
                          </div>
                          <button type="button" className="mt-3 flex items-center gap-2 text-xs font-semibold text-brand-700"
                            aria-expanded={room.advanced}
                            onClick={() => updateRoom(floor.key, room.key, { advanced: !room.advanced })}>
                            <MapPin className="size-3.5" />{t("GPS / Advanced settings (optional)")}<ChevronDown className={`size-3.5 transition-transform ${room.advanced ? "rotate-180" : ""}`} />
                          </button>
                          {room.advanced && (
                            <div className="mt-3 grid gap-3 rounded-control bg-canvas p-3 sm:grid-cols-3">
                              <div>
                                <label htmlFor={`room-lat-${room.key}`} className={labelStyle}>{t("Latitude")}</label>
                                <Input id={`room-lat-${room.key}`} type="number" step="any" placeholder={t("11.5564")} value={room.latitude}
                                  onChange={(event) => updateRoom(floor.key, room.key, { latitude: event.target.value })} />
                              </div>
                              <div>
                                <label htmlFor={`room-lng-${room.key}`} className={labelStyle}>{t("Longitude")}</label>
                                <Input id={`room-lng-${room.key}`} type="number" step="any" placeholder={t("104.9282")} value={room.longitude}
                                  onChange={(event) => updateRoom(floor.key, room.key, { longitude: event.target.value })} />
                              </div>
                              <div>
                                <label htmlFor={`room-radius-${room.key}`} className={labelStyle}>{t("Radius (meters)")}</label>
                                <Input id={`room-radius-${room.key}`} type="number" min={10} max={1000} value={room.allowed_radius_meters}
                                  onChange={(event) => updateRoom(floor.key, room.key, { allowed_radius_meters: event.target.value })} />
                              </div>
                            </div>
                          )}
                        </div>
                      ))}
                      <Button variant="secondary" size="sm" onClick={() => updateFloor(floor.key, { rooms: [...floor.rooms, makeRoom()] })}>
                        <Plus className="size-4" /> Add Room to {floor.name}
                      </Button>
                    </div>
                  </section>
                ))}
              </div>
            )}

            {step === 4 && (
              <div className="space-y-3">
                <div className="flex flex-wrap items-center gap-2 rounded-card bg-brand-50 p-3">
                  <Building2 className="size-7 text-brand-700" />
                  <div className="min-w-0 flex-1">
                    <h3 className="font-bold">{buildingForm.name}</h3>
                    <p className="text-sm text-muted">{buildingForm.code.toUpperCase()}</p>
                    {buildingForm.description && <p className="mt-1 text-xs text-muted">{buildingForm.description}</p>}
                  </div>
                </div>
                <div className="grid grid-cols-3 gap-3">
                  {[
                    { label: "Floors", count: draftFloors.length, icon: Layers3 },
                    { label: "Rooms", count: totalRooms, icon: DoorOpen },
                    { label: "Total seats", count: totalSeats, icon: Users },
                  ].map((stat) => (
                    <div key={stat.label} className="rounded-control border border-hairline p-2 text-center">
                      <stat.icon className="mx-auto mb-2 size-4 text-brand-600" />
                      <p className="text-xl font-bold">{stat.count}</p>
                      <p className="text-xs text-muted">{stat.label}</p>
                    </div>
                  ))}
                </div>
                {draftFloors.map((floor) => (
                  <div key={floor.key} className="overflow-hidden rounded-control border border-hairline">
                    <div className="flex items-center justify-between border-b border-hairline bg-canvas-subtle px-3 py-2">
                      <span className="font-semibold">{floor.name}</span>
                      <span className="text-xs text-muted">{floor.rooms.length} rooms</span>
                    </div>
                    <div className="divide-y divide-hairline px-3">
                      {floor.rooms.map((room) => (
                        <div key={room.key} className="flex flex-wrap items-center justify-between gap-2 py-2 text-sm">
                          <span className="font-semibold">{room.room_code.toUpperCase()}</span>
                          <span className="text-muted">{roomTypeLabel(room.room_type)} · {room.capacity} seats</span>
                          <span className="flex items-center gap-1 text-xs text-muted">
                            <MapPin className="size-3" />
                            {room.latitude && room.longitude ? "GPS set" : "No GPS"}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
                <p className="text-xs text-muted">{t("Nothing is saved until you click Create Building.")}</p>
              </div>
            )}

            {step === 5 && created && (
              <div className="flex flex-col items-center gap-4 py-6 text-center">
                <CheckCircle2 className="size-14 text-emerald-500" />
                <div>
                  <h3 className="text-xl font-bold">{created.name} created successfully!</h3>
                  <p className="mt-1 text-sm text-muted">Building code: {created.code}</p>
                </div>
                <p className="text-sm text-muted">
                  {created.floors_count} floors · {created.classrooms_count} rooms · {created.total_seats} seats
                </p>
                <div className="flex flex-wrap justify-center gap-3">
                  <Button variant="secondary" onClick={() => { closeWizard(); setShowDetails(true); }}>{t("View Building")}</Button>
                  <Button onClick={openWizard}><Plus className="size-4" />{t("Create Another")}</Button>
                </div>
              </div>
            )}

            {formError && (
              <p role="alert" className="rounded-control bg-danger-soft p-3 text-sm text-danger">
                {formError}
              </p>
            )}
          </div>

          {step < 5 && (
            <div className="flex flex-wrap items-center justify-between gap-3 border-t border-hairline px-5 py-4 sm:px-6">
              <Button variant="secondary" disabled={step === 1 || saving} onClick={() => { setStep((value) => value - 1); setFormError(""); }}>
                <ArrowLeft className="size-4" />{t("Back")}</Button>
              {step === 4 ? (
                <Button loading={saving} disabled={saving} onClick={() => void saveBuilding()}>
                  <Check className="size-4" /> {saving ? "Creating..." : "Create Building"}
                </Button>
              ) : (
                <Button onClick={goNext}>{t("Continue")}<ArrowRight className="size-4" /></Button>
              )}
            </div>
          )}
        </Card>
      )}


      {!wizardOpen && (
        <section aria-label={t("Campus buildings")} className="space-y-4">
          <div className="flex flex-wrap items-end justify-between gap-3">
            <div>
              <h2 className="font-display text-lg font-bold text-ink">{t("All Buildings")}</h2>
              <p className="mt-1 text-xs text-muted">
                {buildings.length} {buildings.length === 1 ? "building" : "buildings"} · {totalClassrooms} classrooms · {totalBuildingSeats.toLocaleString()} seats
              </p>
            </div>
            <div className="relative w-full sm:w-64">
              <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted" />
              <Input aria-label={t("Search buildings")} className="h-9 pl-9" placeholder={t("Search buildings...")}
                value={search} onChange={(event) => setSearch(event.target.value)} />
            </div>
          </div>

          {loading ? (
            <div role="status" className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
              {[1, 2, 3].map((item) => (
                <div key={item} className="h-48 animate-pulse rounded-card border border-hairline bg-card" />
              ))}
            </div>
          ) : buildings.length === 0 ? (
            <Card className="flex flex-col items-center gap-3 px-6 py-10 text-center">
              <span className="flex size-12 items-center justify-center rounded-panel bg-brand-50 text-brand-600">
                <Building2 className="size-6" />
              </span>
              <div>
                <h3 className="font-semibold">{t("No buildings yet")}</h3>
                <p className="mt-1 text-sm text-muted">{t("Create a building, then add floors and classrooms in one flow.")}</p>
              </div>
              <Button onClick={openWizard}><Plus className="size-4" />{t("Add Building")}</Button>
            </Card>
          ) : visibleBuildings.length === 0 ? (
            <Card className="p-8 text-center">
              <Search className="mx-auto mb-2 size-6 text-muted" />
              <h3 className="font-semibold">{t("No matching buildings")}</h3>
              <p className="mt-1 text-sm text-muted">{t("Try searching by building name or code.")}</p>
              <Button variant="secondary" size="sm" className="mt-3" onClick={() => setSearch("")}>{t("Clear search")}</Button>
            </Card>
          ) : showDetails && selectedBuilding ? (
            <Card className="overflow-hidden">
              <div className="flex flex-wrap items-center justify-between gap-3 border-b border-hairline p-4">
                <div className="flex min-w-0 items-center gap-3">
                  <button type="button" onClick={() => setShowDetails(false)} aria-label={t("Back to all buildings")}
                    className="flex size-9 shrink-0 items-center justify-center rounded-control border border-hairline text-muted hover:bg-brand-50 hover:text-brand-700">
                    <ArrowLeft className="size-4" />
                  </button>
                  <span className="flex size-10 shrink-0 items-center justify-center rounded-control bg-brand-50 text-brand-600">
                    <Building2 className="size-5" />
                  </span>
                  <div className="min-w-0">
                    <h3 className="truncate font-bold">{selectedBuilding.name}</h3>
                    <p className="text-xs text-muted">Building code: {selectedBuilding.code}</p>
                  </div>
                </div>
                <StatusBadge status={selectedBuilding.status} context="resource" />
              </div>
              <div className="grid grid-cols-3 divide-x divide-hairline border-b border-hairline">
                {[
                  { label: "Floors", number: selectedBuilding.floors_count ?? floors.length },
                  { label: "Classrooms", number: selectedBuilding.classrooms_count ?? 0 },
                  { label: "Total seats", number: selectedBuilding.total_seats ?? 0 },
                ].map((metric) => (
                  <div key={metric.label} className="px-3 py-4 text-center">
                    <p className="text-xl font-bold tabular-nums">{metric.number.toLocaleString()}</p>
                    <p className="text-xs text-muted">{metric.label}</p>
                  </div>
                ))}
              </div>
              <div className="space-y-4 p-4">
                <div>
                  <h4 className="text-sm font-semibold">{t("Floors & Classrooms")}</h4>
                  <p className="mt-1 text-xs text-muted">{t("Select a floor to view its rooms and seating capacity.")}</p>
                </div>
                {floors.length ? (
                  <>
                    <div role="group" aria-label={t("Select floor")} className="flex flex-wrap gap-2">
                      {floors.map((floor) => (
                        <button type="button" key={floor.id} onClick={() => setSelectedFloorId(floor.id)}
                          aria-pressed={selectedFloorId === floor.id}
                          className={"rounded-control border px-3 py-2 text-xs font-semibold transition-colors " +
                            (selectedFloorId === floor.id ? "border-brand-500 bg-brand-50 text-brand-700" : "border-hairline text-muted hover:border-brand-300")}>
                          {floor.name} <span className="ml-1 opacity-70">({floor.classrooms_count ?? 0})</span>
                        </button>
                      ))}
                    </div>
                    {rooms.length ? (
                      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
                        {rooms.map((room) => (
                          <div key={room.id} className="rounded-control border border-hairline bg-canvas/40 p-4">
                            <div className="flex items-center justify-between gap-2">
                              <span className="font-bold">{room.room_code}</span>
                              <StatusBadge status={room.status} context="resource" />
                            </div>
                            <p className="mt-2 text-xs text-muted">{roomTypeLabel(room.room_type)} · {room.capacity} seats</p>
                            <p className="mt-2 flex items-center gap-1 text-xs text-muted">
                              <MapPin className="size-3" />
                              {room.latitude != null && room.longitude != null ? "GPS configured" : "No GPS configured"}
                            </p>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <p className="rounded-control border border-dashed border-hairline p-5 text-sm text-muted">{t("No classrooms found for this floor.")}</p>
                    )}
                  </>
                ) : (
                  <p className="rounded-control border border-dashed border-hairline p-5 text-sm text-muted">{t("No floors have been added to this building.")}</p>
                )}
              </div>
            </Card>
          ) : (
            <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4">
              {visibleBuildings.map((building) => (
                <article key={building.id} className="flex min-w-0 flex-col overflow-hidden rounded-card border border-hairline bg-card shadow-soft transition-colors hover:border-brand-300">
                  <div className="flex min-w-0 items-start gap-3 px-4 py-4">
                    <div className="flex size-11 shrink-0 items-center justify-center rounded-control bg-brand-50 text-brand-600">
                      <Building2 className="size-5" aria-hidden="true" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="mb-1 flex flex-wrap items-center gap-2">
                        <span className="rounded-md bg-brand-50 px-2 py-0.5 text-[11px] font-bold text-brand-700">{building.code}</span>
                        <StatusBadge status={building.status} context="resource" className="min-h-5 px-1.5 text-[10px]" />
                      </div>
                      <h3 className="truncate text-sm font-bold text-ink" title={building.name}>{building.name}</h3>
                      {building.description && <p className="mt-1 line-clamp-2 text-xs text-muted">{building.description}</p>}
                    </div>
                  </div>
                  <div className="mt-auto grid grid-cols-3 divide-x divide-hairline border-y border-hairline bg-canvas/30">
                    {[
                      { label: "Floors", number: building.floors_count ?? 0 },
                      { label: "Rooms", number: building.classrooms_count ?? 0 },
                      { label: "Seats", number: building.total_seats ?? 0 },
                    ].map((metric) => (
                      <div key={metric.label} className="flex min-w-0 items-baseline justify-center gap-1 px-2 py-3">
                        <span className="text-sm font-bold tabular-nums text-ink">{metric.number.toLocaleString()}</span>
                        <span className="text-[11px] text-muted">{metric.label}</span>
                      </div>
                    ))}
                  </div>
                  <button type="button"
                    onClick={() => { setSelectedBuildingId(building.id); setSelectedFloorId(0); setShowDetails(true); }}
                    aria-label={"View details for " + building.name}
                    className="flex w-full items-center justify-between px-4 py-3 text-left text-xs font-semibold text-brand-700 transition-colors hover:bg-brand-50">{t("View details")}<ChevronRight className="size-4" />
                  </button>
                </article>
              ))}
              {!search.trim() && (
                <button type="button" onClick={openWizard}
                  className="flex min-h-48 flex-col items-center justify-center gap-3 rounded-card border border-dashed border-hairline bg-card/30 p-6 text-center transition-colors hover:border-brand-400 hover:bg-brand-50"
                  aria-label={t("Add New Building")}>
                  <span className="flex size-11 items-center justify-center rounded-full bg-brand-50 text-brand-600"><Plus className="size-5" /></span>
                  <span>
                    <span className="block text-sm font-semibold text-ink">{t("Add New Building")}</span>
                    <span className="mt-1 block text-xs text-muted">{t("Set up floors and classrooms")}</span>
                  </span>
                </button>
              )}
            </div>
          )}
        </section>
      )}

    </>
  );
}

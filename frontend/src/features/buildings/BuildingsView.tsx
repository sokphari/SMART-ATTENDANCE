"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import {
  ArrowLeft, ArrowRight, Building2, Check, CheckCircle2, ChevronDown,
  DoorOpen, Layers3, MapPin, Plus, Search, Trash2, Users, X,
} from "lucide-react";
import { apiFetch, ApiError } from "@/lib/api/client";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { Input } from "@/components/ui/Input";
import { PageHeader } from "@/components/ui/PageHeader";

type Building = {
  id: number;
  code: string;
  name: string;
  description?: string | null;
  status?: string;
  floors_count?: number;
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
  const nextKey = useRef(1);
  const [buildings, setBuildings] = useState<Building[]>([]);
  const [selectedBuildingId, setSelectedBuildingId] = useState(0);
  const [selectedFloorId, setSelectedFloorId] = useState(0);
  const [floors, setFloors] = useState<Floor[]>([]);
  const [rooms, setRooms] = useState<Room[]>([]);
  const [search, setSearch] = useState("");
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

  return (
    <>
      <PageHeader
        title="Buildings & Rooms"
        description="Manage campus buildings, floors, and classrooms in one place."
      />

      <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
        <p className="text-sm text-muted">
          Organize classrooms by building and floor. GPS is optional for rooms.
        </p>
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
          <div className="flex items-start justify-between gap-3 border-b border-hairline p-3 sm:px-4">
            <div>
              <h2 className="text-base font-bold">
                {step === 5 ? "Building created" : "Create a new building"}
              </h2>
              <p className="mt-0.5 text-xs text-muted">
                {step === 5 ? "Your building and classrooms are ready." : "Complete each step, then review before saving."}
              </p>
            </div>
            <Button variant="secondary" size="icon" aria-label="Close wizard" onClick={closeWizard} disabled={saving}>
              <X className="size-4" />
            </Button>
          </div>

          {step < 5 && (
            <ol className="grid grid-cols-4 gap-1 border-b border-hairline px-3 py-2 sm:gap-2 sm:px-4">
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
                      className="flex w-full flex-col items-center justify-center gap-1 rounded-control px-1 py-1 sm:flex-row sm:gap-2 disabled:cursor-default"
                    >
                      <span className={`flex size-7 shrink-0 items-center justify-center rounded-full border text-xs font-bold transition-colors ${
                        current < step
                          ? "border-emerald-500 bg-emerald-500 text-white"
                          : current === step
                            ? "border-brand-600 bg-brand-600 text-white"
                            : "border-hairline bg-canvas text-muted"
                      }`}>
                        {current < step ? <Check className="size-3.5" /> : <Icon className="size-3.5" />}
                      </span>
                      <span className={`text-center text-[11px] font-semibold sm:text-xs ${
                        current === step ? "text-ink" : "text-muted"
                      }`}>{item.label}</span>
                    </button>
                  </li>
                );
              })}
            </ol>
          )}

          <div className="space-y-3 p-3 sm:p-4">
            {step === 1 && (
              <div className="grid gap-3 md:grid-cols-2">
                <div>
                  <label htmlFor="setup-building-code" className={labelStyle}>Building code *</label>
                  <Input className="h-9" id="setup-building-code" maxLength={30} placeholder="e.g. A1" value={buildingForm.code}
                    onChange={(event) => {
                      setBuildingForm((value) => ({ ...value, code: event.target.value.toUpperCase() }));
                      setFormError("");
                    }} />
                </div>
                <div>
                  <label htmlFor="setup-building-name" className={labelStyle}>Building name *</label>
                  <Input className="h-9" id="setup-building-name" maxLength={150} placeholder="e.g. Building A" value={buildingForm.name}
                    onChange={(event) => {
                      setBuildingForm((value) => ({ ...value, name: event.target.value }));
                      setFormError("");
                    }} />
                </div>
                <div className="md:col-span-2">
                  <button type="button" aria-expanded={showDescription} aria-controls="setup-description-panel"
                    className="flex items-center gap-1.5 text-xs font-semibold text-brand-700 hover:underline"
                    onClick={() => setShowDescription((value) => !value)}>
                    <ChevronDown className={`size-3.5 transition-transform ${showDescription ? "rotate-180" : ""}`} />
                    {showDescription ? "Hide description" : "Add description (optional)"}
                  </button>
                  {showDescription && (
                    <div id="setup-description-panel" className="mt-2">
                      <label htmlFor="setup-building-description" className={labelStyle}>Description (optional)</label>
                      <textarea id="setup-building-description" rows={2} maxLength={5000}
                        className={`${selectStyle} h-auto min-h-16 py-2`}
                        placeholder="Where is this building located?"
                        value={buildingForm.description}
                        onChange={(event) => setBuildingForm((value) => ({ ...value, description: event.target.value }))} />
                    </div>
                  )}
                </div>
              </div>
            )}

            {step === 2 && (
              <div className="space-y-3">
                <p className="text-xs text-muted">
                  Add floors for <strong className="text-ink">{buildingForm.name}</strong>. Use 0 for ground floor.
                </p>
                {draftFloors.map((floor, index) => (
                  <div key={floor.key} className="grid gap-2 rounded-control border border-hairline p-3 sm:grid-cols-[1fr_100px_auto] sm:items-end">
                    <div>
                      <label htmlFor={`floor-name-${floor.key}`} className={labelStyle}>Floor name *</label>
                      <Input className="h-9" id={`floor-name-${floor.key}`} value={floor.name}
                        onChange={(event) => updateFloor(floor.key, { name: event.target.value })} />
                    </div>
                    <div>
                      <label htmlFor={`floor-number-${floor.key}`} className={labelStyle}>Number *</label>
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
                  <Plus className="size-4" /> Add another floor
                </Button>
              </div>
            )}

            {step === 3 && (
              <div className="space-y-3">
                <p className="text-xs text-muted">
                  Add one or more rooms to each floor. Coordinates are only needed for GPS-based attendance.
                </p>
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
                              <label htmlFor={`room-code-${room.key}`} className={labelStyle}>Room code *</label>
                              <Input className="h-9" id={`room-code-${room.key}`} maxLength={50} placeholder="A-101" value={room.room_code}
                                onChange={(event) => updateRoom(floor.key, room.key, { room_code: event.target.value.toUpperCase() })} />
                            </div>
                            <div>
                              <label htmlFor={`room-seats-${room.key}`} className={labelStyle}>Seats *</label>
                              <Input className="h-9" id={`room-seats-${room.key}`} type="number" min={1} max={2000} value={room.capacity}
                                onChange={(event) => updateRoom(floor.key, room.key, { capacity: event.target.value })} />
                            </div>
                            <div>
                              <label htmlFor={`room-type-${room.key}`} className={labelStyle}>Type *</label>
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
                            <MapPin className="size-3.5" />
                            GPS / Advanced settings (optional)
                            <ChevronDown className={`size-3.5 transition-transform ${room.advanced ? "rotate-180" : ""}`} />
                          </button>
                          {room.advanced && (
                            <div className="mt-3 grid gap-3 rounded-control bg-canvas p-3 sm:grid-cols-3">
                              <div>
                                <label htmlFor={`room-lat-${room.key}`} className={labelStyle}>Latitude</label>
                                <Input id={`room-lat-${room.key}`} type="number" step="any" placeholder="11.5564" value={room.latitude}
                                  onChange={(event) => updateRoom(floor.key, room.key, { latitude: event.target.value })} />
                              </div>
                              <div>
                                <label htmlFor={`room-lng-${room.key}`} className={labelStyle}>Longitude</label>
                                <Input id={`room-lng-${room.key}`} type="number" step="any" placeholder="104.9282" value={room.longitude}
                                  onChange={(event) => updateRoom(floor.key, room.key, { longitude: event.target.value })} />
                              </div>
                              <div>
                                <label htmlFor={`room-radius-${room.key}`} className={labelStyle}>Radius (meters)</label>
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
                <p className="text-xs text-muted">Nothing is saved until you click Create Building.</p>
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
                  <Button variant="secondary" onClick={closeWizard}>View Building</Button>
                  <Button onClick={openWizard}><Plus className="size-4" /> Create Another</Button>
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
            <div className="flex flex-wrap items-center justify-between gap-2 border-t border-hairline px-3 py-2.5 sm:px-4">
              <Button variant="secondary" disabled={step === 1 || saving} onClick={() => { setStep((value) => value - 1); setFormError(""); }}>
                <ArrowLeft className="size-4" /> Back
              </Button>
              {step === 4 ? (
                <Button loading={saving} disabled={saving} onClick={() => void saveBuilding()}>
                  <Check className="size-4" /> {saving ? "Creating..." : "Create Building"}
                </Button>
              ) : (
                <Button onClick={goNext}>Continue <ArrowRight className="size-4" /></Button>
              )}
            </div>
          )}
        </Card>
      )}

      {!wizardOpen && <Card className="overflow-hidden">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-hairline p-4">
          <h2 className="font-semibold">Existing Buildings</h2>
          <div className="relative w-full sm:w-64">
            <Search className="absolute left-3 top-3.5 size-4 text-muted" />
            <Input aria-label="Search buildings" className="pl-9" placeholder="Search buildings..."
              value={search} onChange={(event) => setSearch(event.target.value)} />
          </div>
        </div>
        {loading ? (
          <p className="p-6 text-sm text-muted">Loading buildings...</p>
        ) : !buildings.length ? (
          <div className="p-8 text-center">
            <Building2 className="mx-auto mb-2 size-8 text-muted" />
            <p className="font-semibold">No buildings yet</p>
            <p className="mt-1 text-sm text-muted">Use Create Building to set up your first building and its classrooms.</p>
          </div>
        ) : (
          <div className="grid gap-4 p-4 lg:grid-cols-[280px_minmax(0,1fr)]">
            <div className="space-y-2">
              {visibleBuildings.map((building) => (
                <button type="button" key={building.id}
                  onClick={() => { setSelectedBuildingId(building.id); setSelectedFloorId(0); }}
                  className={`flex w-full items-center justify-between gap-2 rounded-control border p-3 text-left transition-colors ${
                    building.id === selectedBuildingId ? "border-brand-500 bg-brand-50" : "border-hairline hover:border-brand-300"
                  }`}>
                  <span className="min-w-0">
                    <span className="block truncate text-sm font-semibold">{building.name}</span>
                    <span className="text-xs text-muted">{building.code}</span>
                  </span>
                  <span className="shrink-0 rounded-full bg-canvas px-2 py-1 text-xs text-muted">
                    {building.floors_count ?? 0} floors
                  </span>
                </button>
              ))}
              {visibleBuildings.length === 0 && <p className="p-3 text-sm text-muted">No matching buildings.</p>}
            </div>
            <div className="min-w-0 space-y-4">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div>
                  <h3 className="font-semibold">{selectedBuilding?.name ?? "Select a building"}</h3>
                  {selectedBuilding && <p className="text-xs text-muted">Choose a floor to see its classrooms.</p>}
                </div>
                <span className="text-xs text-muted">{floors.length} floors</span>
              </div>
              {floors.length > 0 ? (
                <>
                  <div className="flex flex-wrap gap-2">
                    {floors.map((floor) => (
                      <button type="button" key={floor.id} onClick={() => setSelectedFloorId(floor.id)}
                        className={`rounded-full border px-3 py-1.5 text-xs font-semibold transition-colors ${
                          selectedFloorId === floor.id
                            ? "border-brand-500 bg-brand-50 text-brand-700"
                            : "border-hairline text-muted hover:border-brand-300"
                        }`}>
                        {floor.name} ({floor.classrooms_count ?? 0})
                      </button>
                    ))}
                  </div>
                  <div className="grid gap-3 sm:grid-cols-2">
                    {rooms.map((room) => (
                      <div key={room.id} className="rounded-control border border-hairline p-4">
                        <div className="flex items-center justify-between gap-2">
                          <span className="font-bold">{room.room_code}</span>
                          <span className={`rounded-full px-2 py-1 text-[11px] font-semibold ${
                            room.status === "active" ? "bg-success-soft text-success" : "bg-canvas text-muted"
                          }`}>{room.status}</span>
                        </div>
                        <p className="mt-2 text-xs text-muted">
                          {roomTypeLabel(room.room_type)} · {room.capacity} seats
                        </p>
                        <p className="mt-2 flex items-center gap-1 text-xs text-muted">
                          <MapPin className="size-3" />
                          {room.latitude != null && room.longitude != null ? "GPS enabled" : "No GPS configured"}
                        </p>
                      </div>
                    ))}
                  </div>
                  {!rooms.length && <p className="rounded-control border border-dashed border-hairline p-5 text-sm text-muted">No classrooms on this floor yet.</p>}
                </>
              ) : (
                <p className="rounded-control border border-dashed border-hairline p-5 text-sm text-muted">
                  {selectedBuilding ? "No floors in this building." : "Select a building."}
                </p>
              )}
            </div>
          </div>
        )}
      </Card>}
    </>
  );
}

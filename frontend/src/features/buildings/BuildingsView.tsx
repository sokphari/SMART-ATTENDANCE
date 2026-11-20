"use client";

import { useCallback, useEffect, useState } from "react";
import { Plus } from "lucide-react";
import { apiFetch, ApiError } from "@/lib/api/client";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { Input } from "@/components/ui/Input";
import { PageHeader } from "@/components/ui/PageHeader";

type Building = {
  id: number;
  code: string;
  name: string;
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
  status: string;
};
type Result<T> = { data: T[] };
export function BuildingsView() {
  const [buildings, setBuildings] = useState<Building[]>([]);
  const [floors, setFloors] = useState<Floor[]>([]);
  const [rooms, setRooms] = useState<Room[]>([]);
  const [buildingId, setBuildingId] = useState(0);
  const [floorId, setFloorId] = useState(0);
  const [error, setError] = useState("");
  const [buildingForm, setBuildingForm] = useState({ code: "", name: "" });
  const [floorForm, setFloorForm] = useState({ name: "", floor_number: "" });
  const [roomForm, setRoomForm] = useState({
    room_code: "",
    capacity: 35,
    room_type: "classroom",
    latitude: "",
    longitude: "",
    allowed_radius_meters: 100,
  });
  const loadBuildings = useCallback(async () => {
    try {
      const r = await apiFetch<Result<Building>>(
        "/api/v1/admin/buildings?per_page=100",
      );
      setBuildings(r.data);
      if (!buildingId && r.data[0]) setBuildingId(r.data[0].id);
    } catch (e) {
      setError(e instanceof ApiError ? e.message : "Could not load buildings.");
    }
  }, [buildingId]);
  const loadFloors = useCallback(async () => {
    if (!buildingId) {
      setFloors([]);
      setRooms([]);
      return;
    }
    try {
      const r = await apiFetch<Result<Floor>>(
        `/api/v1/admin/buildings/${buildingId}/floors?per_page=100`,
      );
      setFloors(r.data);
      if (!r.data.some((f) => f.id === floorId)) setFloorId(r.data[0]?.id ?? 0);
    } catch (e) {
      setError(e instanceof ApiError ? e.message : "Could not load floors.");
    }
  }, [buildingId, floorId]);
  const loadRooms = useCallback(async () => {
    if (!floorId) {
      setRooms([]);
      return;
    }
    try {
      const r = await apiFetch<Result<Room>>(
        `/api/v1/admin/classrooms?floor_id=${floorId}&per_page=100`,
      );
      setRooms(r.data);
    } catch (e) {
      setError(e instanceof ApiError ? e.message : "Could not load rooms.");
    }
  }, [floorId]);
  useEffect(() => {
    void loadBuildings();
  }, [loadBuildings]);
  useEffect(() => {
    void loadFloors();
  }, [loadFloors]);
  useEffect(() => {
    void loadRooms();
  }, [loadRooms]);
  async function action(path: string, body: unknown) {
    setError("");
    try {
      await apiFetch(path, { method: "POST", body });
      await loadBuildings();
      await loadFloors();
      await loadRooms();
    } catch (e) {
      setError(
        e instanceof ApiError
          ? (Object.values(e.errors).flat()[0] ?? e.message)
          : "The request failed.",
      );
    }
  }
  return (
    <>
      <PageHeader
        title="Buildings & Rooms"
        description="Organize buildings into floors and manage active classrooms with seat capacity."
      />
      {error && (
        <p
          role="alert"
          className="mb-4 rounded-control bg-danger-soft p-3 text-sm text-danger"
        >
          {error}
        </p>
      )}
      <div className="grid gap-5 xl:grid-cols-3">
        <Card className="p-4">
          <h2 className="mb-3 font-semibold">Buildings</h2>
          <div className="mb-4 grid gap-2">
            <Input
              aria-label="Building code"
              placeholder="Building code"
              value={buildingForm.code}
              onChange={(e) =>
                setBuildingForm({
                  ...buildingForm,
                  code: e.target.value.toUpperCase(),
                })
              }
            />
            <Input
              aria-label="Building name"
              placeholder="Building name"
              value={buildingForm.name}
              onChange={(e) =>
                setBuildingForm({ ...buildingForm, name: e.target.value })
              }
            />
            <Button
              disabled={!buildingForm.code || !buildingForm.name}
              onClick={() =>
                void action("/api/v1/admin/buildings", buildingForm)
              }
            >
              <Plus className="size-4" />
              Add building
            </Button>
          </div>
          <div className="space-y-2">
            {buildings.map((b) => (
              <button
                key={b.id}
                onClick={() => {
                  setBuildingId(b.id);
                  setFloorId(0);
                }}
                className={`w-full rounded-control border p-3 text-left ${buildingId === b.id ? "border-brand-500 bg-brand-50" : "border-hairline"}`}
              >
                <span className="font-semibold">{b.name}</span>
                <span className="ml-2 text-xs text-muted">
                  {b.code} · {b.floors_count ?? 0} floors
                </span>
              </button>
            ))}
          </div>
        </Card>
        <Card className="p-4">
          <div className="mb-3 flex items-center justify-between">
            <h2 className="font-semibold">Floors</h2>
            <select
              aria-label="Selected building"
              value={buildingId || ""}
              onChange={(e) => {
                setBuildingId(Number(e.target.value));
                setFloorId(0);
              }}
              className="max-w-48 rounded-control border border-hairline bg-card p-2 text-sm"
            >
              {buildings.map((b) => (
                <option key={b.id} value={b.id}>
                  {b.name}
                </option>
              ))}
            </select>
          </div>
          <div className="mb-4 grid gap-2">
            <Input
              aria-label="Floor name"
              placeholder="e.g. Ground floor"
              value={floorForm.name}
              onChange={(e) =>
                setFloorForm({ ...floorForm, name: e.target.value })
              }
            />
            <Input
              aria-label="Floor number"
              type="number"
              placeholder="Floor number"
              value={floorForm.floor_number}
              onChange={(e) =>
                setFloorForm({ ...floorForm, floor_number: e.target.value })
              }
            />
            <Button
              disabled={!buildingId || !floorForm.name}
              onClick={() =>
                void action(`/api/v1/admin/buildings/${buildingId}/floors`, {
                  ...floorForm,
                  floor_number: floorForm.floor_number
                    ? Number(floorForm.floor_number)
                    : null,
                })
              }
            >
              <Plus className="size-4" />
              Add floor
            </Button>
          </div>
          <div className="space-y-2">
            {floors.map((f) => (
              <button
                key={f.id}
                onClick={() => setFloorId(f.id)}
                className={`w-full rounded-control border p-3 text-left ${floorId === f.id ? "border-brand-500 bg-brand-50" : "border-hairline"}`}
              >
                {f.name}
                <span className="ml-2 text-xs text-muted">
                  {f.classrooms_count ?? 0} rooms
                </span>
              </button>
            ))}
          </div>
        </Card>
        <Card className="p-4">
          <h2 className="mb-3 font-semibold">Classrooms</h2>
          <div className="mb-4 grid gap-2">
            <Input
              aria-label="Room number"
              placeholder="Room number / code"
              value={roomForm.room_code}
              onChange={(e) =>
                setRoomForm({
                  ...roomForm,
                  room_code: e.target.value.toUpperCase(),
                })
              }
            />
            <div className="grid grid-cols-2 gap-2">
              <Input
                aria-label="Room capacity"
                type="number"
                min={1}
                placeholder="Capacity"
                value={String(roomForm.capacity)}
                onChange={(e) =>
                  setRoomForm({ ...roomForm, capacity: Number(e.target.value) })
                }
              />
              <select
                aria-label="Room type"
                className="h-11 rounded-control border border-hairline bg-card px-3 text-sm"
                value={roomForm.room_type}
                onChange={(e) =>
                  setRoomForm({ ...roomForm, room_type: e.target.value })
                }
              >
                <option value="classroom">Classroom</option>
                <option value="laboratory">Laboratory</option>
                <option value="lecture_hall">Lecture hall</option>
              </select>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <Input
                aria-label="Latitude for attendance location"
                type="number"
                step="any"
                placeholder="Latitude"
                value={roomForm.latitude}
                onChange={(e) =>
                  setRoomForm({ ...roomForm, latitude: e.target.value })
                }
              />
              <Input
                aria-label="Longitude for attendance location"
                type="number"
                step="any"
                placeholder="Longitude"
                value={roomForm.longitude}
                onChange={(e) =>
                  setRoomForm({ ...roomForm, longitude: e.target.value })
                }
              />
            </div>
            <p className="text-xs text-muted">
              Enter the room’s real coordinates; attendance location checks use
              them.
            </p>
            <Button
              disabled={
                !floorId ||
                !roomForm.room_code ||
                !roomForm.latitude ||
                !roomForm.longitude
              }
              onClick={() =>
                void action("/api/v1/admin/classrooms", {
                  ...roomForm,
                  floor_id: floorId,
                  latitude: Number(roomForm.latitude),
                  longitude: Number(roomForm.longitude),
                })
              }
            >
              <Plus className="size-4" />
              Add classroom
            </Button>
          </div>
          <div className="space-y-2">
            {rooms.map((r) => (
              <div
                key={r.id}
                className="flex justify-between rounded-control border border-hairline p-3"
              >
                <span className="font-semibold">
                  {r.room_code}
                  <small className="ml-2 font-normal text-muted">
                    {r.room_type}
                  </small>
                </span>
                <span className="text-sm text-muted">{r.capacity} seats</span>
              </div>
            ))}
            {floorId > 0 && rooms.length === 0 && (
              <p className="py-4 text-center text-sm text-muted">
                No rooms on this floor yet.
              </p>
            )}
          </div>
        </Card>
      </div>
    </>
  );
}

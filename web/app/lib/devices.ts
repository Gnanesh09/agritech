import { isAxiosError } from "axios";
import api from "./axios";

export type DeviceModel = {
  id: string;
  name: string;
  code: string;
  imageUrl?: string | null;
  capabilities?: {
    sensors?: { key: string; label?: string; unit?: string }[];
  };
};
export type Device = {
  id: string; deviceCode: string; serialNumber?: string | null; status?: string | null;
  linkedAt?: string | null; lastSeenAt?: string | null; firmwareVersion?: string | null;
  name?: string | null; deviceModel: DeviceModel;
};
export type DeviceLookup = { deviceCode?: string; serialNumber?: string };
type DevicesResponse = { devices: Device[] };
type DeviceResponse = { device: Device };
type AvailabilityResponse = { available: boolean; device: Device };

function payload({ deviceCode, serialNumber }: DeviceLookup): DeviceLookup {
  return {
    ...(deviceCode?.trim() ? { deviceCode: deviceCode.trim().toUpperCase() } : {}),
    ...(serialNumber?.trim() ? { serialNumber: serialNumber.trim().toUpperCase() } : {}),
  };
}

export async function getDevices() { return (await api.get<DevicesResponse>("/user/devices")).data.devices ?? []; }
export async function getDevice(id: string) { return (await api.get<DeviceResponse>(`/user/devices/${id}`)).data.device; }
export async function checkDeviceAvailability(lookup: DeviceLookup) { return (await api.post<AvailabilityResponse>("/user/devices/check", payload(lookup))).data; }
export async function claimDevice(lookup: DeviceLookup) { return (await api.post<DeviceResponse>("/user/devices/claim", payload(lookup))).data.device; }

export function getApiErrorMessage(error: unknown, fallback: string) {
  if (isAxiosError<{ message?: string }>(error)) {
    if (error.response?.status === 401) return "Your session has expired. Please sign in again.";
    return error.response?.data?.message || fallback;
  }
  return error instanceof Error ? error.message : fallback;
}

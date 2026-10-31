import api from "../../lib/axios";
import type {
  DeviceState,
  Rack,
  RackDetailsResponse,
  Telemetry,
} from "./types";

export async function fetchRacks() {
  const response = await api.get<{ racks: Rack[] }>("/user/racks");
  return response.data.racks;
}

export async function fetchRack(rackId: string) {
  const response = await api.get<RackDetailsResponse>(
    `/user/racks/${encodeURIComponent(rackId)}`,
  );
  return response.data;
}

export async function fetchTelemetry(deviceId: string) {
  const response = await api.get<{ telemetry: Telemetry[] }>(
    `/user/devices/${encodeURIComponent(deviceId)}/telemetry`,
  );
  return response.data.telemetry;
}

export async function fetchDeviceState(deviceId: string) {
  const response = await api.get<{ state: DeviceState }>(
    `/user/devices/${encodeURIComponent(deviceId)}/state`,
  );
  return response.data.state;
}

export async function renameRack(rackId: string, name: string) {
  await api.patch(`/user/racks/${encodeURIComponent(rackId)}`, { name });
}

export async function renameRackRow(
  rackId: string,
  rowId: string,
  name: string,
) {
  await api.patch(
    `/user/racks/${encodeURIComponent(rackId)}/rows/${encodeURIComponent(rowId)}`,
    { name },
  );
}

export async function renameRackTray(
  rackId: string,
  trayId: string,
  name: string,
) {
  await api.patch(
    `/user/racks/${encodeURIComponent(rackId)}/trays/${encodeURIComponent(trayId)}`,
    { name },
  );
}

export async function plantTrayCrop(
  rackId: string,
  trayId: string,
  input: {
    cropName: string;
    sowingDate: string;
    estimatedGrowthDays: number;
    notes?: string;
  },
) {
  await api.post(
    `/user/racks/${encodeURIComponent(rackId)}/trays/${encodeURIComponent(trayId)}/crop`,
    input,
  );
}

export async function updateCropCycle(
  cycleId: string,
  input: {
    cropName: string;
    sowingDate: string;
    estimatedGrowthDays: number;
    notes?: string;
  },
) {
  await api.patch(`/user/crop-cycles/${encodeURIComponent(cycleId)}`, input);
}

export async function harvestCropCycle(cycleId: string) {
  await api.post(
    `/user/crop-cycles/${encodeURIComponent(cycleId)}/harvest`,
  );
}

export async function requestActuatorState(
  deviceId: string,
  target: string,
  value: boolean,
) {
  await api.post(`/user/devices/${encodeURIComponent(deviceId)}/commands`, {
    target,
    action: "set",
    value,
    mode: "MANUAL",
  });
}

export type SensorCapability = {
  key: string;
  label?: string;
  type: "number" | "boolean" | "string";
  unit?: string;
  min?: number;
  max?: number;
};

export type Telemetry = {
  id: string;
  data: Record<string, unknown>;
  recordedAt: string;
};

export type Device = {
  id: string;
  deviceCode: string;
  status: string;
  lastSeenAt: string | null;
  name: string | null;
  deviceModel: {
    name: string;
    code: string;
    capabilities: {
      sensors: SensorCapability[];
      actuators: unknown[];
    };
  };
  telemetry: Telemetry[];
};

export type CropCycle = {
  id: string;
  cropName: string;
  status: string;
  expectedHarvestDate: string;
};

export type RackTray = {
  id: string;
  slot: number;
  name: string;
  currentCrop: CropCycle | null;
};

export type Rack = {
  id: string;
  deviceId: string;
  name: string;
  rowCount: number;
  traysPerRow: number;
  status: string;
  rows: Array<{
    id: string;
    rowNumber: number;
    name: string;
    trays: RackTray[];
  }>;
};

export type HarvestCrop = CropCycle & {
  tray: {
    name: string;
    row: {
      name: string;
      rack: {
        id: string;
        name: string;
      };
    };
  };
};

export type UserProfile = {
  username: string;
};

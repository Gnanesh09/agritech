export type CropCycle = {
  id: string;
  cropName: string;
  status: string;
  sowingDate: string;
  expectedHarvestDate: string;
  estimatedGrowthDays: number;
  harvestedAt?: string | null;
  notes?: string | null;
};

export type RackTray = {
  id: string;
  slot: number;
  name: string;
  currentCrop: CropCycle | null;
};

export type RackRow = {
  id: string;
  rowNumber: number;
  name: string;
  fanTarget: string;
  lightTarget: string;
  temperatureSensorKey: string | null;
  humiditySensorKey: string | null;
  lightSensorKey: string | null;
  controlConfig?: unknown;
  trays: RackTray[];
};

export type RackConfiguration = {
  cropName: string;
  seedVariety: string;
  seedSupplier: string;
  seedBatch: string;
  sowingDate: string;
  expectedHarvestDate: string;
  growingArea: number;
  rackWidth: number;
  rackDepth: number;
  shelfCount: number;
  rowsPerShelf: number;
  trayWidth: number;
  trayDepth: number;
  minimumTemperature: number;
  maximumTemperature: number;
  minimumHumidity: number;
  maximumHumidity: number;
  growthStage: string;
  growthNotes: string;
  actualTrayCount: number;
  estimatedYieldKg: number;
};

export type Rack = {
  id: string;
  deviceId: string;
  name: string;
  rowCount: number;
  traysPerRow: number;
  status: string;
  rows: RackRow[];
  demoConfiguration?: RackConfiguration;
  demoActuators?: Record<string, boolean>;
  isDemo?: true;
};

export type SensorCapability = {
  key: string;
  label?: string;
  type: "number" | "boolean" | "string";
  unit?: string;
  min?: number;
  max?: number;
};

export type ActuatorCapability = {
  key: string;
  label?: string;
  type: "number" | "boolean" | "string";
};

export type Telemetry = {
  id: string;
  data: Record<string, unknown>;
  recordedAt: string;
};

export type DeviceState = {
  actual: Record<string, unknown>;
  desired: Record<string, unknown>;
  modes: Record<string, unknown>;
  lastReportedAt: string | null;
};

export type RackDevice = {
  id: string;
  deviceCode: string;
  serialNumber: string;
  status: string;
  lastSeenAt: string | null;
  firmwareVersion: string | null;
  deviceModel: {
    name: string;
    code: string;
    capabilities: {
      sensors: SensorCapability[];
      actuators: ActuatorCapability[];
    };
  };
  state: DeviceState | null;
};

export type RackDetailsResponse = {
  rack: Rack;
  device: RackDevice;
};

export type RackFormValues = RackConfiguration & {
  name: string;
};

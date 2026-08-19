import type { Response } from "express";
import type { Prisma } from "../../generated/prisma/client";

import type { DeviceRequest } from "../middleware/deviceAuth";
import { prisma } from "../lib/prisma";

// ============================================================
// CAPABILITY TYPES
// ============================================================

export type CapabilityType = "number" | "boolean" | "string";

export type DeviceCapability = {
  key: string;
  label?: string;
  type: CapabilityType;
  unit?: string;
  min?: number;
  max?: number;
};

export type DeviceCapabilities = {
  sensors: DeviceCapability[];
  actuators: DeviceCapability[];
};

// ============================================================
// TELEMETRY ENVELOPE
// ============================================================

type TelemetryEnvelope = {
  version?: number;
  type?: string;
  timestamp?: string;
  firmwareVersion?: string;

  data?: Record<string, unknown>;

  state?: Record<string, unknown>;
};

// ============================================================
// NORMALIZE DEVICE MODEL CAPABILITIES
// ============================================================

export function normalizeCapabilities(value: unknown): DeviceCapabilities {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return {
      sensors: [],
      actuators: [],
    };
  }

  const input = value as Record<string, unknown>;

  return {
    sensors: Array.isArray(input.sensors)
      ? input.sensors.filter(isCapability)
      : [],

    actuators: Array.isArray(input.actuators)
      ? input.actuators.filter(isCapability)
      : [],
  };
}

// ============================================================
// CAPABILITY VALIDATION
// ============================================================

function isCapability(value: unknown): value is DeviceCapability {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return false;
  }

  const item = value as Record<string, unknown>;

  return (
    typeof item.key === "string" &&
    typeof item.type === "string" &&
    (item.type === "number" ||
      item.type === "boolean" ||
      item.type === "string")
  );
}

// ============================================================
// FIND CAPABILITY
// ============================================================

export function findCapability(
  capabilities: DeviceCapabilities,
  key: string,
  group: "sensor" | "actuator",
): DeviceCapability | undefined {
  const list =
    group === "sensor" ? capabilities.sensors : capabilities.actuators;

  return list.find((item) => item.key === key);
}

// ============================================================
// VALIDATE TELEMETRY
// ============================================================

export function validateTelemetry(
  capabilities: DeviceCapabilities,
  data: unknown,
): string[] {
  const errors: string[] = [];

  if (!data || typeof data !== "object" || Array.isArray(data)) {
    return ["Telemetry data must be an object"];
  }

  const payload = data as Record<string, unknown>;

  for (const key of Object.keys(payload)) {
    const capability = findCapability(capabilities, key, "sensor");

    if (!capability) {
      errors.push(`Unsupported sensor: ${key}`);

      continue;
    }

    const value = payload[key];

    // ------------------------------------------------------
    // TYPE
    // ------------------------------------------------------

    if (capability.type === "number" && typeof value !== "number") {
      errors.push(`${key} must be a number`);
    }

    if (capability.type === "boolean" && typeof value !== "boolean") {
      errors.push(`${key} must be a boolean`);
    }

    if (capability.type === "string" && typeof value !== "string") {
      errors.push(`${key} must be a string`);
    }

    // ------------------------------------------------------
    // RANGE
    // ------------------------------------------------------

    if (
      typeof value === "number" &&
      capability.min !== undefined &&
      value < capability.min
    ) {
      errors.push(`${key} is below minimum`);
    }

    if (
      typeof value === "number" &&
      capability.max !== undefined &&
      value > capability.max
    ) {
      errors.push(`${key} is above maximum`);
    }
  }

  return errors;
}

// ============================================================
// VALIDATE DEVICE STATE
// ============================================================

export function validateState(
  capabilities: DeviceCapabilities,
  state: unknown,
): string[] {
  const errors: string[] = [];

  if (!state || typeof state !== "object" || Array.isArray(state)) {
    return ["State must be an object"];
  }

  const payload = state as Record<string, unknown>;

  for (const key of Object.keys(payload)) {
    const capability = findCapability(capabilities, key, "actuator");

    if (!capability) {
      errors.push(`Unsupported actuator: ${key}`);

      continue;
    }

    const value = payload[key];

    if (capability.type === "number" && typeof value !== "number") {
      errors.push(`${key} must be a number`);
    }

    if (capability.type === "boolean" && typeof value !== "boolean") {
      errors.push(`${key} must be a boolean`);
    }

    if (capability.type === "string" && typeof value !== "string") {
      errors.push(`${key} must be a string`);
    }

    if (
      typeof value === "number" &&
      capability.min !== undefined &&
      value < capability.min
    ) {
      errors.push(`${key} is below minimum`);
    }

    if (
      typeof value === "number" &&
      capability.max !== undefined &&
      value > capability.max
    ) {
      errors.push(`${key} is above maximum`);
    }
  }

  return errors;
}

// ============================================================
// RECEIVE TELEMETRY
//
// POST /api/device/telemetry
//
// Supports both:
//
// NEW:
// {
//   "version": 1,
//   "type": "telemetry",
//   "timestamp": "...",
//   "data": {
//      "temperature": 28.2,
//      "humidity": 68.4
//   },
//   "state": {}
// }
//
// OLD:
// {
//   "temperature": 28.2,
//   "humidity": 68.4
// }
// ============================================================

export async function receiveTelemetry(req: DeviceRequest, res: Response) {
  try {
    // =====================================================
    // DEVICE AUTH
    // =====================================================

    if (!req.device) {
      return res.status(401).json({
        message: "Device not authenticated",
      });
    }

    // =====================================================
    // LOAD DEVICE + MODEL
    // =====================================================

    const device = await prisma.device.findUnique({
      where: {
        id: req.device.id,
      },

      include: {
        deviceModel: true,
      },
    });

    if (!device) {
      return res.status(404).json({
        message: "Device not found",
      });
    }

    // =====================================================
    // MODEL CAPABILITIES
    // =====================================================

    const capabilities = normalizeCapabilities(device.deviceModel.capabilities);

    // =====================================================
    // REQUEST BODY
    // =====================================================

    const body = req.body as TelemetryEnvelope & Record<string, unknown>;

    // =====================================================
    // VALIDATE MESSAGE TYPE
    // =====================================================

    if (body.type !== undefined && body.type !== "telemetry") {
      return res.status(400).json({
        message: "Invalid telemetry message type",
      });
    }

    // =====================================================
    // GET TELEMETRY DATA
    // =====================================================

    let telemetryData: Record<string, unknown>;

    // -----------------------------------------------------
    // NEW FORMAT
    // -----------------------------------------------------

    if (
      body.data &&
      typeof body.data === "object" &&
      !Array.isArray(body.data)
    ) {
      telemetryData = body.data;
    }

    // -----------------------------------------------------
    // OLD FORMAT
    // -----------------------------------------------------
    else {
      telemetryData = {};

      for (const [key, value] of Object.entries(body)) {
        if (
          key === "version" ||
          key === "type" ||
          key === "timestamp" ||
          key === "firmwareVersion" ||
          key === "state" ||
          key === "data"
        ) {
          continue;
        }

        telemetryData[key] = value;
      }
    }

    // =====================================================
    // CHECK DATA EXISTS
    // =====================================================

    if (Object.keys(telemetryData).length === 0) {
      return res.status(400).json({
        message: "No telemetry data provided",
      });
    }

    // =====================================================
    // VALIDATE AGAINST DEVICE MODEL
    // =====================================================

    const telemetryErrors = validateTelemetry(capabilities, telemetryData);

    if (telemetryErrors.length > 0) {
      return res.status(400).json({
        message: "Invalid telemetry",

        errors: telemetryErrors,
      });
    }

    // =====================================================
    // STATE
    // =====================================================

    let stateData: Record<string, unknown> | null = null;

    if (
      body.state &&
      typeof body.state === "object" &&
      !Array.isArray(body.state)
    ) {
      stateData = body.state;
    }

    // =====================================================
    // VALIDATE STATE
    // =====================================================

    if (stateData) {
      const stateErrors = validateState(capabilities, stateData);

      if (stateErrors.length > 0) {
        return res.status(400).json({
          message: "Invalid device state",

          errors: stateErrors,
        });
      }
    }

    // =====================================================
    // TIMESTAMP
    // =====================================================

    let recordedAt = new Date();

    if (body.timestamp) {
      const parsedDate = new Date(body.timestamp);

      if (Number.isNaN(parsedDate.getTime())) {
        return res.status(400).json({
          message: "Invalid telemetry timestamp",
        });
      }

      recordedAt = parsedDate;
    }

    // =====================================================
    // LEGACY HUMDIE FIELDS
    //
    // Keep these populated so existing frontend code
    // can continue working during migration.
    // =====================================================

    const temperature = getNumber(telemetryData.temperature);

    const humidity = getNumber(telemetryData.humidity);

    // =====================================================
    // SAVE EVERYTHING
    // =====================================================

    const telemetry = await prisma.$transaction(async (tx) => {
      // -------------------------------------------------
      // TELEMETRY
      // -------------------------------------------------

      const createdTelemetry = await tx.deviceTelemetry.create({
        data: {
          deviceId: device.id,

          data: toJsonInput(telemetryData),

          temperature,

          humidity,

          recordedAt,
        },
      });

      // -------------------------------------------------
      // EXISTING STATE
      // -------------------------------------------------

      const existingState = await tx.deviceState.findUnique({
        where: {
          deviceId: device.id,
        },
      });

      // -------------------------------------------------
      // ACTUAL STATE
      // -------------------------------------------------

      const currentActual = toJsonObject(existingState?.actual);

      const nextActual = stateData
        ? {
            ...currentActual,
            ...stateData,
          }
        : currentActual;

      // -------------------------------------------------
      // DESIRED STATE
      // -------------------------------------------------

      const desiredState = toJsonObject(existingState?.desired);

      // -------------------------------------------------
      // MODES
      // -------------------------------------------------

      const modes = toJsonObject(existingState?.modes);

      // -------------------------------------------------
      // UPSERT STATE
      // -------------------------------------------------
      await tx.deviceState.upsert({
        where: {
          deviceId: device.id,
        },

        create: {
          deviceId: device.id,

          actual: nextActual as Prisma.InputJsonValue,

          desired: desiredState as Prisma.InputJsonValue,

          modes: modes as Prisma.InputJsonValue,

          lastReportedAt: recordedAt,
        },

        update: {
          actual: nextActual as Prisma.InputJsonValue,

          lastReportedAt: recordedAt,
        },
      });
      // -------------------------------------------------
      // UPDATE DEVICE HEARTBEAT
      // -------------------------------------------------

      await tx.device.update({
        where: {
          id: device.id,
        },

        data: {
          lastSeenAt: new Date(),

          ...(body.firmwareVersion
            ? {
                firmwareVersion: body.firmwareVersion,
              }
            : {}),
        },
      });

      return createdTelemetry;
    });

    // =====================================================
    // RESPONSE
    // =====================================================

    return res.status(201).json({
      message: "Telemetry received",

      telemetry: {
        id: telemetry.id,

        deviceCode: device.deviceCode,

        model: device.deviceModel.code,

        data: telemetry.data,

        recordedAt: telemetry.recordedAt,
      },
    });
  } catch (error) {
    console.error("Telemetry error:", error);

    return res.status(500).json({
      message: "Failed to save telemetry",
    });
  }
}

// ============================================================
// HELPERS
// ============================================================

function getNumber(value: unknown): number | null {
  return typeof value === "number" ? value : null;
}

function toJsonObject(value: unknown): Prisma.InputJsonObject {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return {};
  }

  /*
   * JSON.parse/stringify guarantees that the
   * object contains JSON-compatible values.
   */

  return JSON.parse(JSON.stringify(value)) as Prisma.InputJsonObject;
}

function toJsonInput(value: unknown): Prisma.InputJsonValue {
  return JSON.parse(JSON.stringify(value)) as Prisma.InputJsonValue;
}

import { prisma } from "../lib/prisma";
import type { Prisma } from "../../generated/prisma/client";
type Trigger = {
  field: string;
  operator: ">" | ">=" | "<" | "<=" | "==" | "!=";
  value: unknown;
};

type Action = {
  target: string;
  action: string;
  value: Prisma.InputJsonValue;
};
export async function evaluateDeviceAutomations(
  deviceId: string,
  telemetry: Record<string, unknown>,
) {
  const automations = await prisma.deviceAutomation.findMany({
    where: {
      deviceId,
      status: "ACTIVE",
    },
  });

  if (!automations.length) {
    return;
  }

  const state = await prisma.deviceState.findUnique({
    where: {
      deviceId,
    },
  });

  if (!state) {
    return;
  }

  const actual = toRecord(state.actual);

  const desired = toRecord(state.desired);

  const modes = toRecord(state.modes);

  for (const automation of automations) {
    const trigger = toTrigger(automation.trigger);

    if (!trigger) {
      continue;
    }

    const currentValue = telemetry[trigger.field];

    if (currentValue === undefined) {
      continue;
    }

    if (!evaluateCondition(currentValue, trigger.operator, trigger.value)) {
      continue;
    }

    const actions = Array.isArray(automation.actions)
      ? (automation.actions as Action[])
      : [];

    for (const action of actions) {
      /*
       * Manual override wins over automation.
       */
      if (modes[action.target] === "MANUAL") {
        continue;
      }

      /*
       * Don't create the same command
       * repeatedly every telemetry cycle.
       */
      if (desired[action.target] === action.value) {
        continue;
      }

      await prisma.deviceCommand.create({
        data: {
          deviceId,

          command: {
            target: action.target,
            action: action.action,
            value: action.value,
            mode: "AUTO",
          },

          source: `AUTOMATION:${automation.id}`,
        },
      });

      await prisma.deviceState.update({
        where: {
          deviceId,
        },

        data: {
          desired: {
            ...desired,
            [action.target]: action.value,
          } as Prisma.InputJsonValue,
        },
      });

      desired[action.target] = action.value;

      console.log(`[AUTOMATION] ${automation.name} → ${action.target}`);
    }
  }

  // actual is intentionally read above so the
  // state structure remains available for future
  // transition-aware rules.
  void actual;
}

// ============================================================
// HELPERS
// ============================================================

function toRecord(value: unknown): Record<string, unknown> {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return {};
  }

  return value as Record<string, unknown>;
}

function toTrigger(value: unknown): Trigger | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return null;
  }

  const trigger = value as Record<string, unknown>;

  if (
    typeof trigger.field !== "string" ||
    typeof trigger.operator !== "string"
  ) {
    return null;
  }

  return {
    field: trigger.field,

    operator: trigger.operator as Trigger["operator"],

    value: trigger.value,
  };
}

function evaluateCondition(
  current: unknown,
  operator: Trigger["operator"],
  expected: unknown,
): boolean {
  switch (operator) {
    case ">":
      return (
        typeof current === "number" &&
        typeof expected === "number" &&
        current > expected
      );

    case ">=":
      return (
        typeof current === "number" &&
        typeof expected === "number" &&
        current >= expected
      );

    case "<":
      return (
        typeof current === "number" &&
        typeof expected === "number" &&
        current < expected
      );

    case "<=":
      return (
        typeof current === "number" &&
        typeof expected === "number" &&
        current <= expected
      );

    case "==":
      return current === expected;

    case "!=":
      return current !== expected;

    default:
      return false;
  }
}

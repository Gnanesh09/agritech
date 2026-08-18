export type CapabilityType =
    | "number"
    | "boolean"
    | "string";

export type DeviceCapability = {
    key: string;
    label?: string;
    type: CapabilityType;
    unit?: string;
    min?: number;
    max?: number;
};

export type DeviceCapabilities = {
    sensors?: DeviceCapability[];
    actuators?: DeviceCapability[];
};

export function normalizeCapabilities(
    value: unknown
): DeviceCapabilities {
    if (!value || typeof value !== "object") {
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

function isCapability(
    value: unknown
): value is DeviceCapability {
    if (!value || typeof value !== "object") {
        return false;
    }

    const item =
        value as Record<string, unknown>;

    return (
        typeof item.key === "string" &&
        typeof item.type === "string" &&
        ["number", "boolean", "string"].includes(
            item.type
        )
    );
}

export function findCapability(
    capabilities: DeviceCapabilities,
    key: string,
    group: "sensor" | "actuator"
) {
    const list =
        group === "sensor"
            ? capabilities.sensors || []
            : capabilities.actuators || [];

    return list.find(
        (item) => item.key === key
    );
}

export function validateTelemetry(
    capabilities: DeviceCapabilities,
    data: unknown
): string[] {
    const errors: string[] = [];

    if (
        !data ||
        typeof data !== "object" ||
        Array.isArray(data)
    ) {
        return ["Telemetry data must be an object"];
    }

    const payload =
        data as Record<string, unknown>;

    for (const key of Object.keys(payload)) {
        const capability =
            findCapability(
                capabilities,
                key,
                "sensor"
            );

        if (!capability) {
            errors.push(
                `Unsupported sensor: ${key}`
            );

            continue;
        }

        const value = payload[key];

        if (
            capability.type === "number" &&
            typeof value !== "number"
        ) {
            errors.push(
                `${key} must be a number`
            );
        }

        if (
            capability.type === "boolean" &&
            typeof value !== "boolean"
        ) {
            errors.push(
                `${key} must be a boolean`
            );
        }

        if (
            capability.type === "string" &&
            typeof value !== "string"
        ) {
            errors.push(
                `${key} must be a string`
            );
        }

        if (
            typeof value === "number" &&
            capability.min !== undefined &&
            value < capability.min
        ) {
            errors.push(
                `${key} is below minimum`
            );
        }

        if (
            typeof value === "number" &&
            capability.max !== undefined &&
            value > capability.max
        ) {
            errors.push(
                `${key} is above maximum`
            );
        }
    }

    return errors;
}

export function validateState(
    capabilities: DeviceCapabilities,
    state: unknown
): string[] {
    const errors: string[] = [];

    if (
        !state ||
        typeof state !== "object" ||
        Array.isArray(state)
    ) {
        return ["State must be an object"];
    }

    const payload =
        state as Record<string, unknown>;

    for (const key of Object.keys(payload)) {
        const capability =
            findCapability(
                capabilities,
                key,
                "actuator"
            );

        if (!capability) {
            errors.push(
                `Unsupported actuator: ${key}`
            );

            continue;
        }

        const value = payload[key];

        if (
            capability.type === "number" &&
            typeof value !== "number"
        ) {
            errors.push(
                `${key} must be a number`
            );
        }

        if (
            capability.type === "boolean" &&
            typeof value !== "boolean"
        ) {
            errors.push(
                `${key} must be a boolean`
            );
        }

        if (
            capability.type === "string" &&
            typeof value !== "string"
        ) {
            errors.push(
                `${key} must be a string`
            );
        }
    }

    return errors;
}
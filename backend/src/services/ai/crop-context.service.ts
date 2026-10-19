import { prisma } from "../../lib/prisma";

export type RackQuery = { rackId?: string; userId: string };

function asRecord(value: unknown): Record<string, unknown> {
  return value && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : {};
}

function latestCycle(cycles: any[] | undefined) {
  const cycle = cycles?.[0];
  if (!cycle) return null;
  const now = Date.now();
  const sowingTime = cycle.sowingDate ? new Date(cycle.sowingDate).getTime() : Number.NaN;
  const ageDays = Number.isFinite(sowingTime)
    ? Math.max(0, Math.floor((now - sowingTime) / 86_400_000))
    : null;

  return {
    id: cycle.id,
    cropName: cycle.cropName,
    status:
      cycle.status === "GROWING" && new Date(cycle.expectedHarvestDate).getTime() <= now
        ? "READY (expected harvest date reached)"
        : cycle.status,
    sowingDate: cycle.sowingDate,
    expectedHarvestDate: cycle.expectedHarvestDate,
    harvestedAt: cycle.harvestedAt,
    ageDays,
    notes: cycle.notes ?? null,
  };
}

async function getOwnedRacks({ userId, rackId }: RackQuery): Promise<any[]> {
  const where: Record<string, unknown> = { userId, status: "ACTIVE" };
  if (rackId) where.id = rackId;

  return prisma.rack.findMany({
    where: where as never,
    orderBy: { createdAt: "desc" },
    take: 20,
    include: {
      rows: {
        orderBy: { rowNumber: "asc" },
        include: {
          trays: {
            orderBy: { slot: "asc" },
            include: {
              cycles: {
                where: { status: { in: ["GROWING", "READY"] } },
                orderBy: { createdAt: "desc" },
                take: 1,
              },
            },
          },
        },
      },
      device: {
        include: {
          deviceModel: true,
          state: true,
        },
      },
    },
  }) as Promise<any[]>;
}

export async function getMyRackCropSnapshot(query: RackQuery) {
  const racks = await getOwnedRacks(query);
  if (query.rackId && racks.length === 0) {
    return { error: "Rack not found or it does not belong to this user." };
  }

  return Promise.all(
    racks.map(async (rack) => {
      const deviceId = rack.device?.id ?? rack.deviceId ?? null;
      const telemetry = deviceId
        ? await prisma.deviceTelemetry.findMany({
            where: { deviceId },
            orderBy: { recordedAt: "desc" },
            take: 5,
          })
        : [];

      return {
        rack: {
          id: rack.id,
          name: rack.name,
          status: rack.status,
          createdAt: rack.createdAt,
          rowCount: rack.rowCount,
          traysPerRow: rack.traysPerRow,
        },
        device: rack.device
          ? {
              id: rack.device.id,
              deviceCode: rack.device.deviceCode,
              status: rack.device.status,
              lastSeenAt: rack.device.lastSeenAt,
              model: rack.device.deviceModel?.name ?? rack.device.deviceModel?.code ?? null,
              actualState: rack.device.state?.actual ?? {},
              desiredState: rack.device.state?.desired ?? {},
              lastReportedAt: rack.device.state?.lastReportedAt ?? null,
            }
          : null,
        rows: (rack.rows ?? []).map((row: any) => ({
          id: row.id,
          name: row.name,
          rowNumber: row.rowNumber,
          temperatureSensorKey: row.temperatureSensorKey ?? null,
          humiditySensorKey: row.humiditySensorKey ?? null,
          lightSensorKey: row.lightSensorKey ?? null,
          trays: (row.trays ?? []).map((tray: any) => ({
            id: tray.id,
            name: tray.name,
            slot: tray.slot,
            currentCrop: latestCycle(tray.cycles),
          })),
        })),
        recentTelemetry: telemetry.map((item: any) => ({
          recordedAt: item.recordedAt,
          data: item.data,
          temperature: item.temperature,
          humidity: item.humidity,
        })),
      };
    }),
  );
}

export async function getMySensorTrends(args: RackQuery & { hours: number; sinceSowing?: boolean }) {
  const racks = await getOwnedRacks(args);
  if (args.rackId && racks.length === 0) {
    return { error: "Rack not found or it does not belong to this user." };
  }

  if (args.sinceSowing && !args.rackId) {
    return { error: "Provide a rackId to summarize sensor history since the active crop was sown." };
  }

  return Promise.all(
    racks.map(async (rack) => {
      const deviceId = rack.device?.id ?? rack.deviceId ?? null;
      if (!deviceId) {
        return { rackId: rack.id, rackName: rack.name, sampleCount: 0, trends: {} };
      }

      const cropSowingDates = (rack.rows ?? [])
        .flatMap((row: any) => row.trays ?? [])
        .flatMap((tray: any) => tray.cycles ?? [])
        .map((cycle: any) => new Date(cycle.sowingDate).getTime())
        .filter((time: number) => Number.isFinite(time));
      const earliestSowing = cropSowingDates.length ? Math.min(...cropSowingDates) : null;
      if (args.sinceSowing && earliestSowing === null) {
        return {
          rackId: rack.id,
          rackName: rack.name,
          error: "No active crop cycle with a sowing date was found for this rack.",
        };
      }

      const since = args.sinceSowing && earliestSowing !== null
        ? new Date(earliestSowing)
        : new Date(Date.now() - args.hours * 60 * 60 * 1000);
      const recordLimit = args.sinceSowing ? 20_000 : 500;
      const telemetry = await prisma.deviceTelemetry.findMany({
        where: { deviceId, recordedAt: { gte: since } },
        // Select the newest bounded set, then reverse for chronological first/latest values.
        orderBy: { recordedAt: "desc" },
        take: recordLimit,
      });

      const samples = new Map<string, Array<{ value: number; at: string }>>();
      for (const row of [...(telemetry as any[])].reverse()) {
        const data = asRecord(row.data);
        const values: Record<string, unknown> = { ...data };
        if (typeof row.temperature === "number" && values.temperature === undefined) {
          values.temperature = row.temperature;
        }
        if (typeof row.humidity === "number" && values.humidity === undefined) {
          values.humidity = row.humidity;
        }

        for (const [key, value] of Object.entries(values)) {
          if (typeof value !== "number" || !Number.isFinite(value)) continue;
          const list = samples.get(key) ?? [];
          list.push({ value, at: new Date(row.recordedAt).toISOString() });
          samples.set(key, list);
        }
      }

      const trends: Record<string, unknown> = {};
      for (const [key, list] of samples.entries()) {
        const values = list.map((point) => point.value);
        const sum = values.reduce((total, value) => total + value, 0);
        trends[key] = {
          samples: list.length,
          first: list[0],
          latest: list[list.length - 1],
          min: Math.min(...values),
          max: Math.max(...values),
          average: Math.round((sum / values.length) * 100) / 100,
          change: Math.round((values[values.length - 1]! - values[0]!) * 100) / 100,
        };
      }

      return {
        rackId: rack.id,
        rackName: rack.name,
        deviceId,
        since: since.toISOString(),
        window: args.sinceSowing ? "since earliest active crop sowing date" : `last ${args.hours} hour(s)`,
        sampleCount: telemetry.length,
        mayBeTruncated: telemetry.length >= recordLimit,
        trends,
      };
    }),
  );
}

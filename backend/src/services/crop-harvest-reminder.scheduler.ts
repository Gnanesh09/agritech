import { prisma } from "../lib/prisma";
import { sendCropHarvestEmail, type CropHarvestEmailKind } from "./crop-harvest-email.service";

const CHECK_INTERVAL_MS = 15 * 60 * 1000;
const DAY_MS = 24 * 60 * 60 * 1000;
let timer: NodeJS.Timeout | null = null;
let running = false;

type ReminderField = "preHarvestReminderSentAt" | "harvestDueReminderSentAt" | "overdueHarvestReminderSentAt";
type CycleWithOwner = {
  id: string;
  cropName: string;
  expectedHarvestDate: Date;
  tray: {
    name: string;
    row: {
      rack: {
        name: string;
        user: { id: string; username: string; email: string | null };
      };
    };
  };
};

async function releaseClaim(cycleId: string, field: ReminderField, claimedAt: Date) {
  await prisma.trayCropCycle.updateMany({
    where: { id: cycleId, [field]: claimedAt } as any,
    data: { [field]: null } as any,
  });
}

async function claimAndSend(cycle: CycleWithOwner, field: ReminderField, kind: CropHarvestEmailKind) {
  const claimedAt = new Date();
  const claim = await prisma.trayCropCycle.updateMany({
    where: { id: cycle.id, status: { in: ["GROWING", "READY"] }, [field]: null } as any,
    data: { [field]: claimedAt } as any,
  });
  if (claim.count === 0) return;

  const { tray } = cycle;
  const rack = tray.row.rack;
  const user = rack.user;
  if (!user?.email) {
    console.warn(`[crop-reminders] No email address for cycle ${cycle.id}; will retry after profile is fixed.`);
    await releaseClaim(cycle.id, field, claimedAt);
    return;
  }

  try {
    await sendCropHarvestEmail({
      to: user.email,
      username: user.username,
      cropName: cycle.cropName,
      trayName: tray.name,
      rackName: rack.name,
      expectedHarvestDate: cycle.expectedHarvestDate,
      kind,
    });
    console.info(`[crop-reminders] Sent ${kind} email for crop cycle ${cycle.id}.`);
  } catch (error) {
    await releaseClaim(cycle.id, field, claimedAt).catch((releaseError) => {
      console.error(`[crop-reminders] Could not release claim for ${cycle.id}:`, releaseError);
    });
    console.error(`[crop-reminders] Failed ${kind} email for cycle ${cycle.id}; next pass will retry:`, error);
  }
}

async function loadCycles(where: any): Promise<CycleWithOwner[]> {
  return prisma.trayCropCycle.findMany({
    where: {
      ...where,
      status: { in: ["GROWING", "READY"] },
      tray: { row: { rack: { status: "ACTIVE" } } },
    },
    include: {
      tray: {
        include: {
          row: { include: { rack: { include: { user: { select: { id: true, username: true, email: true } } } } } },
        },
      },
    },
    orderBy: { expectedHarvestDate: "asc" },
  }) as unknown as Promise<CycleWithOwner[]>;
}

export async function runCropHarvestReminderPass() {
  if (running) return;
  running = true;
  const now = new Date();
  try {
    await prisma.trayCropCycle.updateMany({
      where: { status: "GROWING", expectedHarvestDate: { lte: now }, tray: { row: { rack: { status: "ACTIVE" } } } },
      data: { status: "READY" },
    });

    const upcoming = await loadCycles({
      expectedHarvestDate: { gt: now, lte: new Date(now.getTime() + DAY_MS) },
      preHarvestReminderSentAt: null,
    });
    for (const cycle of upcoming) await claimAndSend(cycle, "preHarvestReminderSentAt", "UPCOMING");

    const due = await loadCycles({
      expectedHarvestDate: { lte: now, gt: new Date(now.getTime() - DAY_MS) },
      harvestDueReminderSentAt: null,
    });
    for (const cycle of due) await claimAndSend(cycle, "harvestDueReminderSentAt", "DUE");

    const overdue = await loadCycles({
      expectedHarvestDate: { lte: new Date(now.getTime() - DAY_MS) },
      overdueHarvestReminderSentAt: null,
    });
    for (const cycle of overdue) await claimAndSend(cycle, "overdueHarvestReminderSentAt", "OVERDUE");
  } catch (error) {
    console.error("[crop-reminders] Scheduler pass failed:", error);
  } finally {
    running = false;
  }
}

export function startCropHarvestReminderScheduler() {
  if (timer) return;
  console.info("[crop-reminders] Scheduler started; checking every 15 minutes.");
  void runCropHarvestReminderPass();
  timer = setInterval(() => void runCropHarvestReminderPass(), CHECK_INTERVAL_MS);
  timer.unref?.();
}

export function stopCropHarvestReminderScheduler() {
  if (timer) clearInterval(timer);
  timer = null;
}

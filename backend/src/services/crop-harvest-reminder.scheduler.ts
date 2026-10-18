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
  [key: string]: any;
};

async function claimAndSend(cycle: CycleWithOwner, field: ReminderField, kind: CropHarvestEmailKind) {
  const claimedAt = new Date();
  const claim = await prisma.trayCropCycle.updateMany({
    where: { id: cycle.id, [field]: null } as any,
    data: { [field]: claimedAt } as any,
  });
  if (claim.count === 0) return;

  try {
    const tray = cycle.tray;
    const row = tray.row;
    const rack = row.rack;
    const user = rack.user;
    if (!user?.email) {
      console.warn(`[crop-reminders] Skipping cycle ${cycle.id}: user has no email address.`);
      return;
    }
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
    // Make the reminder eligible for a retry on the next scheduler pass.
    await prisma.trayCropCycle.updateMany({
      where: { id: cycle.id, [field]: claimedAt } as any,
      data: { [field]: null } as any,
    });
    console.error(`[crop-reminders] Failed to send ${kind} email for cycle ${cycle.id}:`, error);
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
  }) as Promise<CycleWithOwner[]>;
}

export async function runCropHarvestReminderPass() {
  if (running) return;
  running = true;
  const now = new Date();
  try {
    // Persist READY once the expected date passes; user-facing status won't depend on opening the app.
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
      expectedHarvestDate: { lte: now },
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

// Call once from the backend's main startup file, after environment variables and Prisma are configured.
export function startCropHarvestReminderScheduler() {
  if (timer) return;
  void runCropHarvestReminderPass();
  timer = setInterval(() => void runCropHarvestReminderPass(), CHECK_INTERVAL_MS);
  timer.unref?.();
}

export function stopCropHarvestReminderScheduler() {
  if (timer) clearInterval(timer);
  timer = null;
}

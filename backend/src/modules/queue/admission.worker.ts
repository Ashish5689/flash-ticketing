import { env } from "../../config/env";
import { logger } from "../../shared/logger";
import { activeQueueEventIds, admitBatchForEvent } from "./queue.service";

let timer: NodeJS.Timeout | null = null;

export function startAdmissionWorker() {
  if (timer) return;
  timer = setInterval(async () => {
    try {
      const eventIds = await activeQueueEventIds();
      await Promise.all(eventIds.map((eventId) => admitBatchForEvent(eventId)));
    } catch (error) {
      logger.error({ error }, "Admission worker failed");
    }
  }, env.QUEUE_ADMIT_INTERVAL_MS);
}

export function stopAdmissionWorker() {
  if (timer) clearInterval(timer);
  timer = null;
}

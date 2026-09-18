import { borrowingRepository } from "../repositories/borrowing.repository";
import { logger } from "../utils/logger";

const CHECK_INTERVAL_MS = 10 * 60 * 1000;

export function startBorrowingScheduler() {
  const runBorrowingJobs = async () => {
    const now = new Date();

    try {
      const tag = `[cron] [LDT-25]`;
      const rejected = await borrowingRepository.rejectExpiredPending(now);
      if (rejected > 0) {
        logger.info(`${tag} auto-rejected ${rejected} expired pending borrowing(s)`);
      }
    } catch (error: any) {
      logger.error(`[cron] [LDT-25] Error: ${error.message} \n${error.stack}`);
    }

    try {
      const tag = `[cron] [LDT-26]`;
      const returned = await borrowingRepository.autoReturnOverdue(now);
      if (returned > 0) {
        logger.info(`${tag} auto-returned ${returned} overdue borrowing(s)`);
      }
    } catch (error: any) {
      logger.error(`[cron] [LDT-26] Error: ${error.message} \n${error.stack}`);
    }
  };

  void runBorrowingJobs();
  const timer = setInterval(() => void runBorrowingJobs(), CHECK_INTERVAL_MS);

  timer.unref?.();
  return timer;
}

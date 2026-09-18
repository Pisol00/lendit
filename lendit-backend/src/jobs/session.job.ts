import { authSessionRepository } from "../repositories/auth-session.repository";
import { logger } from "../utils/logger";

const CLEANUP_INTERVAL_MS = 60 * 60 * 1000;

export function startSessionScheduler() {
  const runCleanup = async () => {
    const tag = `[cron] [LDT-27]`;
    try {
      const removed = await authSessionRepository.removeExpired(new Date());
      if (removed > 0) {
        logger.info(`${tag} removed ${removed} expired session(s)`);
      }
    } catch (error: any) {
      logger.error(`${tag} Error: ${error.message} \n${error.stack}`);
    }
  };

  void runCleanup();
  const timer = setInterval(() => void runCleanup(), CLEANUP_INTERVAL_MS);

  timer.unref?.();
  return timer;
}

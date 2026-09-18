import { response } from "../utils/response";
import { dashboardRepository } from "../repositories/dashboard.repository";
import { logger } from "../utils/logger";
import { validateDashboardQuery } from "../validators/dashboard.validator";

export const dashboardController = {
  async overview(ctx: any) {
    const tag = `[${ctx.requestId}] [LDT-21]`;
    try {
      const validation = validateDashboardQuery(ctx.query);
      if (!validation.success) {
        logger.warn(`${tag} validation failed`);
        return response.validationError(ctx, validation.errors);
      }

      const now = new Date();
      const anchor = validation.data.month ?? now;
      const monthStart = new Date(anchor.getFullYear(), anchor.getMonth(), 1);
      const monthEnd = new Date(
        anchor.getFullYear(),
        anchor.getMonth() + 1,
        0,
        23,
        59,
        59,
        999,
      );

      const { allTime } = validation.data;
      const chartStart = allTime ? null : monthStart;
      const chartEnd = allTime ? null : monthEnd;

      const from = validation.data.from ?? chartStart;
      const to = validation.data.to ?? chartEnd;

      const [stats, topBooks, topOwners, topBorrowers, booksByTag, perDay] =
        await Promise.all([
          dashboardRepository.countStats(),
          dashboardRepository.topBorrowedBooks(from, to),
          dashboardRepository.topBorrowedOwners(from, to),
          dashboardRepository.topBorrowers(from, to),
          dashboardRepository.booksByTag(),
          dashboardRepository.borrowReturnPerDay(chartStart, chartEnd),
        ]);

      logger.info(`${tag} overview generated`);
      return response.ok(ctx, {
        stats,
        topBooks,
        topOwners,
        topBorrowers,
        booksByTag,
        perDay,
      });
    } catch (error: any) {
      logger.error(`${tag} Error: ${error.message} \n${error.stack}`);
      return response.serverError(ctx);
    }
  },
};

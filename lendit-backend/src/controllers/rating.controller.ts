import { response } from "../utils/response";
import { logger } from "../utils/logger";
import { Role } from "../models/account.model";
import { RaterRole } from "../models/rating.model";
import { BorrowingStatus } from "../models/borrowing.model";
import { ratingRepository } from "../repositories/rating.repository";
import { borrowingRepository } from "../repositories/borrowing.repository";
import { accountRepository } from "../repositories/account.repository";
import {
  validateRatingBody,
  validateRatingListQuery,
  validateModerationListQuery,
} from "../validators/rating.validator";

const RATING_WINDOW_DAYS = 7;
const RATING_WINDOW_MS = RATING_WINDOW_DAYS * 24 * 60 * 60 * 1000;

export const ratingController = {

  async create(ctx: any) {
    const tag = `[${ctx.requestId}] [LDT-28]`;
    try {
      const validation = validateRatingBody(ctx.body);
      if (!validation.success) {
        logger.warn(`${tag} validation failed`);
        return response.validationError(ctx, validation.errors);
      }
      const { borrowingId, rating, comment } = validation.data;

      const borrowing = await borrowingRepository.findById(borrowingId);
      if (!borrowing) {
        logger.warn(`${tag} rejected: borrowing ${borrowingId} not found`);
        return response.badRequest(ctx, "Borrowing not found");
      }

      const raterId = ctx.user.sub;
      const isOwner = borrowing.owner.toString() === raterId;
      const isBorrower = borrowing.borrower.toString() === raterId;
      if (!isOwner && !isBorrower) {
        logger.warn(`${tag} rejected: user ${raterId} is not part of borrowing ${borrowingId}`);
        return response.badRequest(ctx, "You are not part of this borrowing");
      }
      const raterRole = isOwner ? RaterRole.Owner : RaterRole.Borrower;
      const rateeId = isOwner ? borrowing.borrower : borrowing.owner;

      if (borrowing.status !== BorrowingStatus.Returned) {
        logger.warn(`${tag} rejected: cannot rate a ${borrowing.status} borrowing ${borrowingId}`);
        return response.badRequest(
          ctx,
          `Cannot rate a ${borrowing.status} borrowing`,
        );
      }

      if (!borrowing.returnedDate) {
        logger.warn(`${tag} rejected: borrowing ${borrowingId} has no returnedDate`);
        return response.badRequest(ctx, "Cannot rate this borrowing");
      }

      const deadline = new Date(borrowing.returnedDate.getTime() + RATING_WINDOW_MS);
      if (Date.now() > deadline.getTime()) {
        logger.warn(`${tag} rejected: rating window closed for borrowing ${borrowingId} (returned ${borrowing.returnedDate.toISOString()})`);
        return response.badRequest(
          ctx,
          `Rating is only allowed within ${RATING_WINDOW_DAYS} days after the return date`,
        );
      }

      const existing = await ratingRepository.findByBorrowingAndRaterIncludingDeleted(
        borrowingId,
        raterId,
      );
      if (existing) {
        if (existing.deletedAt) {
          logger.warn(`${tag} rejected: user ${raterId} had a removed rating for borrowing ${borrowingId}`);
          return response.badRequest(
            ctx,
            "Your review for this borrowing was removed and cannot be rewritten",
          );
        }
        logger.warn(`${tag} rejected: user ${raterId} already rated borrowing ${borrowingId}`);
        return response.badRequest(ctx, "You have already rated this borrowing");
      }

      const created = await ratingRepository.createChecked({
        borrowingId,
        raterId,
        rateeId,
        raterRole,
        rating,
        comment,
        windowMs: RATING_WINDOW_MS,
      });
      if (!created) {
        logger.warn(`${tag} rejected: borrowing ${borrowingId} no longer returned`);
        return response.badRequest(ctx, "Cannot rate this borrowing");
      }

      logger.info(`${tag} rating created for borrowing ${borrowingId} by ${raterId} as ${raterRole}`);
      return response.ok(ctx, created);
    } catch (error: any) {

      if (error.code === 11000) {
        logger.warn(`${tag} rejected: duplicate rating (unique index)`);
        return response.badRequest(ctx, "You have already rated this borrowing");
      }
      logger.error(`${tag} Error: ${error.message} \n${error.stack}`);
      return response.serverError(ctx);
    }
  },

  async listByBorrowing(ctx: any) {
    const tag = `[${ctx.requestId}] [LDT-29]`;
    try {
      const { borrowingId } = ctx.params;
      const borrowing = await borrowingRepository.findById(borrowingId);
      if (!borrowing) {
        logger.warn(`${tag} rejected: borrowing ${borrowingId} not found`);
        return response.badRequest(ctx, "Borrowing not found");
      }

      const userId = ctx.user.sub;
      if (
        borrowing.owner.toString() !== userId &&
        borrowing.borrower.toString() !== userId
      ) {
        logger.warn(`${tag} rejected: user ${userId} is not part of borrowing ${borrowingId}`);
        return response.badRequest(ctx, "You are not part of this borrowing");
      }

      const hiddenRaterIds = await accountRepository.hiddenAccountIds();
      const ratings = await ratingRepository.listByBorrowing(
        borrowingId,
        hiddenRaterIds,
      );
      logger.info(`${tag} listed ${ratings.length} ratings for borrowing ${borrowingId}`);
      return response.ok(ctx, ratings);
    } catch (error: any) {
      logger.error(`${tag} Error: ${error.message} \n${error.stack}`);
      return response.serverError(ctx);
    }
  },

  async listByAccount(ctx: any) {
    const tag = `[${ctx.requestId}] [LDT-30]`;
    try {
      const validation = validateRatingListQuery(ctx.query);
      if (!validation.success) {
        logger.warn(`${tag} validation failed`);
        return response.validationError(ctx, validation.errors);
      }
      const { page, limit, skip, raterRole } = validation.data;

      const { accountId } = ctx.params;
      const account = await accountRepository.findActiveById(accountId);
      if (!account) {
        logger.warn(`${tag} rejected: account ${accountId} not found or suspended`);
        return response.badRequest(ctx, "Account not found");
      }

      const hiddenRaterIds = await accountRepository.hiddenAccountIds();
      const { items, total } = await ratingRepository.listByRatee(
        accountId,
        skip,
        limit,
        raterRole,
        hiddenRaterIds,
      );
      logger.info(`${tag} listed ${items.length}/${total} ratings for account ${accountId} (role=${ctx.query.role ?? "all"})`);
      return response.ok(ctx, {
        items,
        pagination: {
          page,
          limit,
          total,
          totalPages: Math.max(1, Math.ceil(total / limit)),
        },
      });
    } catch (error: any) {
      logger.error(`${tag} Error: ${error.message} \n${error.stack}`);
      return response.serverError(ctx);
    }
  },

  async listForModeration(ctx: any) {
    const tag = `[${ctx.requestId}] [LDT-33]`;
    try {

      if (ctx.user.role !== Role.Admin) {
        logger.warn(`${tag} rejected: non-admin user ${ctx.user.sub}`);
        return response.unauthorized(ctx);
      }

      const validation = validateModerationListQuery(ctx.query);
      if (!validation.success) {
        logger.warn(`${tag} validation failed`);
        return response.validationError(ctx, validation.errors);
      }
      const { page, limit, skip, rating, raterId, rateeId, search, status } =
        validation.data;

      const { items, total } = await ratingRepository.listForModeration(
        skip,
        limit,
        { rating, raterId, rateeId, search, status },
      );
      logger.info(
        `${tag} listed ${items.length}/${total} ratings for moderation (status=${status}, rating=${rating ?? "all"}, rater=${raterId ?? "all"}, ratee=${rateeId ?? "all"}, search=${search ?? "none"})`,
      );
      return response.ok(ctx, {
        items,
        pagination: {
          page,
          limit,
          total,
          totalPages: Math.max(1, Math.ceil(total / limit)),
        },
      });
    } catch (error: any) {
      logger.error(`${tag} Error: ${error.message} \n${error.stack}`);
      return response.serverError(ctx);
    }
  },

  async remove(ctx: any) {
    const tag = `[${ctx.requestId}] [LDT-32]`;
    try {

      if (ctx.user.role !== Role.Admin) {
        logger.warn(`${tag} rejected: non-admin user ${ctx.user.sub}`);
        return response.unauthorized(ctx);
      }

      const { id } = ctx.params;
      const rating = await ratingRepository.findById(id);
      if (!rating) {

        if (await ratingRepository.findDeletedById(id)) {
          logger.warn(`${tag} rejected: rating ${id} was already removed`);
          return response.badRequest(ctx, "This rating was already removed");
        }
        logger.warn(`${tag} rejected: rating ${id} not found`);
        return response.badRequest(ctx, "Rating not found");
      }

      await ratingRepository.softDelete(rating);
      logger.info(`${tag} rating ${id} deleted by admin ${ctx.user.sub}`);
      return response.empty(ctx, 200);
    } catch (error: any) {
      logger.error(`${tag} Error: ${error.message} \n${error.stack}`);
      return response.serverError(ctx);
    }
  },

  async restore(ctx: any) {
    const tag = `[${ctx.requestId}] [LDT-34]`;
    try {

      if (ctx.user.role !== Role.Admin) {
        logger.warn(`${tag} rejected: non-admin user ${ctx.user.sub}`);
        return response.unauthorized(ctx);
      }

      const { id } = ctx.params;

      const rating = await ratingRepository.findDeletedById(id);
      if (!rating) {
        logger.warn(`${tag} rejected: deleted rating ${id} not found`);
        return response.badRequest(ctx, "Deleted rating not found");
      }

      const restored = await ratingRepository.restore(rating);
      logger.info(`${tag} rating ${id} restored by admin ${ctx.user.sub}`);
      return response.ok(ctx, restored.toJSON());
    } catch (error: any) {
      logger.error(`${tag} Error: ${error.message} \n${error.stack}`);
      return response.serverError(ctx);
    }
  },

  async summaryByAccount(ctx: any) {
    const tag = `[${ctx.requestId}] [LDT-31]`;
    try {

      const { accountId } = ctx.params;
      const account = await accountRepository.findActiveById(accountId);
      if (!account) {
        logger.warn(`${tag} rejected: account ${accountId} not found or suspended`);
        return response.badRequest(ctx, "Account not found");
      }

      const hiddenRaterIds = await accountRepository.hiddenAccountIds();
      const summary = await ratingRepository.summaryByRatee(
        accountId,
        hiddenRaterIds,
      );
      logger.info(`${tag} rating summary for account ${accountId} (${summary.overall.count} ratings)`);
      return response.ok(ctx, summary);
    } catch (error: any) {
      logger.error(`${tag} Error: ${error.message} \n${error.stack}`);
      return response.serverError(ctx);
    }
  },
};

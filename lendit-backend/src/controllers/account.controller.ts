import { response } from "../utils/response";
import { Role } from "../models/account.model";
import { accountRepository } from "../repositories/account.repository";
import { bookRepository } from "../repositories/book.repository";
import { borrowingRepository } from "../repositories/borrowing.repository";
import { logger } from "../utils/logger";
import { comparePassword, hashPassword } from "../utils/password";
import {
  validateAccountListQuery,
  validateUpdateAccountMeBody,
} from "../validators/account.validator";

export const accountController = {
  async list(ctx: any) {
    const tag = `[${ctx.requestId}] [LDT-03]`;
    try {
      const validation = validateAccountListQuery(ctx.query);
      if (!validation.success) {
        logger.warn(`${tag} validation failed`);
        return response.validationError(ctx, validation.errors);
      }
      const { page, limit, skip, search, sortBy, sortOrder } = validation.data;
      const filter: Record<string, any> = {};
      if (search) {

        const escaped = search.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
        filter.$or = [
          { firstName: { $regex: escaped, $options: "i" } },
          { lastName: { $regex: escaped, $options: "i" } },
          { email: { $regex: escaped, $options: "i" } },
        ];
      }

      const { items, total } = await accountRepository.findAll(
        filter,
        sortBy,
        sortOrder,
        skip,
        limit,
      );
      logger.info(`${tag} listed ${items.length}/${total} accounts`);
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

  async getById(ctx: any) {
    const tag = `[${ctx.requestId}] [LDT-04]`;
    try {
      const { id } = ctx.params;
      const account = await accountRepository.findById(id);
      if (!account) {
        logger.warn(`${tag} rejected: account ${id} not found`);
        return response.badRequest(ctx, "Account not found");
      }
      logger.info(`${tag} account ${id} fetched`);
      return response.ok(ctx, account);
    } catch (error: any) {
      logger.error(`${tag} Error: ${error.message} \n${error.stack}`);
      return response.serverError(ctx);
    }
  },

  async updateMe(ctx: any) {
    const tag = `[${ctx.requestId}] [LDT-07]`;
    try {
      const validation = validateUpdateAccountMeBody(ctx.body);
      if (!validation.success) {
        logger.warn(`${tag} validation failed`);
        return response.validationError(ctx, validation.errors);
      }
      const { firstName, lastName, email, currentPassword, newPassword } =
        validation.data;

      const account = await accountRepository.findByIdWithPassword(
        ctx.user.sub,
      );
      if (!account) {
        logger.warn(`${tag} rejected: account ${ctx.user.sub} not found`);
        return response.badRequest(ctx, "Account not found");
      }

      if (
        email !== account.email &&
        (await accountRepository.findByEmailExcept(email, ctx.user.sub))
      ) {
        logger.warn(`${tag} rejected: email ${email} already exists`);
        return response.badRequest(ctx, "Email already exists");
      }

      if (
        newPassword !== undefined &&
        !(await comparePassword(currentPassword!, account.password))
      ) {
        logger.warn(`${tag} rejected: incorrect current password for ${ctx.user.sub}`);
        return response.unauthorized(ctx, "Current password is incorrect");
      }

      account.firstName = firstName;
      account.lastName = lastName;
      account.email = email;
      if (newPassword !== undefined) {
        account.password = await hashPassword(newPassword);
      }
      const updated = await accountRepository.update(account);
      logger.info(`${tag} account ${ctx.user.sub} updated`);

      const { password, ...publicAccount } = updated;
      return response.ok(ctx, publicAccount);
    } catch (error: any) {
      logger.error(`${tag} Error: ${error.message} \n${error.stack}`);
      return response.serverError(ctx);
    }
  },

  async setStatus(ctx: any) {
    const tag = `[${ctx.requestId}] [LDT-08]`;
    try {
      const { id } = ctx.params;
      const { isActive } = ctx.body;
      if (typeof isActive !== "boolean") {
        logger.warn(`${tag} rejected: isActive not a boolean`);
        return response.badRequest(ctx, "isActive must be a boolean");
      }
      const account = await accountRepository.findMemberById(id);
      if (!account) {
        logger.warn(`${tag} rejected: account ${id} not a member`);
        return response.badRequest(
          ctx,
          "Only member accounts can be activated or suspended",
        );
      }
      account.isActive = isActive;
      const updated = await accountRepository.update(account);
      logger.info(
        `${tag} account ${id} status set to ${account.isActive}`,
      );
      return response.ok(ctx, updated);
    } catch (error: any) {
      logger.error(`${tag} Error: ${error.message} \n${error.stack}`);
      return response.serverError(ctx);
    }
  },

  async remove(ctx: any) {
    const tag = `[${ctx.requestId}] [LDT-09]`;
    try {
      const { id } = ctx.params;
      const account = await accountRepository.findMemberById(id);
      if (!account) {
        logger.warn(`${tag} rejected: account ${id} not a member`);
        return response.badRequest(ctx, "Only member accounts can be deleted");
      }

      if (await borrowingRepository.hasActiveByBorrower(id)) {
        logger.warn(`${tag} rejected: account ${id} has active borrowings`);
        return response.badRequest(
          ctx,
          "Account has active borrowings and cannot be deleted",
        );
      }

      const ownedBookIds = await bookRepository.findIdsByOwner(id);
      if (
        ownedBookIds.length &&
        (await borrowingRepository.hasActiveByBooks(ownedBookIds))
      ) {
        logger.warn(`${tag} rejected: account ${id} owns actively borrowed books`);
        return response.badRequest(
          ctx,
          "Account owns books that are currently borrowed and cannot be deleted",
        );
      }

      const { rejected, cancelled, ratingsRemoved } =
        await borrowingRepository.deleteAccountWithPendingCleanup(
          account,
          ownedBookIds,
        );
      logger.info(
        `${tag} account ${id} deleted (auto-rejected ${rejected}, auto-cancelled ${cancelled} pending request(s), removed ${ratingsRemoved} rating(s))`,
      );
      return response.empty(ctx, 200);
    } catch (error: any) {
      logger.error(`${tag} Error: ${error.message} \n${error.stack}`);
      return response.serverError(ctx);
    }
  },
};

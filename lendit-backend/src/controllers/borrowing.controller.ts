import { response } from "../utils/response";
import { BorrowingStatus } from "../models/borrowing.model";
import { borrowingRepository } from "../repositories/borrowing.repository";
import { bookRepository } from "../repositories/book.repository";
import { logger } from "../utils/logger";
import {
  validateBorrowingListQuery,
  validateBorrowingRequest,
} from "../validators/borrowing.validator";

export const borrowingController = {
  async list(ctx: any) {
    const tag = `[${ctx.requestId}] [LDT-15]`;
    try {
      const validation = validateBorrowingListQuery(ctx.query);
      if (!validation.success) {
        logger.warn(`${tag} validation failed`);
        return response.validationError(ctx, validation.errors);
      }
      const { page, limit, skip, role, status: borrowingStatus } =
        validation.data;

      const filter: Record<string, any> = {};

      if (borrowingStatus) filter.status = borrowingStatus;

      if (role === "owner") {
        filter.owner = ctx.user.sub;
      } else {
        filter.borrower = ctx.user.sub;
      }

      const { items, total } = await borrowingRepository.list(
        filter,
        skip,
        limit,
      );
      logger.info(`${tag} listed ${items.length}/${total} borrowings (role=${role})`);
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

  async request(ctx: any) {
    const tag = `[${ctx.requestId}] [LDT-16]`;
    try {
      const validation = validateBorrowingRequest(ctx.body);
      if (!validation.success) {
        logger.warn(`${tag} validation failed`);
        return response.validationError(ctx, validation.errors);
      }
      const { bookId, startDate, dueDate } = validation.data;
      const book = await bookRepository.findById(bookId);
      if (!book) {
        logger.warn(`${tag} rejected: book ${bookId} not found`);
        return response.badRequest(ctx, "Book not found");
      }
      if (book.owner.toString() === ctx.user.sub) {
        logger.warn(`${tag} rejected: user cannot borrow own book ${bookId}`);
        return response.badRequest(ctx, "You cannot borrow your own book");
      }

      const overlapCount = await borrowingRepository.countOverlappingApproved(
        book._id,
        startDate,
        dueDate,
      );
      if (overlapCount >= book.quantity) {
        logger.warn(`${tag} rejected: book ${bookId} fully booked for this period`);
        return response.badRequest(ctx, "This time period is fully booked");
      }

      const borrowing = await borrowingRepository.create({
        book: book._id,
        owner: book.owner,
        borrower: ctx.user.sub,
        startDate,
        dueDate,
        status: BorrowingStatus.Pending,
      });
      logger.info(`${tag} borrowing ${String(borrowing._id)} created`);
      return response.ok(ctx, borrowing);
    } catch (error: any) {
      logger.error(`${tag} Error: ${error.message} \n${error.stack}`);
      return response.serverError(ctx);
    }
  },

  async approve(ctx: any) {
    const tag = `[${ctx.requestId}] [LDT-17]`;
    try {
      const { id } = ctx.params;
      const borrowing = await borrowingRepository.findById(id);
      if (!borrowing) {
        logger.warn(`${tag} rejected: borrowing ${id} not found`);
        return response.badRequest(ctx, "Borrowing not found");
      }
      if (borrowing.status !== BorrowingStatus.Pending) {
        logger.warn(`${tag} rejected: cannot approve a ${borrowing.status} borrowing ${id}`);
        return response.badRequest(ctx, `Cannot approve a ${borrowing.status} borrowing`);
      }

      const book = await bookRepository.findById(borrowing.book);
      if (!book) {
        logger.warn(`${tag} rejected: book ${borrowing.book} not found`);
        return response.badRequest(ctx, "Book not found");
      }
      if (book.owner.toString() !== ctx.user.sub) {
        logger.warn(`${tag} rejected: user does not own book ${borrowing.book}`);
        return response.badRequest(ctx, "You do not own this book");
      }

      const result = await borrowingRepository.approveAndReject(
        borrowing,
        book.quantity,
      );
      if (!result) {
        logger.warn(`${tag} rejected: borrowing ${id} time period fully booked`);
        return response.badRequest(ctx, "This time period is fully booked");
      }
      if (result.autoRejected > 0) {
        logger.info(
          `${tag} borrowing ${id} approved, auto-rejected ${result.autoRejected} fully-booked pending`,
        );
      } else {
        logger.info(`${tag} borrowing ${id} approved`);
      }
      return response.ok(ctx, result.approved);
    } catch (error: any) {
      logger.error(`${tag} Error: ${error.message} \n${error.stack}`);
      return response.serverError(ctx);
    }
  },

  async reject(ctx: any) {
    const tag = `[${ctx.requestId}] [LDT-18]`;
    try {
      const { id } = ctx.params;
      const borrowing = await borrowingRepository.findById(id);
      if (!borrowing) {
        logger.warn(`${tag} rejected: borrowing ${id} not found`);
        return response.badRequest(ctx, "Borrowing not found");
      }
      if (borrowing.status !== BorrowingStatus.Pending) {
        logger.warn(`${tag} rejected: cannot reject a ${borrowing.status} borrowing ${id}`);
        return response.badRequest(ctx, `Cannot reject a ${borrowing.status} borrowing`);
      }
      const book = await bookRepository.findById(borrowing.book);
      if (!book) {
        logger.warn(`${tag} rejected: book ${borrowing.book} not found`);
        return response.badRequest(ctx, "Book not found");
      }
      if (book.owner.toString() !== ctx.user.sub) {
        logger.warn(`${tag} rejected: user does not own book ${borrowing.book}`);
        return response.badRequest(ctx, "You do not own this book");
      }
      borrowing.status = BorrowingStatus.Rejected;
      const rejected = await borrowingRepository.save(borrowing);
      logger.info(`${tag} borrowing ${id} rejected`);
      return response.ok(ctx, rejected);
    } catch (error: any) {
      logger.error(`${tag} Error: ${error.message} \n${error.stack}`);
      return response.serverError(ctx);
    }
  },

  async cancel(ctx: any) {
    const tag = `[${ctx.requestId}] [LDT-19]`;
    try {
      const { id } = ctx.params;
      const borrowing = await borrowingRepository.findById(id);
      if (!borrowing) {
        logger.warn(`${tag} rejected: borrowing ${id} not found`);
        return response.badRequest(ctx, "Borrowing not found");
      }
      if (borrowing.borrower.toString() !== ctx.user.sub) {
        logger.warn(`${tag} rejected: borrowing ${id} does not belong to user`);
        return response.badRequest(ctx, "This is not your borrowing");
      }
      if (borrowing.status !== BorrowingStatus.Pending) {
        logger.warn(`${tag} rejected: cannot cancel a ${borrowing.status} borrowing ${id}`);
        return response.badRequest(ctx, `Cannot cancel a ${borrowing.status} borrowing`);
      }
      borrowing.status = BorrowingStatus.Cancelled;
      const cancelled = await borrowingRepository.save(borrowing);
      logger.info(`${tag} borrowing ${id} cancelled`);
      return response.ok(ctx, cancelled);
    } catch (error: any) {
      logger.error(`${tag} Error: ${error.message} \n${error.stack}`);
      return response.serverError(ctx);
    }
  },

  async return(ctx: any) {
    const tag = `[${ctx.requestId}] [LDT-20]`;
    try {
      const { id } = ctx.params;
      const borrowing = await borrowingRepository.findById(id);
      if (!borrowing) {
        logger.warn(`${tag} rejected: borrowing ${id} not found`);
        return response.badRequest(ctx, "Borrowing not found");
      }
      if (borrowing.status !== BorrowingStatus.Borrowing) {
        logger.warn(`${tag} rejected: cannot return a ${borrowing.status} borrowing ${id}`);
        return response.badRequest(ctx, `Cannot return a ${borrowing.status} borrowing`);
      }

      const book = await bookRepository.findById(borrowing.book);
      if (!book) {
        logger.warn(`${tag} rejected: book ${borrowing.book} not found`);
        return response.badRequest(ctx, "Book not found");
      }

      if (book.owner.toString() !== ctx.user.sub) {
        logger.warn(`${tag} rejected: only owner can confirm return of book ${borrowing.book}`);
        return response.badRequest(ctx, "Only the owner can confirm the return");
      }

      borrowing.status = BorrowingStatus.Returned;
      borrowing.returnedDate = new Date();
      const returned = await borrowingRepository.save(borrowing);

      logger.info(`${tag} borrowing ${id} returned`);
      return response.ok(ctx, returned);
    } catch (error: any) {
      logger.error(`${tag} Error: ${error.message} \n${error.stack}`);
      return response.serverError(ctx);
    }
  },
};

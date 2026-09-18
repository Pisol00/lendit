import { response } from "../utils/response";
import { bookRepository } from "../repositories/book.repository";
import { tagRepository } from "../repositories/tag.repository";
import { borrowingRepository } from "../repositories/borrowing.repository";
import { logger } from "../utils/logger";
import {
  validateBookBody,
  validateBookListQuery,
} from "../validators/book.validator";

export const bookController = {
  async list(ctx: any) {
    const tag = `[${ctx.requestId}] [LDT-10]`;
    try {
      const validation = validateBookListQuery(ctx.query);
      if (!validation.success) {
        logger.warn(`${tag} validation failed`);
        return response.validationError(ctx, validation.errors);
      }
      const {
        page,
        limit,
        skip,
        search,
        tags,
        sortBy,
        sortOrder,
        mine,
      } = validation.data;
      const filter: Record<string, any> = {};
      if (search) {

        const escaped = search.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
        filter.$or = [
          { title: { $regex: escaped, $options: "i" } },
          { author: { $regex: escaped, $options: "i" } },
        ];
      }

      if (tags.length) filter.tags = { $in: tags };

      if (mine) filter.owner = ctx.user.sub;

      const { items, total } = await bookRepository.list(
        filter,
        sortBy,
        sortOrder,
        skip,
        limit,
      );
      logger.info(`${tag} listed ${items.length}/${total} books`);
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
    const tag = `[${ctx.requestId}] [LDT-11]`;
    try {
      const { id } = ctx.params;
      const book = await bookRepository.findByIdWithOwner(id);
      if (!book) {
        logger.warn(`${tag} rejected: book ${id} not found`);
        return response.badRequest(ctx, "Book not found");
      }
      logger.info(`${tag} book ${id} fetched`);
      return response.ok(ctx, book);
    } catch (error: any) {
      logger.error(`${tag} Error: ${error.message} \n${error.stack}`);
      return response.serverError(ctx);
    }
  },

  async create(ctx: any) {
    const tag = `[${ctx.requestId}] [LDT-12]`;
    try {
      const validation = validateBookBody(ctx.body);
      if (!validation.success) {
        logger.warn(`${tag} validation failed`);
        return response.validationError(ctx, validation.errors);
      }
      const input = validation.data;
      const tags = input.tags ?? [];

      const missingTags = await tagRepository.findMissingIds(tags);
      if (missingTags.length) {
        logger.warn(`${tag} rejected: missing tags ${missingTags.join(", ")}`);
        return response.validationError(
          ctx,
          missingTags.map((tag) => ({
            field: "tags",
            message: `tag does not exist: ${tag}`,
          })),
        );
      }
      const book = await bookRepository.create({
        ...input,
        tags,
        owner: ctx.user.sub,
      });
      logger.info(`${tag} book ${String(book._id)} created`);
      return response.ok(ctx, book);
    } catch (error: any) {

      if (error?.code === 11000) {
        logger.warn(`${tag} rejected: duplicate title+author`);
        return response.badRequest(
          ctx,
          "You already have a book with this title and author",
        );
      }
      logger.error(`${tag} Error: ${error.message} \n${error.stack}`);
      return response.serverError(ctx);
    }
  },

  async update(ctx: any) {
    const tag = `[${ctx.requestId}] [LDT-13]`;
    try {
      const { id } = ctx.params;

      const book = await bookRepository.findById(id);
      if (!book) {
        logger.warn(`${tag} rejected: book ${id} not found`);
        return response.badRequest(ctx, "Book not found");
      }
      if (book.owner.toString() !== ctx.user.sub) {
        logger.warn(`${tag} rejected: user does not own book ${id}`);
        return response.badRequest(ctx, "You do not own this book");
      }

      const validation = validateBookBody(ctx.body);
      if (!validation.success) {
        logger.warn(`${tag} validation failed`);
        return response.validationError(ctx, validation.errors);
      }
      const input = validation.data;

      if (input.tags) {

        const missingTags = await tagRepository.findMissingIds(input.tags);
        if (missingTags.length) {
          logger.warn(`${tag} rejected: missing tags ${missingTags.join(", ")}`);
          return response.validationError(
            ctx,
            missingTags.map((tag) => ({
              field: "tags",
              message: `tag does not exist: ${tag}`,
            })),
          );
        }
      }

      const peak = await borrowingRepository.maxOverlapFromNow(
        book._id,
        new Date(),
      );
      if (input.quantity < peak) {
        logger.warn(`${tag} rejected: quantity ${input.quantity} below peak ${peak} for book ${id}`);
        return response.badRequest(
          ctx,
          `quantity cannot be less than ${peak} (peak concurrent bookings)`,
        );
      }

      book.set(input);
      try {
        const updated = await bookRepository.save(book);
        logger.info(`${tag} book ${id} updated`);
        return response.ok(ctx, updated);
      } catch (error: any) {
        if (error?.code === 11000) {
          logger.warn(`${tag} rejected: duplicate title+author on book ${id}`);
          return response.badRequest(
            ctx,
            "You already have a book with this title and author",
          );
        }
        throw error;
      }
    } catch (error: any) {
      logger.error(`${tag} Error: ${error.message} \n${error.stack}`);
      return response.serverError(ctx);
    }
  },

  async remove(ctx: any) {
    const tag = `[${ctx.requestId}] [LDT-14]`;
    try {
      const { id } = ctx.params;
      const book = await bookRepository.findById(id);

      if (!book) {
        logger.warn(`${tag} rejected: book ${id} not found`);
        return response.badRequest(ctx, "Book not found");
      }
      if (book.owner.toString() !== ctx.user.sub) {
        logger.warn(`${tag} rejected: user does not own book ${id}`);
        return response.badRequest(ctx, "You do not own this book");
      }

      if (await borrowingRepository.hasActiveByBook(id)) {
        logger.warn(`${tag} rejected: book ${id} has active borrowings`);
        return response.badRequest(ctx, "Book has active borrowings");
      }

      const rejected =
        await borrowingRepository.deleteBookWithPendingCleanup(book);
      logger.info(
        `${tag} book ${id} deleted (auto-rejected ${rejected} pending request(s))`,
      );
      return response.ok(ctx, { id });
    } catch (error: any) {
      logger.error(`${tag} Error: ${error.message} \n${error.stack}`);
      return response.serverError(ctx);
    }
  },
};

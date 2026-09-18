import { response } from "../utils/response";
import { tagRepository } from "../repositories/tag.repository";
import { logger } from "../utils/logger";

export const tagController = {
  async list(ctx: any) {
    const tag = `[${ctx.requestId}] [LDT-22]`;
    try {
      const tags = await tagRepository.list();
      logger.info(`${tag} listed ${tags.length} tags`);
      return response.ok(ctx, tags);
    } catch (error: any) {
      logger.error(`${tag} Error: ${error.message} \n${error.stack}`);
      return response.serverError(ctx);
    }
  },

  async create(ctx: any) {
    const tag = `[${ctx.requestId}] [LDT-23]`;
    try {

      const rawName = ctx.body?.name;
      const name =
        typeof rawName === "string" ? rawName.trim().toLowerCase() : "";

      if (!/^[a-z0-9]{3,20}$/.test(name)) {
        logger.warn(`${tag} rejected: invalid tag name`);
        return response.validationError(
          ctx,
          [
            {
              field: "name",
              message: "name must be 3-20 characters using only a-z and 0-9",
            },
          ],
        );
      }

      if (await tagRepository.findById(name)) {
        logger.warn(`${tag} rejected: tag ${name} already exists`);
        return response.badRequest(ctx, "Tag already exists");
      }

      const created = await tagRepository.create(name);
      logger.info(`${tag} tag ${name} created`);
      return response.ok(ctx, created);
    } catch (error: any) {
      logger.error(`${tag} error: ${error.message}`);
      return response.serverError(ctx);
    }
  },

  async remove(ctx: any) {
    const tag = `[${ctx.requestId}] [LDT-24]`;
    try {
      const name = ctx.params.name.trim().toLowerCase();
      if (!/^[a-z0-9]{3,20}$/.test(name)) {
        logger.warn(`${tag} rejected: invalid tag name`);
        return response.validationError(
          ctx,
          [
            {
              field: "name",
              message: "name must be 3-20 characters using only a-z and 0-9",
            },
          ],
        );
      }

      const existing = await tagRepository.findById(name);
      if (!existing) {
        logger.warn(`${tag} rejected: tag ${name} not found`);
        return response.badRequest(ctx, "Tag not found");
      }

      await tagRepository.removeCascade(existing);
      logger.info(`${tag} tag ${name} deleted`);
      return response.ok(ctx, { id: name });
    } catch (error: any) {
      logger.error(`${tag} error: ${error.message}`);
      return response.serverError(ctx);
    }
  },
};

import { response } from "../utils/response";
import { accountRepository } from "../repositories/account.repository";
import { authSessionRepository } from "../repositories/auth-session.repository";
import { logger } from "../utils/logger";
import { comparePassword, hashPassword } from "../utils/password";
import { validateRegisterBody } from "../validators/account.validator";
import { Role } from "../models/account.model";

export const authController = {

  async register(ctx: any) {
    const tag = `[${ctx.requestId}] [LDT-35]`;
    try {
      const validation = validateRegisterBody(ctx.body);
      if (!validation.success) {
        logger.warn(`${tag} validation failed`);
        return response.validationError(ctx, validation.errors);
      }
      const { firstName, lastName, email, password } = validation.data;

      const existing = await accountRepository.findByEmails([email]);
      if (existing) {
        logger.warn(`${tag} rejected: email ${email} already exists`);
        return response.badRequest(ctx, "Email already exists");
      }

      const [account] = await accountRepository.createMany([
        {
          firstName,
          lastName,
          email,
          password: await hashPassword(password),
          role: Role.Member,
          isActive: true,
        },
      ]);

      const sessionId = crypto.randomUUID();
      const token = await ctx.jwt.sign({
        sub: String(account._id),
        role: account.role,
        sessionId,
      });
      const payload = await ctx.jwt.verify(token);
      if (!payload || typeof payload.exp !== "number") {
        logger.error(`${tag} error: invalid token payload`);
        return response.serverError(ctx);
      }

      await authSessionRepository.create({
        sessionId,
        accountId: String(account._id),
        expiresAt: new Date(payload.exp * 1000),
      });

      logger.info(`${tag} account ${String(account._id)} registered`);
      const { password: _password, __v, ...publicAccount } = account as any;
      return response.ok(ctx, { token, account: publicAccount });
    } catch (error: any) {
      if (error?.code === 11000) {
        logger.warn(`${tag} rejected: duplicate email`);
        return response.badRequest(ctx, "Email already exists");
      }
      logger.error(`${tag} Error: ${error.message} \n${error.stack}`);
      return response.serverError(ctx);
    }
  },

  async login(ctx: any) {
    const tag = `[${ctx.requestId}] [LDT-01]`;
    try {
      const body = ctx.body ?? {};

      const email = typeof body.email === "string" ? body.email.trim().toLowerCase() : "";

      const password = typeof body.password === "string" ? body.password : "";

      const isValidEmail = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);

      if (!isValidEmail || !password) {
        logger.warn(`${tag} rejected: malformed email or password`);
        return response.badRequest(ctx, "Invalid email or password");
      }

      const account = await accountRepository.findByEmailWithPassword(email);
      if (!account || !(await comparePassword(password, account.password))) {
        logger.warn(`${tag} rejected: invalid credentials for ${email}`);
        return response.unauthorized(ctx, "Invalid email or password");
      }
      if (!account.isActive) {
        logger.warn(`${tag} rejected: suspended account ${String(account._id)}`);
        return response.unauthorized(ctx, "Your account has been suspended");
      }

      const sessionId = crypto.randomUUID();
      const token = await ctx.jwt.sign({
        sub: String(account._id),
        role: account.role,
        sessionId,
      });
      const payload = await ctx.jwt.verify(token);
      if (!payload || typeof payload.exp !== "number") {
        logger.error(`${tag} error: invalid token payload`);
        return response.serverError(ctx);
      }

      await authSessionRepository.create({
        sessionId,
        accountId: String(account._id),
        expiresAt: new Date(payload.exp * 1000),
      });

      logger.info(
        `${tag} account ${String(account._id)} logged in`,
      );
      const { password: _password, __v, ...publicAccount } = account;
      return response.ok(ctx, { token, account: publicAccount });
    } catch (error: any) {
      logger.error(`${tag} Error: ${error.message} \n${error.stack}`);
      return response.serverError(ctx);
    }
  },

  async logout(ctx: any) {
    const tag = `[${ctx.requestId}] [LDT-02]`;
    try {
      const { sessionId, sub } = ctx.user;
      await authSessionRepository.removeBySessionIdAndAccount(sessionId, sub);
      logger.info(`${tag} account ${sub} logged out`);
      return response.empty(ctx, 200);
    } catch (error: any) {
      logger.error(`${tag} Error: ${error.message} \n${error.stack}`);
      return response.serverError(ctx);
    }
  },
};

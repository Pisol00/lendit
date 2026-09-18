import { Elysia } from "elysia";
import { Role } from "../models/account.model";
import { accountRepository } from "../repositories/account.repository";
import { authSessionRepository } from "../repositories/auth-session.repository";
import { jwtPlugin, VerifiedPayload } from "../config/jwt";
import { response } from "../utils/response";

export const authPlugin = new Elysia({ name: "auth" })
  .use(jwtPlugin)

  .derive({ as: "scoped" }, async ({ jwt, headers }) => {
    const authorization = headers.authorization;
    if (!authorization?.startsWith("Bearer ")) {
      return { user: null as VerifiedPayload | null };
    }

    const token = authorization.slice("Bearer ".length);
    const payload = (await jwt.verify(token)) as VerifiedPayload | false;
    if (!payload) return { user: null as VerifiedPayload | null };

    const activeSession = await authSessionRepository.hasSession(
      payload.sessionId,
      payload.sub,
    );
    if (!activeSession) return { user: null as VerifiedPayload | null };

    const account = await accountRepository.findById(payload.sub);
    if (!account || !account.isActive) {
      return { user: null as VerifiedPayload | null };
    }

    return { user: payload };
  })

  .macro({
    auth(required: boolean | Role) {
      if (!required) return;

      return {
        beforeHandle({ user, set }) {
          if (!user) {
            return response.unauthorized({ set });
          }
          if (typeof required === "string" && user.role !== required) {
            return response.status({ set }, 400, {
              message: `This action requires ${required} role`,
            });
          }
        },
      };
    },
  });

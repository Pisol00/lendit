import { AuthSessionModel } from "../models/authSession.model";

export const authSessionRepository = {

  create(input: {
    sessionId: string;
    accountId: string;
    expiresAt: Date;
  }) {
    return AuthSessionModel.create({
      sessionId: input.sessionId,
      account: input.accountId,
      expiresAt: input.expiresAt,
    });
  },

  hasSession(sessionId: string, accountId: string) {
    return AuthSessionModel.exists({ sessionId, account: accountId });
  },

  removeBySessionIdAndAccount(sessionId: string, accountId: string) {
    return AuthSessionModel.deleteOne({ sessionId, account: accountId });
  },

  async removeExpired(now: Date) {
    const result = await AuthSessionModel.deleteMany({
      expiresAt: { $lte: now },
    });
    return result.deletedCount;
  },
};

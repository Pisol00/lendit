import { jwt } from "@elysiajs/jwt";
import { Role } from "../models/account.model";

export type VerifiedPayload = {
  sub: string;
  role: Role;
  sessionId: string;
  exp?: number;
};

export const jwtPlugin = jwt({
  name: "jwt",
  secret: process.env.JWT_SECRET ?? "change-me-in-env",
  exp: process.env.JWT_EXPIRES_IN ?? "24h",
});

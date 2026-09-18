import { Schema, model, Document, type Types } from "mongoose";

export type TAuthSession = {
  sessionId: string;
  account: Types.ObjectId;
  expiresAt: Date;
};

export interface IAuthSession extends Document, TAuthSession {}

const authSessionSchema = new Schema<TAuthSession>(
  {
    sessionId: {
      type: String,
      required: true,
      unique: true,
    },
    account: {
      type: Schema.Types.ObjectId,
      ref: "Account",
      required: true,
      index: true,
    },
    expiresAt: {
      type: Date,
      required: true,
    },
  },
  { timestamps: true },
);

export const AuthSessionModel = model<TAuthSession>(
  "AuthSession",
  authSessionSchema,
);

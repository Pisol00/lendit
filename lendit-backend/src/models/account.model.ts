import { Schema, model, Document } from "mongoose";
import { softDeletePlugin } from "./plugins/softDelete.plugin";

export enum Role {
  Admin = "admin",
  Member = "member",
}

export type TAccount = {
  firstName: string;
  lastName: string;
  email: string;
  password: string;
  role: Role;
  isActive: boolean;
  deletedAt?: Date | null;
};

export interface IAccount extends Document, TAccount {}

const accountSchema: Schema = new Schema(
  {
    firstName: {
      type: String,
      required: true,
      trim: true,
    },
    lastName: {
      type: String,
      required: true,
      trim: true,
    },
    email: {
      type: String,
      required: true,
      trim: true,
      lowercase: true,
    },
    password: {
      type: String,
      required: true,
      select: false,
    },
    role: {
      type: String,
      required: true,
      enum: Object.values(Role),
      default: Role.Member,
    },
    isActive: {
      type: Boolean,
      required: true,
      default: true,
    },
    deletedAt: {
      type: Date,
      default: null,
    },
  },
  { timestamps: true }
);

accountSchema.plugin(softDeletePlugin);

accountSchema.index(
  { email: 1 },
  {
    unique: true,
    partialFilterExpression: { deletedAt: null },
  },
);

export const AccountModel = model<IAccount>("Account", accountSchema);

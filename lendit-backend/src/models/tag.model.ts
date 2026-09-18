import { Schema, model, Document } from "mongoose";

export type TTag = {
  _id: string;
};

export interface ITag extends Omit<Document, "_id">, TTag {}

const tagSchema = new Schema<TTag>(
  {
    _id: {
      type: String,
      required: true,
      trim: true,
      lowercase: true,
    },
  },
  {
    timestamps: true,
    _id: false,
  }
);

export const TagModel = model<TTag>("Tag", tagSchema);

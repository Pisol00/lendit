import { Schema, model, Document, type Types } from "mongoose";
import { softDeletePlugin } from "./plugins/softDelete.plugin";

export type TBook = {
  title: string;
  author: string;
  titleKey: string;
  authorKey: string;
  publisher: string;
  publisherKey: string;
  edition: number;
  isbn: string;
  cover?: string;
  owner: Types.ObjectId;
  tags: string[];
  quantity: number;
  deletedAt?: Date | null;
};

export interface IBook extends Document, TBook {}

const bookSchema = new Schema<TBook>(
  {
    title: {
      type: String,
      required: true,
      trim: true,
    },
    author: {
      type: String,
      required: true,
      trim: true,
    },

    titleKey: {
      type: String,
      required: true,
    },
    authorKey: {
      type: String,
      required: true,
    },
    publisher: {
      type: String,
      required: true,
      trim: true,
    },
    publisherKey: {
      type: String,
      required: true,
    },
    edition: {
      type: Number,
      required: true,
    },
    isbn: {
      type: String,
      required: true,
      trim: true,
    },
    cover: {
      type: String,
      trim: true,
    },
    owner: {
      type: Schema.Types.ObjectId,
      ref: "Account",
      required: true,
    },
    tags: {
      type: [String],
      ref: "Tag",
      default: [],
    },
    quantity: {
      type: Number,
      required: true,
      min: 1,
    },
    deletedAt: {
      type: Date,
      default: null,
    },
  },
  { timestamps: true }
);

bookSchema.plugin(softDeletePlugin);

bookSchema.index(
  { owner: 1, titleKey: 1, authorKey: 1, edition: 1, publisherKey: 1 },
  {
    unique: true,
    partialFilterExpression: { deletedAt: null },
  },
);

export const BookModel = model<TBook>("Book", bookSchema);

import { Schema, model, Document, type Types } from "mongoose";
import { softDeletePlugin } from "./plugins/softDelete.plugin";

export enum RaterRole {
  Owner = "owner",
  Borrower = "borrower",
}

export type TRating = {
  borrowing: Types.ObjectId;
  rater: Types.ObjectId;
  ratee: Types.ObjectId;
  raterRole: RaterRole;
  rating: number;
  comment?: string;
  deletedAt?: Date | null;
};

export interface IRating extends Document, TRating {}

const ratingSchema = new Schema<TRating>(
  {
    borrowing: {
      type: Schema.Types.ObjectId,
      ref: "Borrowing",
      required: true,
    },
    rater: {
      type: Schema.Types.ObjectId,
      ref: "Account",
      required: true,
    },
    ratee: {
      type: Schema.Types.ObjectId,
      ref: "Account",
      required: true,
    },
    raterRole: {
      type: String,
      required: true,
      enum: Object.values(RaterRole),
    },
    rating: {
      type: Number,
      required: true,
      min: 1,
      max: 5,
    },
    comment: {
      type: String,
      trim: true,
    },
    deletedAt: {
      type: Date,
      default: null,
    },
  },
  { timestamps: true }
);

ratingSchema.plugin(softDeletePlugin);

ratingSchema.index({ borrowing: 1, rater: 1 }, { unique: true });

ratingSchema.index({ ratee: 1, deletedAt: 1, createdAt: -1 });

ratingSchema.index({ deletedAt: 1, createdAt: -1 });
ratingSchema.index({ deletedAt: 1, rating: 1, createdAt: -1 });

ratingSchema.index({ rater: 1, deletedAt: 1, createdAt: -1 });

export const RatingModel = model<TRating>("Rating", ratingSchema, "rating");

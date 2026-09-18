import { Schema, model, Document, type Types } from "mongoose";

export enum BorrowingStatus {
  Pending = "pending",
  Borrowing = "borrowing",
  Rejected = "rejected",
  Returned = "returned",
  Cancelled = "cancelled",
}

export type TBorrowing = {
  book: Types.ObjectId;
  owner: Types.ObjectId;
  borrower: Types.ObjectId;
  startDate: Date;
  dueDate: Date;
  returnedDate?: Date;
  status: BorrowingStatus;
};

export interface IBorrowing extends Document, TBorrowing {}

const borrowingSchema = new Schema<TBorrowing>(
  {
    book: {
      type: Schema.Types.ObjectId,
      ref: "Book",
      required: true,
    },
    owner: {
      type: Schema.Types.ObjectId,
      ref: "Account",
      required: true,
    },
    borrower: {
      type: Schema.Types.ObjectId,
      ref: "Account",
      required: true,
    },
    startDate: {
      type: Date,
      required: true,
    },
    dueDate: {
      type: Date,
      required: true,
    },
    returnedDate: {
      type: Date,
    },
    status: {
      type: String,
      required: true,
      enum: Object.values(BorrowingStatus),
      default: BorrowingStatus.Pending,
    },
  },
  { timestamps: true }
);

borrowingSchema.index({ borrower: 1, status: 1, createdAt: -1 });
borrowingSchema.index({ owner: 1, status: 1, createdAt: -1 });

borrowingSchema.index({ book: 1, status: 1, startDate: 1, dueDate: 1 });

borrowingSchema.index({ status: 1, startDate: 1 });
borrowingSchema.index({ status: 1, dueDate: 1 });

export const BorrowingModel = model<TBorrowing>(
  "Borrowing",
  borrowingSchema,
  "borrowing"
);

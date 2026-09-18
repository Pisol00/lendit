import mongoose, { type Types } from "mongoose";
import {
  BorrowingStatus,
  BorrowingModel,
  type IBorrowing,
} from "../models/borrowing.model";
import { BookModel } from "../models/book.model";
import { RatingModel } from "../models/rating.model";
import type { IAccount } from "../models/account.model";

export const borrowingRepository = {

  async list(filter: Record<string, any>, skip: number, limit: number) {
    const [items, total] = await Promise.all([
      BorrowingModel.find(filter)
        .populate("book", "title author cover isbn owner")
        .populate("owner", "firstName lastName email")
        .populate("borrower", "firstName lastName email")
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .lean(),
      BorrowingModel.countDocuments(filter),
    ]);
    return { items, total };
  },

  findById(id: string) {
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return null;
    }
    return BorrowingModel.findById(id).select("-__v");
  },

  async create(borrowing: {
    book: Types.ObjectId;
    owner: Types.ObjectId;
    borrower: string;
    startDate: Date;
    dueDate: Date;
    status: BorrowingStatus.Pending;
  }) {
    const created = await BorrowingModel.create(borrowing);
    return created.toJSON();
  },

  async save(borrowing: IBorrowing) {
    const saved = await borrowing.save();
    return saved.toJSON();
  },

  hasActiveByBook(book: any) {
    return BorrowingModel.exists({
      book,
      status: BorrowingStatus.Borrowing,
    });
  },

  hasActiveByBooks(books: any[]) {
    return BorrowingModel.exists({
      book: { $in: books },
      status: BorrowingStatus.Borrowing,
    });
  },

  hasActiveByBorrower(borrower: any) {
    return BorrowingModel.exists({
      borrower,
      status: BorrowingStatus.Borrowing,
    });
  },

  countOverlappingApproved(book: any, start: Date, due: Date) {
    return BorrowingModel.countDocuments({
      book,
      status: BorrowingStatus.Borrowing,
      startDate: { $lt: due },
      dueDate: { $gt: start },
    });
  },

  async maxOverlapFromNow(book: any, now: Date): Promise<number> {
    const bookings = await BorrowingModel.find({
      book,
      status: BorrowingStatus.Borrowing,
      dueDate: { $gte: now },
    })
      .select("startDate dueDate")
      .lean();

    let peak = 0;

    for (const startingBooking of bookings) {
      const dayToCheck = startingBooking.startDate;

      let overlapCount = 0;
      for (const booking of bookings) {
        const alreadyStarted = booking.startDate <= dayToCheck;
        const notYetReturned = booking.dueDate > dayToCheck;
        if (alreadyStarted && notYetReturned) {
          overlapCount++;
        }
      }

      if (overlapCount > peak) peak = overlapCount;
    }
    return peak;
  },

  async approveAndReject(
    borrowing: IBorrowing,
    quantity: number,
  ): Promise<{ approved: Record<string, any>; autoRejected: number } | null> {
    const session = await mongoose.startSession();
    try {
      let result:
        | { approved: Record<string, any>; autoRejected: number }
        | null = null;

      await session.withTransaction(async () => {

        const overlapCount = await BorrowingModel.countDocuments({
          book: borrowing.book,
          status: BorrowingStatus.Borrowing,
          startDate: { $lt: borrowing.dueDate },
          dueDate: { $gt: borrowing.startDate },
          _id: { $ne: borrowing._id },
        }).session(session);

        if (overlapCount >= quantity) return;

        borrowing.status = BorrowingStatus.Borrowing;
        await borrowing.save({ session });
        result = { approved: borrowing.toJSON(), autoRejected: 0 };

        if (overlapCount + 1 >= quantity) {
          const related = await BorrowingModel.find({
            book: borrowing.book,
            status: {
              $in: [BorrowingStatus.Borrowing, BorrowingStatus.Pending],
            },
            startDate: { $lt: borrowing.dueDate },
            dueDate: { $gt: borrowing.startDate },
          })
          .select("_id status startDate dueDate")
          .session(session);

          const approved = related.filter(
            (r) => r.status === BorrowingStatus.Borrowing,
          );
          const pendings = related.filter(
            (r) => r.status === BorrowingStatus.Pending,
          );

          const toReject = pendings
          .filter(
            (p) =>
              approved.filter(
                (a) => a.startDate < p.dueDate && a.dueDate > p.startDate,
              ).length >= quantity,
            )
            .map((p) => p._id);

            if (toReject.length) {
              const res = await BorrowingModel.updateMany(
                { _id: { $in: toReject } },
                { $set: { status: BorrowingStatus.Rejected } },
                { session },
              );
            }
            result.autoRejected = toReject.length;
          }
      });

      return result;
    } finally {
      await session.endSession();
    }
  },

  async deleteBookWithPendingCleanup(book: InstanceType<typeof BookModel>): Promise<number> {
    const session = await mongoose.startSession();
    try {
      let rejected = 0;
      await session.withTransaction(async () => {
        const result = await BorrowingModel.updateMany(
          { book: book._id, status: BorrowingStatus.Pending },
          { $set: { status: BorrowingStatus.Rejected } },
          { session },
        );
        rejected = result.modifiedCount;
        book.deletedAt = new Date();
        await book.save({ session });
      });
      return rejected;
    } finally {
      await session.endSession();
    }
  },

  async deleteAccountWithPendingCleanup(
    account: IAccount,
    ownedBookIds: any[],
  ): Promise<{
    rejected: number;
    cancelled: number;
    ratingsRemoved: number;
  }> {
    const session = await mongoose.startSession();
    try {
      let rejected = 0;
      let cancelled = 0;
      let ratingsRemoved = 0;
      await session.withTransaction(async () => {
        if (ownedBookIds.length) {
          const r = await BorrowingModel.updateMany(
            { book: { $in: ownedBookIds }, status: BorrowingStatus.Pending },
            { $set: { status: BorrowingStatus.Rejected } },
            { session },
          );
          rejected = r.modifiedCount;
        }
        const c = await BorrowingModel.updateMany(
          { borrower: account._id, status: BorrowingStatus.Pending },
          { $set: { status: BorrowingStatus.Cancelled } },
          { session },
        );
        cancelled = c.modifiedCount;

        const deletedAt = new Date();
        const r2 = await RatingModel.updateMany(
          {
            $or: [{ rater: account._id }, { ratee: account._id }],
            deletedAt: null,
          },
          { $set: { deletedAt } },
          { session },
        );
        ratingsRemoved = r2.modifiedCount;

        account.deletedAt = deletedAt;
        await account.save({ session });
      });
      return { rejected, cancelled, ratingsRemoved };
    } finally {
      await session.endSession();
    }
  },

  async rejectExpiredPending(now: Date) {
    const TIMEZONE_GRACE_MS = 86400000;
    const startOfTodayUTC = Date.UTC(
      now.getUTCFullYear(),
      now.getUTCMonth(),
      now.getUTCDate(),
    );
    const result = await BorrowingModel.updateMany(
      {
        status: BorrowingStatus.Pending,
        startDate: { $lt: new Date(startOfTodayUTC - TIMEZONE_GRACE_MS) },
      },
      { $set: { status: BorrowingStatus.Rejected } },
    );
    return result.modifiedCount;
  },

  async autoReturnOverdue(now: Date) {
    const result = await BorrowingModel.updateMany(
      {
        status: BorrowingStatus.Borrowing,
        dueDate: { $lte: now },
      },
      { $set: { status: BorrowingStatus.Returned, returnedDate: now } },
    );
    return result.modifiedCount;
  },
};

import { AccountModel, Role } from "../models/account.model";
import { BookModel } from "../models/book.model";
import {
  BorrowingModel,
  BorrowingStatus,
} from "../models/borrowing.model";

const COUNTED_STATUSES = [
  BorrowingStatus.Borrowing,
  BorrowingStatus.Returned,
];

export const dashboardRepository = {

  async countStats() {
    const [members, books, pendingRequests, activeBorrowings] =
      await Promise.all([
        AccountModel.countDocuments({ role: Role.Member }),
        BookModel.countDocuments(),
        BorrowingModel.countDocuments({ status: BorrowingStatus.Pending }),
        BorrowingModel.countDocuments({
          status: BorrowingStatus.Borrowing,
        }),
      ]);
    return { members, books, pendingRequests, activeBorrowings };
  },

  async topBorrowedBooks(from: Date | null, to: Date | null, limit = 10) {
    const match: Record<string, any> = { status: { $in: COUNTED_STATUSES } };
    if (from && to) match.createdAt = { $gte: from, $lte: to };

    return BorrowingModel.aggregate([
      { $match: match },
      { $group: { _id: "$book", count: { $sum: 1 } } },
      { $sort: { count: -1 } },
      { $limit: limit },
      {
        $lookup: {
          from: "books",
          localField: "_id",
          foreignField: "_id",
          as: "book",
        },
      },
      { $unwind: "$book" },
      {
        $project: {
          _id: 0,
          bookId: "$_id",
          title: "$book.title",
          author: "$book.author",
          count: 1,
        },
      },
    ]);
  },

  async topBorrowedOwners(from: Date | null, to: Date | null, limit = 10) {
    const match: Record<string, any> = { status: { $in: COUNTED_STATUSES } };
    if (from && to) match.createdAt = { $gte: from, $lte: to };

    return BorrowingModel.aggregate([
      { $match: match },

      {
        $lookup: {
          from: "books",
          localField: "book",
          foreignField: "_id",
          as: "book",
        },
      },
      { $unwind: "$book" },

      { $group: { _id: "$book.owner", count: { $sum: 1 } } },

      { $sort: { count: -1 } },
      { $limit: limit },

      {
        $lookup: {
          from: "accounts",
          localField: "_id",
          foreignField: "_id",
          as: "owner",
        },
      },
      { $unwind: "$owner" },

      {
        $project: {
          _id: 0,
          accountId: "$_id",
          firstName: "$owner.firstName",
          lastName: "$owner.lastName",
          count: 1,
        },
      },
    ]);
  },

  async topBorrowers(from: Date | null, to: Date | null, limit = 10) {
    const match: Record<string, any> = { status: { $in: COUNTED_STATUSES } };
    if (from && to) match.createdAt = { $gte: from, $lte: to };

    return BorrowingModel.aggregate([
      { $match: match },
      { $group: { _id: "$borrower", count: { $sum: 1 } } },
      { $sort: { count: -1 } },
      { $limit: limit },
      {
        $lookup: {
          from: "accounts",
          localField: "_id",
          foreignField: "_id",
          as: "borrower",
        },
      },
      { $unwind: "$borrower" },
      {
        $project: {
          _id: 0,
          accountId: "$_id",
          firstName: "$borrower.firstName",
          lastName: "$borrower.lastName",
          count: 1,
        },
      },
    ]);
  },

  async booksByTag() {
    return BookModel.aggregate([
      { $match: { deletedAt: null } },
      { $unwind: "$tags" },
      { $group: { _id: "$tags", count: { $sum: 1 } } },
      { $sort: { count: -1 } },
      { $project: { _id: 0, tag: "$_id", count: 1 } },
    ]);
  },

  async borrowReturnPerDay(monthStart: Date | null, monthEnd: Date | null) {
    const inRange = monthStart && monthEnd;
    const borrowedMatch: Record<string, any> = {};
    if (inRange) borrowedMatch.createdAt = { $gte: monthStart, $lte: monthEnd };

    const returnedMatch: Record<string, any> = {
      status: BorrowingStatus.Returned,
    };
    if (inRange) {
      returnedMatch.returnedDate = { $gte: monthStart, $lte: monthEnd };
    }

    const [borrowed, returned] = await Promise.all([
      BorrowingModel.aggregate([
        { $match: borrowedMatch },
        { $group: { _id: { $dayOfMonth: "$createdAt" }, count: { $sum: 1 } } },
        { $project: { _id: 0, day: "$_id", count: "$count" } },
      ]),
      BorrowingModel.aggregate([
        { $match: returnedMatch },
        { $group: { _id: { $dayOfMonth: "$returnedDate" }, count: { $sum: 1 } } },
        { $project: { _id: 0, day: "$_id", count: "$count" } },
      ]),
    ]);
    return { borrowed, returned };
  },
};

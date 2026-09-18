import mongoose, { type Types } from "mongoose";
import { RatingModel, RaterRole } from "../models/rating.model";
import { BorrowingModel, BorrowingStatus } from "../models/borrowing.model";

export const ratingRepository = {

  findById(id: string) {
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return null;
    }
    return RatingModel.findById(id);
  },

  softDelete(rating: InstanceType<typeof RatingModel>) {
    rating.deletedAt = new Date();
    return rating.save();
  },

  findDeletedById(id: string) {
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return null;
    }
    return RatingModel.findOne({ _id: id, deletedAt: { $ne: null } });
  },

  restore(rating: InstanceType<typeof RatingModel>) {
    rating.deletedAt = null;
    return rating.save();
  },

  findByBorrowingAndRaterIncludingDeleted(borrowingId: string, raterId: string) {
    if (!mongoose.Types.ObjectId.isValid(borrowingId)) {
      return null;
    }
    return RatingModel.findOne({
      borrowing: borrowingId,
      rater: raterId,
      deletedAt: { $exists: true },
    });
  },

  listByBorrowing(borrowingId: string, hiddenRaterIds: any[] = []) {
    if (!mongoose.Types.ObjectId.isValid(borrowingId)) {
      return [];
    }
    const filter: Record<string, any> = { borrowing: borrowingId };
    if (hiddenRaterIds.length) filter.rater = { $nin: hiddenRaterIds };
    return RatingModel.find(filter)
      .populate("rater", "firstName lastName email")
      .populate("ratee", "firstName lastName email")
      .sort({ createdAt: -1 })
      .lean();
  },

  async listByRatee(
    rateeId: string,
    skip: number,
    limit: number,
    raterRole?: RaterRole,
    hiddenRaterIds: any[] = [],
  ) {

    const filter: Record<string, any> = { ratee: rateeId, deletedAt: null };
    if (raterRole) filter.raterRole = raterRole;

    if (hiddenRaterIds.length) filter.rater = { $nin: hiddenRaterIds };
    const [items, total] = await Promise.all([
      RatingModel.find(filter)
        .populate("rater", "firstName lastName email")
        .populate({
          path: "borrowing",
          select: "book startDate dueDate returnedDate",

          populate: {
            path: "book",
            select: "title author cover deletedAt",
            match: { deletedAt: { $exists: true } },
          },
        })
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .lean(),
      RatingModel.countDocuments(filter),
    ]);
    return { items, total };
  },

  async listForModeration(
    skip: number,
    limit: number,
    options: {
      rating?: number;
      raterId?: string;
      rateeId?: string;
      search?: string;
      status?: "live" | "deleted" | "all";
    } = {},
  ) {

    const filter: Record<string, any> = {};
    if (options.status === "deleted") filter.deletedAt = { $ne: null };
    else if (options.status === "all") filter.deletedAt = { $exists: true };
    else filter.deletedAt = null;
    if (options.rating !== undefined) filter.rating = options.rating;
    if (options.raterId) filter.rater = options.raterId;
    if (options.rateeId) filter.ratee = options.rateeId;

    if (options.search) {
      const escaped = options.search.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
      filter.comment = { $regex: escaped, $options: "i" };
    }

    const [items, total] = await Promise.all([
      RatingModel.find(filter)
        .populate("rater", "firstName lastName email")
        .populate("ratee", "firstName lastName email")
        .populate({
          path: "borrowing",
          select: "book startDate dueDate returnedDate",

          populate: {
            path: "book",
            select: "title author cover deletedAt",
            match: { deletedAt: { $exists: true } },
          },
        })
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .lean(),
      RatingModel.countDocuments(filter),
    ]);
    return { items, total };
  },

  async summaryByRatee(rateeId: string, hiddenRaterIds: any[] = []) {

    const match: Record<string, any> = {
      ratee: new mongoose.Types.ObjectId(rateeId),
      deletedAt: null,
    };

    if (hiddenRaterIds.length) match.rater = { $nin: hiddenRaterIds };
    const rows = await RatingModel.aggregate([
      { $match: match },
      {
        $group: {
          _id: "$raterRole",
          average: { $avg: "$rating" },
          count: { $sum: 1 },
        },
      },
    ]);

    const empty = () => ({ average: 0, count: 0 });
    const summary = {
      overall: empty(),
      asOwner: empty(),
      asBorrower: empty(),
    };

    let total = 0;
    let sum = 0;
    for (const row of rows) {
      const bucket = { average: Math.round(row.average * 100) / 100, count: row.count };

      if (row._id === RaterRole.Borrower) {
        summary.asOwner = bucket;
      } else {
        summary.asBorrower = bucket;
      }
      total += row.count;
      sum += row.average * row.count;
    }
    if (total > 0) {
      summary.overall = {
        average: Math.round((sum / total) * 100) / 100,
        count: total,
      };
    }
    return summary;
  },

  async createChecked(input: {
    borrowingId: string;
    raterId: string;
    rateeId: Types.ObjectId;
    raterRole: RaterRole;
    rating: number;
    comment?: string;
    windowMs: number;
  }): Promise<Record<string, any> | null> {
    const session = await mongoose.startSession();
    try {
      let created: Record<string, any> | null = null;

      await session.withTransaction(async () => {

        const borrowing = await BorrowingModel.findOne({
          _id: input.borrowingId,
          status: BorrowingStatus.Returned,
          returnedDate: { $gt: new Date(Date.now() - input.windowMs) },
        }).session(session);

        if (!borrowing) return;

        const [doc] = await RatingModel.create(
          [
            {
              borrowing: input.borrowingId,
              rater: input.raterId,
              ratee: input.rateeId,
              raterRole: input.raterRole,
              rating: input.rating,
              comment: input.comment,
            },
          ],
          { session },
        );
        created = doc!.toJSON();
      });

      return created;
    } finally {
      await session.endSession();
    }
  },
};

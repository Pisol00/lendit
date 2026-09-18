import mongoose from "mongoose";
import { TagModel } from "../models/tag.model";
import { BookModel } from "../models/book.model";

export const tagRepository = {

  list() {
    return TagModel.aggregate([
      { $sort: { _id: 1 } },
      {
        $lookup: {
          from: "books",
          let: { tagId: "$_id" },
          pipeline: [
            {
              $match: {
                $expr: { $in: ["$$tagId", { $ifNull: ["$tags", []] }] },
                deletedAt: null,
              },
            },
            { $count: "n" },
          ],
          as: "usage",
        },
      },
      {
        $project: {
          _id: 1,
          bookCount: { $ifNull: [{ $first: "$usage.n" }, 0] },
        },
      },
    ]);
  },

  findById(id: string) {
    return TagModel.findById(id);
  },

  async create(id: string) {
    const doc = await TagModel.create({ _id: id });
    return doc.toObject();
  },

  findExistingIds(ids: string[]) {
    return TagModel.find({ _id: { $in: ids } }).distinct("_id");
  },

  async findMissingIds(ids: string[]) {
    const existing = new Set(await this.findExistingIds(ids));
    return ids.filter((id) => !existing.has(id));
  },

  async removeCascade(tag: InstanceType<typeof TagModel>) {
    const session = await mongoose.startSession();
    try {
      await session.withTransaction(async () => {
        await BookModel.updateMany(
          { tags: tag._id },
          { $pull: { tags: tag._id } },
          { session },
        );
        await tag.deleteOne({ session });
      });
    } finally {
      await session.endSession();
    }
  },
};

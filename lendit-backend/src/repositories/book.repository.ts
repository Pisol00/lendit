import mongoose, { type Types } from "mongoose";
import { BookModel } from "../models/book.model";
import type { BookBodyInput } from "../validators/book.validator";

export const bookRepository = {

  async list(
    filter: Record<string, any>,
    sortBy: string,
    sortOrder: 1 | -1,
    skip: number,
    limit: number,
  ) {
    const [items, total] = await Promise.all([
      BookModel.find(filter)
        .populate("owner", "firstName lastName email")
        .sort({ [sortBy]: sortOrder })
        .skip(skip)
        .limit(limit)
        .lean(),
      BookModel.countDocuments({ ...filter, deletedAt: null }),
    ]);
    return { items, total };
  },

  findById(id: string | Types.ObjectId) {
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return null;
    }
    return BookModel.findById(id).select("-__v");
  },

  findByIdWithOwner(id: string) {
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return null;
    }
    return BookModel.findById(id)
      .populate("owner", "firstName lastName email")
      .select("-__v")
      .lean();
  },

  findIdsByOwner(ownerId: string) {
    return BookModel.find({ owner: ownerId, deletedAt: null }).distinct("_id");
  },

  async create(book: BookBodyInput & { tags: string[]; owner: string }) {
    const created = await BookModel.create(book);
    return created.toJSON();
  },

  async save(book: InstanceType<typeof BookModel>) {
    const saved = await book.save();
    return saved.toJSON();
  },

  softDelete(book: InstanceType<typeof BookModel>) {
    book.deletedAt = new Date();
    return book.save();
  },
};

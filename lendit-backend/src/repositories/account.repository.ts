import mongoose from "mongoose";
import {
  AccountModel,
  Role,
  type TAccount,
  type IAccount,
} from "../models/account.model";

export const accountRepository = {

  findById(id: string) {
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return null;
    }
    return AccountModel.findById(id)
      .select("-password -__v")
      .lean();
  },

  findActiveById(id: string) {
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return null;
    }
    return AccountModel.findOne({ _id: id, isActive: true })
      .select("-password -__v")
      .lean();
  },

  hiddenAccountIds() {
    return AccountModel.find({ isActive: false }).distinct("_id");
  },

  findMemberById(id: string) {
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return null;
    }
    return AccountModel.findOne({ _id: id, role: Role.Member })
      .select("-password -__v");
  },

  findByIdWithPassword(id: string) {
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return null;
    }
    return AccountModel.findById(id).select("+password");
  },

  findByEmailWithPassword(email: string) {
    return AccountModel.findOne({ email })
      .select("+password")
      .lean();
  },

  findByEmails(emails: string[]) {
    return AccountModel.findOne({ email: { $in: emails } })
      .select("email")
      .lean();
  },

  findByEmailExcept(email: string, accountId: string) {
    return AccountModel.findOne({ email, _id: { $ne: accountId } })
      .select("_id")
      .lean();
  },

  async findAll(
    filter: Record<string, any>,
    sortBy: string,
    sortOrder: 1 | -1,
    skip: number,
    limit: number,
  ) {
    const [items, total] = await Promise.all([
      AccountModel.find(filter)
        .sort({ [sortBy]: sortOrder })
        .skip(skip)
        .limit(limit)
        .lean()
        .select("-password -__v"),
      AccountModel.countDocuments(filter),
    ]);
    return { items, total };
  },

  async createMany(accounts: TAccount[]) {
    const session = await mongoose.startSession();
    try {
      let created: IAccount[] = [];

      await session.withTransaction(async () => {
        created = await AccountModel.insertMany(accounts, { session });
      });
      return created.map((account) => {
        const { password, __v, ...rest } = account.toObject();
        return rest;
      });
    } finally {
      await session.endSession();
    }
  },

  async update(account: IAccount) {
    const saved = await account.save();
    return saved.toJSON();
  },

  softDelete(account: IAccount) {
    account.deletedAt = new Date();
    return account.save();
  },
};

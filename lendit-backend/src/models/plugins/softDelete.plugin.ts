import type { Schema } from "mongoose";

export function softDeletePlugin(schema: Schema) {
  const hideDeleted = function (this: any) {
    if (this.getFilter().deletedAt === undefined) {
      this.where({ deletedAt: null });
    }
  };

  schema.pre(/^find/, hideDeleted);
  schema.pre("countDocuments", hideDeleted);
}

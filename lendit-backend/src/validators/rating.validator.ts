import { RaterRole } from "../models/rating.model";
import {
  type ValidationIssue,
  type ValidationResult,
} from "./common.validator";

export const validateRatingBody = (
  value: any,
): ValidationResult<{
  borrowingId: string;
  rating: number;
  comment?: string;
}> => {
  const body =
    value && typeof value === "object" ? (value as Record<string, any>) : {};
  const errors: ValidationIssue[] = [];

  const borrowingId =
    typeof body.borrowingId === "string" ? body.borrowingId.trim() : "";
  if (!borrowingId) {
    errors.push({ field: "borrowingId", message: "borrowingId is required" });
  }

  const rating = body.rating;
  if (
    typeof rating !== "number" ||
    !Number.isInteger(rating) ||
    rating < 1 ||
    rating > 5
  ) {
    errors.push({
      field: "rating",
      message: "rating must be an integer between 1 and 5",
    });
  }

  let comment: string | undefined;
  if (body.comment !== undefined && body.comment !== null) {
    if (typeof body.comment !== "string") {
      errors.push({ field: "comment", message: "comment must be a string" });
    } else {
      const trimmed = body.comment.trim();
      if (trimmed.length > 500) {
        errors.push({
          field: "comment",
          message: "comment must be at most 500 characters",
        });
      }

      comment = trimmed || undefined;
    }
  }

  if (errors.length) return { success: false, errors };
  return { success: true, data: { borrowingId, rating, comment } };
};

export const validateRatingListQuery = (
  query: Record<string, any>,
): ValidationResult<{
  page: number;
  limit: number;
  skip: number;
  raterRole?: RaterRole;
}> => {
  const errors: ValidationIssue[] = [];

  if (
    query.role !== undefined &&
    query.role !== "owner" &&
    query.role !== "borrower"
  ) {
    errors.push({ field: "role", message: "role must be owner or borrower" });
  }
  if (errors.length) return { success: false, errors };

  const page = Math.max(1, isNaN(parseInt(query.page)) ? 1 : parseInt(query.page));
  const limit = Math.min(20, Math.max(1, isNaN(parseInt(query.limit)) ? 10 : parseInt(query.limit)));

  let raterRole: RaterRole | undefined;
  if (query.role === "owner") raterRole = RaterRole.Borrower;
  else if (query.role === "borrower") raterRole = RaterRole.Owner;

  return {
    success: true,
    data: { page, limit, skip: (page - 1) * limit, raterRole },
  };
};

export const validateModerationListQuery = (
  query: Record<string, any>,
): ValidationResult<{
  page: number;
  limit: number;
  skip: number;
  rating?: number;
  raterId?: string;
  rateeId?: string;
  search?: string;
  status: "live" | "deleted" | "all";
}> => {
  const errors: ValidationIssue[] = [];

  const MODERATION_STATUSES = ["live", "deleted", "all"] as const;
  if (
    query.status !== undefined &&
    !MODERATION_STATUSES.includes(query.status)
  ) {
    errors.push({
      field: "status",
      message: `status must be one of: ${MODERATION_STATUSES.join(", ")}`,
    });
  }

  let rating: number | undefined;
  if (query.rating !== undefined) {
    const parsed = parseInt(query.rating);
    if (isNaN(parsed) || parsed < 1 || parsed > 5) {
      errors.push({
        field: "rating",
        message: "rating must be an integer between 1 and 5",
      });
    } else {
      rating = parsed;
    }
  }

  for (const field of ["raterId", "rateeId"] as const) {
    const value = query[field];
    if (value !== undefined && !/^[0-9a-fA-F]{24}$/.test(String(value).trim())) {
      errors.push({ field, message: `${field} must be a valid id` });
    }
  }

  const search =
    typeof query.search === "string" ? query.search.trim() : undefined;
  if (search !== undefined && search.length > 100) {
    errors.push({
      field: "search",
      message: "search must be at most 100 characters",
    });
  }

  if (errors.length) return { success: false, errors };

  const page = Math.max(1, isNaN(parseInt(query.page)) ? 1 : parseInt(query.page));
  const limit = Math.min(20, Math.max(1, isNaN(parseInt(query.limit)) ? 10 : parseInt(query.limit)));

  return {
    success: true,
    data: {
      page,
      limit,
      skip: (page - 1) * limit,
      rating,
      raterId:
        typeof query.raterId === "string" ? query.raterId.trim() : undefined,
      rateeId:
        typeof query.rateeId === "string" ? query.rateeId.trim() : undefined,

      search: search || undefined,
      status: (query.status ?? "live") as "live" | "deleted" | "all",
    },
  };
};

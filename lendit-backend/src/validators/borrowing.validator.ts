import { BorrowingStatus } from "../models/borrowing.model";
import {
  type ValidationIssue,
  type ValidationResult,
} from "./common.validator";

export const validateBorrowingListQuery = (
  query: Record<string, any>,
): ValidationResult<{
  page: number;
  limit: number;
  skip: number;
  role: "owner" | "borrower";
  status?: BorrowingStatus;
}> => {
  const errors: ValidationIssue[] = [];

  if (
    query.role !== undefined &&
    query.role !== "borrower" &&
    query.role !== "owner"
  ) {
    errors.push({
      field: "role",
      message: "role must be borrower or owner",
    });
  }
  const borrowingStatuses = Object.values(BorrowingStatus);
  if (
    query.status !== undefined &&
    !borrowingStatuses.includes(query.status)
  ) {
    errors.push({
      field: "status",
      message: `status must be one of: ${borrowingStatuses.join(", ")}`,
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
      role: query.role === "owner" ? ("owner" as const) : ("borrower" as const),
      status:
        typeof query.status === "string"
          ? (query.status.trim() as BorrowingStatus)
          : undefined,
    },
  };
};

export const validateBorrowingRequest = (
  value: any,
): ValidationResult<{
  bookId: string;
  startDate: Date;
  dueDate: Date;
}> => {
  const body =
    value && typeof value === "object" ? (value as Record<string, any>) : {};
  const errors: ValidationIssue[] = [];
  const bookId = typeof body.bookId === "string" ? body.bookId.trim() : "";

  if (!bookId) {
    errors.push({ field: "bookId", message: "bookId is required" });
  }

  let startDate: Date | undefined;
  let dueDate: Date | undefined;

  for (const field of ["startDate", "dueDate"] as const) {
    const value = body[field];
    if (
      typeof value !== "string" &&
      typeof value !== "number" &&
      !(value instanceof Date)
    ) {
      errors.push({ field, message: `${field} must be a valid date` });
      continue;
    }

    const date =
      value instanceof Date ? new Date(value.getTime()) : new Date(value);
    if (Number.isNaN(date.getTime())) {
      errors.push({ field, message: `${field} must be a valid date` });
      continue;
    }

    if (field === "startDate") {
      startDate = date;
    } else {
      dueDate = date;
    }
  }

  if (startDate) {
    const now = new Date();
    const todayUTC = Date.UTC(
      now.getUTCFullYear(),
      now.getUTCMonth(),
      now.getUTCDate(),
    );
    const startDayUTC = Date.UTC(
      startDate.getUTCFullYear(),
      startDate.getUTCMonth(),
      startDate.getUTCDate(),
    );
    const TIMEZONE_GRACE_MS = 86400000;
    if (startDayUTC < todayUTC - TIMEZONE_GRACE_MS) {
      errors.push({
        field: "startDate",
        message: "startDate cannot be in the past",
      });
    }
  }

  if (startDate && dueDate && dueDate <= startDate) {
    errors.push({
      field: "dueDate",
      message: "dueDate must be after startDate",
    });
  }

  if (errors.length) return { success: false, errors };
  return {
    success: true,
    data: { bookId, startDate: startDate!, dueDate: dueDate! },
  };
};

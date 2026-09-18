import {
  type ValidationIssue,
  type ValidationResult,
} from "./common.validator";

export const ACCOUNT_SORTABLE_FIELDS = new Set([
  "createdAt",
  "updatedAt",
  "firstName",
  "lastName",
  "email",
]);

export const validateAccountListQuery = (
  query: Record<string, any>,
): ValidationResult<{
  page: number;
  limit: number;
  skip: number;
  search: string;
  sortBy: string;
  sortOrder: 1 | -1;
}> => {
  const errors: ValidationIssue[] = [];

  if (query.sortBy !== undefined && !ACCOUNT_SORTABLE_FIELDS.has(query.sortBy)) {
    errors.push({
      field: "sortBy",
      message: `sortBy must be one of: ${[...ACCOUNT_SORTABLE_FIELDS].join(", ")}`,
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
      search: typeof query.search === "string" ? query.search.trim() : "",
      sortBy: query.sortBy ?? "createdAt",
      sortOrder: query.sortOrder === "asc" ? 1 : -1,
    },
  };
};

export const validateRegisterBody = (
  value: any,
): ValidationResult<{
  firstName: string;
  lastName: string;
  email: string;
  password: string;
}> => {
  const body = (value as Record<string, any>) ?? {};
  const errors: ValidationIssue[] = [];

  if (typeof body.firstName !== "string" || !body.firstName.trim()) {
    errors.push({ field: "firstName", message: "firstName is required" });
  }
  if (typeof body.lastName !== "string" || !body.lastName.trim()) {
    errors.push({ field: "lastName", message: "lastName is required" });
  }
  if (
    typeof body.email !== "string" ||
    !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(body.email.trim())
  ) {
    errors.push({ field: "email", message: "email must be valid" });
  }
  if (typeof body.password !== "string" || body.password.length < 8) {
    errors.push({
      field: "password",
      message: "password must be at least 8 characters",
    });
  }

  if (errors.length) return { success: false, errors };
  return {
    success: true,
    data: {
      firstName: body.firstName.trim(),
      lastName: body.lastName.trim(),
      email: body.email.trim().toLowerCase(),
      password: body.password,
    },
  };
};

export const validateUpdateAccountMeBody = (
  value: any,
): ValidationResult<{
  firstName: string;
  lastName: string;
  email: string;
  currentPassword?: string;
  newPassword?: string;
}> => {
  const body =
    value && typeof value === "object" ? (value as Record<string, any>) : {};
  const { firstName, lastName, email, currentPassword, newPassword } = body;
  const errors: ValidationIssue[] = [];

  if (typeof firstName !== "string" || !firstName.trim()) {
    errors.push({ field: "firstName", message: "firstName is required" });
  }
  if (typeof lastName !== "string" || !lastName.trim()) {
    errors.push({ field: "lastName", message: "lastName is required" });
  }
  if (
    typeof email !== "string" ||
    !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())
  ) {
    errors.push({ field: "email", message: "email must be valid" });
  }

  const wantsPasswordChange =
    currentPassword !== undefined || newPassword !== undefined;
  if (wantsPasswordChange) {
    if (currentPassword === undefined || newPassword === undefined) {
      errors.push({
        field: currentPassword === undefined ? "currentPassword" : "newPassword",
        message: "currentPassword and newPassword must be provided together",
      });
    } else {
      if (typeof currentPassword !== "string") {
        errors.push({
          field: "currentPassword",
          message: "currentPassword must be a string",
        });
      }
      if (typeof newPassword !== "string") {
        errors.push({
          field: "newPassword",
          message: "newPassword must be a string",
        });
      } else if (newPassword.length < 8) {
        errors.push({
          field: "newPassword",
          message: "newPassword must be at least 8 characters",
        });
      }
    }
  }

  if (errors.length) return { success: false, errors };

  return {
    success: true,
    data: {
      firstName: firstName.trim(),
      lastName: lastName.trim(),
      email: email.trim().toLowerCase(),
      currentPassword,
      newPassword,
    },
  };
};

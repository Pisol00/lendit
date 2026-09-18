import {
  type ValidationIssue,
  type ValidationResult,
} from "./common.validator";

export const BOOK_SORTABLE_FIELDS = new Set([
  "createdAt",
  "updatedAt",
  "title",
  "author",
  "publisher",
  "isbn",
  "edition",
]);

export type BookBodyInput = {
  title: string;
  author: string;
  publisher: string;
  isbn: string;
  edition: number;
  cover?: string;
  tags?: string[];
  quantity: number;
  titleKey: string;
  authorKey: string;
  publisherKey: string;
};

export const validateBookListQuery = (
  query: Record<string, any>,
): ValidationResult<{
  page: number;
  limit: number;
  skip: number;
  search: string;
  tags: string[];
  sortBy: string;
  sortOrder: 1 | -1;
  mine: boolean;
}> => {
  const errors: ValidationIssue[] = [];

  if (query.sortBy !== undefined && !BOOK_SORTABLE_FIELDS.has(query.sortBy)) {
    errors.push({
      field: "sortBy",
      message: `sortBy must be one of: ${[...BOOK_SORTABLE_FIELDS].join(", ")}`,
    });
  }

  if (errors.length) return { success: false, errors };

  const tags =
    typeof query.tag === "string"
      ? [
          ...new Set(
            query.tag
              .split(",")
              .map((tag: string) => tag.trim().toLowerCase())
              .filter(Boolean),
          ),
        ]
      : [];

  const page = Math.max(1, isNaN(parseInt(query.page)) ? 1 : parseInt(query.page));
  const limit = Math.min(20, Math.max(1, isNaN(parseInt(query.limit)) ? 10 : parseInt(query.limit)));

  const mine = query.owner === "me";

  return {
    success: true,
    data: {
      page,
      limit,
      skip: (page - 1) * limit,
      search: typeof query.search === "string" ? query.search.trim() : "",
      tags,
      sortBy: query.sortBy ?? "createdAt",
      sortOrder: query.sortOrder === "asc" ? 1 : -1,
      mine,
    },
  };
};

export const validateBookBody = (
  value: any,
): ValidationResult<BookBodyInput> => {
  const errors: ValidationIssue[] = [];
  const body =
    value && typeof value === "object" && !Array.isArray(value)
      ? (value as Record<string, any>)
      : {};
  const input: Record<string, any> = {};

  const MIN_TEXT_LENGTH = 3;

  for (const field of ["title", "author", "publisher", "isbn"]) {
    if (typeof body[field] !== "string" || !body[field].trim()) {
      errors.push({ field, message: `${field} is required` });
    } else if (body[field].trim().length < MIN_TEXT_LENGTH) {
      errors.push({
        field,
        message: `${field} must be at least ${MIN_TEXT_LENGTH} characters`,
      });
    } else {
      input[field] = body[field].trim();
    }
  }

  if (typeof input.title === "string")
    input.titleKey = input.title.replace(/\s+/g, " ").toLowerCase();
  if (typeof input.author === "string")
    input.authorKey = input.author.replace(/\s+/g, " ").toLowerCase();
  if (typeof input.publisher === "string")
    input.publisherKey = input.publisher.replace(/\s+/g, " ").toLowerCase();

  if (
    typeof body.edition !== "number" ||
    !Number.isFinite(body.edition) ||
    body.edition < 1
  ) {
    errors.push({
      field: "edition",
      message: "edition is required and must be a positive number",
    });
  } else {
    input.edition = body.edition;
  }

  if (body.cover !== undefined) {
    if (typeof body.cover !== "string") {
      errors.push({ field: "cover", message: "cover must be a string" });
    } else {
      input.cover = body.cover.trim();
    }
  }

  if (body.tags !== undefined) {
    const rawTags = body.tags;
    if (!Array.isArray(rawTags) || rawTags.some((t: any) => typeof t !== "string")) {
      errors.push({ field: "tags", message: "tags must be an array of strings" });
    } else {

      const tags = [
        ...new Set(rawTags.map((t: string) => t.trim().toLowerCase()).filter(Boolean)),
      ];

      if (tags.some((t) => !/^[a-z0-9]{3,20}$/.test(t))) {
        errors.push({
          field: "tags",
          message: "each tag must be 3-20 characters using only a-z and 0-9",
        });
      } else {
        input.tags = tags;
      }
    }
  }

  if (!Number.isInteger(body.quantity) || body.quantity < 1) {
    errors.push({ field: "quantity", message: "quantity must be a positive integer" });
  } else {
    input.quantity = body.quantity;
  }

  if (errors.length) return { success: false, errors };
  return { success: true, data: input as BookBodyInput };
};

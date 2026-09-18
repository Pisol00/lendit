import {
  type ValidationIssue,
  type ValidationResult,
} from "./common.validator";

export const validateDashboardQuery = (
  query: Record<string, any>,
): ValidationResult<{
  from?: Date;
  to?: Date;
  month?: Date;
  allTime: boolean;
}> => {
  const errors: ValidationIssue[] = [];

  let month: Date | undefined;
  let allTime = false;
  if (query.month !== undefined) {
    if (query.month === "all") {
      allTime = true;
    } else {
      const match = /^(\d{4})-(\d{2})$/.exec(query.month);
      if (!match) {
        errors.push({
          field: "month",
          message: 'month must be in YYYY-MM format or "all"',
        });
      } else {
        const [, year, m] = match;
        const monthIndex = Number(m) - 1;
        if (monthIndex < 0 || monthIndex > 11) {
          errors.push({ field: "month", message: "month must be a valid month" });
        } else {
          month = new Date(Number(year), monthIndex, 1);
        }
      }
    }
  }
  const hasFrom = query.from !== undefined;
  const hasTo = query.to !== undefined;

  if (hasFrom !== hasTo) {
    const missingField = hasFrom ? "to" : "from";
    const providedField = hasFrom ? "from" : "to";

    errors.push({
      field: missingField,
      message: `${missingField} is required when ${providedField} is provided`,
    });
  }

  let from: Date | undefined;
  let to: Date | undefined;

  for (const field of ["from", "to"] as const) {
    if (query[field] === undefined) continue;

    const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(query[field]);
    if (!match) {
      errors.push({
        field,
        message: `${field} must be in YYYY-MM-DD format`,
      });
      continue;
    }

    const [, year, mm, day] = match;
    const date = new Date(Number(year), Number(mm) - 1, Number(day));
    const isInvalidDate =
      date.getFullYear() !== Number(year) ||
      date.getMonth() !== Number(mm) - 1 ||
      date.getDate() !== Number(day);

    if (isInvalidDate) {
      errors.push({ field, message: `${field} must be a valid date` });
      continue;
    }

    if (field === "to") {
      date.setHours(23, 59, 59, 999);
      to = date;
    } else {
      from = date;
    }
  }

  if (from && to) {
    const toIsBeforeFrom = to.getTime() < from.getTime();

    if (toIsBeforeFrom) {
      errors.push({ field: "to", message: "to must not be before from" });
    }
  }

  if (errors.length) return { success: false, errors };
  return { success: true, data: { from, to, month, allTime } };
};

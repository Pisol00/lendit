type ResponseContext = {
  set: {
    status?: number | string;
  };
  requestId?: string;
};

export const response = {
  status<T>(ctx: ResponseContext, statusCode: number, body: T): T {
    ctx.set.status = statusCode;
    return body;
  },

  ok(ctx: ResponseContext, body: any) {
    return response.status(ctx, 200, body);
  },

  empty(ctx: ResponseContext, statusCode: number) {
    ctx.set.status = statusCode;
  },

  badRequest(ctx: ResponseContext, message: string) {
    return response.status(ctx, 400, { message });
  },

  unauthorized(ctx: ResponseContext, message = "Unauthorized") {
    return response.status(ctx, 401, { message });
  },

  validationError(ctx: ResponseContext, errors: any) {
    return response.status(ctx, 400, { errors });
  },

  serverError(ctx: ResponseContext) {
    return response.status(ctx, 500, {
      message: "Please contact the administrator",
      requestId: ctx.requestId,
    });
  },
};

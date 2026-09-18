import { Elysia } from "elysia";

export const requestIdMiddleware = new Elysia({ name: "request-id" }).derive(

  { as: "global" },
  ({ set }) => {

    const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
    let requestId = "";
    for (let i = 0; i < 10; i++) {
      requestId += chars[Math.floor(Math.random() * chars.length)];

      if (i === 5) requestId += "-";
    }

    set.headers["x-request-id"] = requestId;
    return { requestId };
  }
);

import { Elysia } from "elysia";
import { cors } from "@elysiajs/cors";
import "dotenv/config";
import { connectDB } from "./config/db";
import { authRoutes } from "./routes/auth.routes";
import { accountRoutes } from "./routes/account.routes";
import { bookRoutes } from "./routes/book.routes";
import { borrowingRoutes } from "./routes/borrowing.routes";
import { tagRoutes } from "./routes/tag.routes";
import { dashboardRoutes } from "./routes/dashboard.routes";
import { ratingRoutes } from "./routes/rating.routes";
import { response } from "./utils/response";
import { requestIdMiddleware } from "./middlewares/request-id";
import { startBorrowingScheduler } from "./jobs/borrowing.job";
import { startSessionScheduler } from "./jobs/session.job";

await connectDB();

startBorrowingScheduler();
startSessionScheduler();

new Elysia()

  .use(cors({ exposeHeaders: ["x-request-id"] }))
  .use(requestIdMiddleware)
  .group("/api/v1", (app) =>
    app
      .use(authRoutes)
      .use(accountRoutes)
      .use(bookRoutes)
      .use(borrowingRoutes)
      .use(tagRoutes)
      .use(dashboardRoutes)
      .use(ratingRoutes)
  )
  .all("*", ({ set }) =>
    response.status({ set }, 400, { message: "Route not found" }),
  )
  .listen(process.env.PORT || 3000);

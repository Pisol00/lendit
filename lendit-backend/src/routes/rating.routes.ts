import { Elysia } from "elysia";
import { ratingController } from "../controllers/rating.controller";
import { authPlugin } from "../middlewares/auth";
import { Role } from "../models/account.model";

export const ratingRoutes = new Elysia({ prefix: "/ratings" })
  .use(authPlugin)
  .guard({ auth: true }, (app) =>
    app

      .post("/", ratingController.create)

      .get("/borrowings/:borrowingId", ratingController.listByBorrowing)

      .get("/accounts/:accountId", ratingController.listByAccount)
      .get("/accounts/:accountId/summary", ratingController.summaryByAccount),
  )

  .guard({ auth: Role.Admin }, (app) =>
    app
      .get("/moderation", ratingController.listForModeration)

      .put("/:id/restore", ratingController.restore)
      .delete("/:id", ratingController.remove),
  );

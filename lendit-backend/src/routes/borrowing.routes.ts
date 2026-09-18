import { Elysia } from "elysia";
import { borrowingController } from "../controllers/borrowing.controller";
import { authPlugin } from "../middlewares/auth";

export const borrowingRoutes = new Elysia({ prefix: "/borrowings" })
  .use(authPlugin)
  .guard({ auth: true }, (app) =>
    app
      .get("/", borrowingController.list)

      .post("/", borrowingController.request)

      .put("/:id/approve", borrowingController.approve)
      .put("/:id/reject", borrowingController.reject)

      .put("/:id/cancel", borrowingController.cancel)

      .put("/:id/return", borrowingController.return),
  );

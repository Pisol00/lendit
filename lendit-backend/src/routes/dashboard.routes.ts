import { Elysia } from "elysia";
import { dashboardController } from "../controllers/dashboard.controller";
import { authPlugin } from "../middlewares/auth";
import { Role } from "../models/account.model";

export const dashboardRoutes = new Elysia({ prefix: "/dashboard" })
  .use(authPlugin)
  .guard({ auth: Role.Admin }, (app) =>
    app.get("/", dashboardController.overview),
  );

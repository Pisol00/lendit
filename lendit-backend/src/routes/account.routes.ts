import { Elysia } from "elysia";
import { accountController } from "../controllers/account.controller";
import { authPlugin } from "../middlewares/auth";
import { Role } from "../models/account.model";

export const accountRoutes = new Elysia({ prefix: "/accounts" })
  .use(authPlugin)
  .put("/me", accountController.updateMe, { auth: true })
  .get("/:id", accountController.getById, {
    auth: true,
  })
  .guard({ auth: Role.Admin }, (app) =>
    app
      .get("/", accountController.list)
      .put("/:id/status", accountController.setStatus)
      .delete("/:id", accountController.remove),
  );

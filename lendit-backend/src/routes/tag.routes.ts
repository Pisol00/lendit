import { Elysia } from "elysia";
import { tagController } from "../controllers/tag.controller";
import { authPlugin } from "../middlewares/auth";
import { Role } from "../models/account.model";

export const tagRoutes = new Elysia({ prefix: "/tags" })
  .use(authPlugin)
  .get("/", tagController.list, { auth: true })
  .guard({ auth: Role.Admin }, (app) =>
    app.post("/", tagController.create).delete("/:name", tagController.remove),
  );

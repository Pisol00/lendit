import { Elysia } from "elysia";
import { bookController } from "../controllers/book.controller";
import { authPlugin } from "../middlewares/auth";

export const bookRoutes = new Elysia({ prefix: "/books" })
  .use(authPlugin)
  .guard({ auth: true }, (app) =>
    app
      .get("/", bookController.list)
      .get("/:id", bookController.getById)
      .post("/", bookController.create)
      .put("/:id", bookController.update)
      .delete("/:id", bookController.remove),
  );

import { Elysia } from "elysia";
import { authController } from "../controllers/auth.controller";
import { authPlugin } from "../middlewares/auth";

export const authRoutes = new Elysia({ prefix: "/auth" })
  .use(authPlugin)
  .post("/register", authController.register)
  .post("/login", authController.login)
  .post("/logout", authController.logout, {
    auth: true,
  });

import Elysia from "elysia";
import { userService } from "./user";

export const chooseConverter = new Elysia().use(userService).get(
  "/healthcheck",
  () => {
    return { status: "ok" };
  },
  {
    auth: false,
  },
);
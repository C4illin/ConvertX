import { Elysia } from "elysia";
import { authMiddleware } from "../middleware/auth";

export const debug = new Elysia({ prefix: "/debug" })
  .use(authMiddleware)
  .get("/auth", ({ headers, ...ctx }: any) => {
    const user = (ctx as any).user;
    return {
      success: true,
      data: {
        headers: {
          authorization: headers.authorization,
          cookie: headers.cookie,
        },
        user: user || null,
        hasUser: !!user,
      },
    };
  });
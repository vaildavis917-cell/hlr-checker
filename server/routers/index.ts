import { router } from "../_core/trpc";
import { systemRouter } from "../_core/systemRouter";
import { adminRouter } from "./admin";
import { authRouter } from "./auth";
import { emailRouter } from "./email";
import { exportTemplatesRouter } from "./exportTemplates";
import { hlrRouter } from "./hlr";

export const appRouter = router({
  system: systemRouter,
  admin: adminRouter,
  exportTemplates: exportTemplatesRouter,
  email: emailRouter,
  auth: authRouter,
  hlr: hlrRouter,
});

export type AppRouter = typeof appRouter;

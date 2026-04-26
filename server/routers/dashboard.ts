import { protectedProcedure, router } from "../_core/trpc";
import { getDashboardKPIs } from "../db";

export const dashboardRouter = router({
  kpis: protectedProcedure.query(async () => {
    return getDashboardKPIs();
  }),
});

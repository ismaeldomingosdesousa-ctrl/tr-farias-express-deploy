import { COOKIE_NAME } from "@shared/const";
import { buildClearCookieString } from "./_core/cookies";
import { systemRouter } from "./_core/systemRouter";
import { publicProcedure, router } from "./_core/trpc";
import { dashboardRouter } from "./routers/dashboard";
import { clientsRouter } from "./routers/clients";
import { ordersRouter } from "./routers/orders";
import { driversRouter } from "./routers/drivers";
import { vehiclesRouter } from "./routers/vehicles";
import { warehouseRouter } from "./routers/warehouse";
import { quotesRouter } from "./routers/quotes";
import { routesRouter } from "./routers/routes";
import { trackingRouter } from "./routers/tracking";
import { fiscalRouter } from "./routers/fiscal";
import { financialRouter } from "./routers/financial";
import { alertsRouter } from "./routers/alerts";
import { stripeRouter } from "./routers/stripe";
import { reportsRouter } from "./routers/reports";
import { driverAppRouter } from "./routers/driverApp";
import { clientPortalRouter } from "./routers/clientPortal";

export const appRouter = router({
  system: systemRouter,
  auth: router({
    me: publicProcedure.query(opts => opts.ctx.user),
    logout: publicProcedure.mutation(({ ctx }) => {
      ctx.setCookies.push(buildClearCookieString(COOKIE_NAME));
      return { success: true } as const;
    }),
  }),
  dashboard: dashboardRouter,
  clients: clientsRouter,
  orders: ordersRouter,
  drivers: driversRouter,
  vehicles: vehiclesRouter,
  warehouse: warehouseRouter,
  quotes: quotesRouter,
  routes: routesRouter,
  tracking: trackingRouter,
  fiscal: fiscalRouter,
  financial: financialRouter,
  alerts: alertsRouter,
  stripe: stripeRouter,
  reports: reportsRouter,
  driverApp: driverAppRouter,
  clientPortal: clientPortalRouter,
});

export type AppRouter = typeof appRouter;

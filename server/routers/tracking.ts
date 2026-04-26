import { z } from "zod";
import { protectedProcedure, router } from "../_core/trpc";
import { addTrackingPoint, getTrackingByOrder, getTrackingByRoute, getLatestTrackingByVehicle, getRouteById, createAlert } from "../db";
import { notifyOwner } from "../_core/notification";

// Haversine distance in km
function haversineKm(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const R = 6371;
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLng = (lng2 - lng1) * Math.PI / 180;
  const a = Math.sin(dLat / 2) ** 2 + Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

// Calculate ETA based on current position, destination, and average speed
function calculateETA(
  currentLat: number, currentLng: number,
  destLat: number, destLng: number,
  speedKmh: number
): { distanceKm: number; etaMinutes: number; etaDate: Date } {
  const distanceKm = haversineKm(currentLat, currentLng, destLat, destLng);
  const avgSpeed = speedKmh > 0 ? speedKmh : 60; // default 60 km/h
  const etaMinutes = Math.round((distanceKm / avgSpeed) * 60);
  const etaDate = new Date(Date.now() + etaMinutes * 60 * 1000);
  return { distanceKm: Math.round(distanceKm * 100) / 100, etaMinutes, etaDate };
}

// Check if point is outside geofence corridor (simple radius-based)
function isOutsideGeofence(
  lat: number, lng: number,
  originLat: number, originLng: number,
  destLat: number, destLng: number,
  corridorRadiusKm: number = 15
): boolean {
  // Calculate distance from point to the line segment (origin -> dest)
  const dOrigin = haversineKm(lat, lng, originLat, originLng);
  const dDest = haversineKm(lat, lng, destLat, destLng);
  const dRoute = haversineKm(originLat, originLng, destLat, destLng);

  // If the vehicle is beyond origin or destination, check distance to nearest endpoint
  if (dOrigin > dRoute || dDest > dRoute) {
    return Math.min(dOrigin, dDest) > corridorRadiusKm;
  }

  // Use triangle area method for perpendicular distance
  const s = (dOrigin + dDest + dRoute) / 2;
  const area = Math.sqrt(Math.max(0, s * (s - dOrigin) * (s - dDest) * (s - dRoute)));
  const perpendicularDist = (2 * area) / dRoute;

  return perpendicularDist > corridorRadiusKm;
}

export const trackingRouter = router({
  byOrder: protectedProcedure.input(z.object({ orderId: z.number() })).query(async ({ input }) => getTrackingByOrder(input.orderId)),
  byRoute: protectedProcedure.input(z.object({ routeId: z.number() })).query(async ({ input }) => getTrackingByRoute(input.routeId)),
  latestByVehicle: protectedProcedure.input(z.object({ vehicleId: z.number() })).query(async ({ input }) => getLatestTrackingByVehicle(input.vehicleId)),

  // Calculate ETA for a route based on current vehicle position
  calculateETA: protectedProcedure.input(z.object({
    routeId: z.number(),
    currentLat: z.number(),
    currentLng: z.number(),
    speedKmh: z.number().optional(),
  })).query(async ({ input }) => {
    const route = await getRouteById(input.routeId);
    if (!route || !route.destLat || !route.destLng) {
      return { error: "Rota não encontrada ou sem destino definido" };
    }
    const eta = calculateETA(
      input.currentLat, input.currentLng,
      route.destLat, route.destLng,
      input.speedKmh || 60
    );
    return {
      routeId: input.routeId,
      remainingDistanceKm: eta.distanceKm,
      etaMinutes: eta.etaMinutes,
      estimatedArrival: eta.etaDate.getTime(),
    };
  }),

  // Check geofence for a route
  checkGeofence: protectedProcedure.input(z.object({
    routeId: z.number(),
    lat: z.number(),
    lng: z.number(),
    corridorRadiusKm: z.number().optional().default(15),
  })).query(async ({ input }) => {
    const route = await getRouteById(input.routeId);
    if (!route || !route.originLat || !route.originLng || !route.destLat || !route.destLng) {
      return { withinGeofence: true, message: "Sem dados de rota para verificar geofence" };
    }
    const outside = isOutsideGeofence(
      input.lat, input.lng,
      route.originLat, route.originLng,
      route.destLat, route.destLng,
      input.corridorRadiusKm
    );
    return {
      withinGeofence: !outside,
      deviationDetected: outside,
      message: outside ? "Veículo fora do corredor da rota!" : "Veículo dentro do corredor da rota",
    };
  }),

  addPoint: protectedProcedure.input(z.object({
    orderId: z.number().optional(),
    routeId: z.number().optional(),
    driverId: z.number().optional(),
    vehicleId: z.number().optional(),
    lat: z.number(),
    lng: z.number(),
    speed: z.number().optional(),
    heading: z.number().optional(),
    eventType: z.string().optional(),
    notes: z.string().optional(),
  })).mutation(async ({ input, ctx }) => {
    await addTrackingPoint(input);

    // Auto-check geofence if routeId is provided
    if (input.routeId) {
      try {
        const route = await getRouteById(input.routeId);
        if (route?.originLat && route?.originLng && route?.destLat && route?.destLng) {
          const outside = isOutsideGeofence(
            input.lat, input.lng,
            route.originLat, route.originLng,
            route.destLat, route.destLng,
            15
          );
          if (outside) {
            // Create automatic alert
            await createAlert({
              type: "geofence_breach",
              severity: "critical",
              title: `Desvio de rota detectado - Rota ${route.routeCode}`,
              message: `Veículo detectado fora do corredor da rota ${route.routeCode}. Posição: ${input.lat.toFixed(4)}, ${input.lng.toFixed(4)}`,
              entityType: "route",
              entityId: input.routeId,
              userId: ctx.user.id,
            });
            // Notify owner
            try {
              await notifyOwner({
                title: `[CRITICAL] Desvio de rota - ${route.routeCode}`,
                content: `Veículo fora do corredor da rota. Posição: ${input.lat.toFixed(4)}, ${input.lng.toFixed(4)}`,
              });
            } catch (e) {
              console.warn("[Tracking] Failed to notify owner of geofence breach:", e);
            }
          }
        }
      } catch (e) {
        console.warn("[Tracking] Geofence check failed:", e);
      }
    }

    return { success: true };
  }),
});

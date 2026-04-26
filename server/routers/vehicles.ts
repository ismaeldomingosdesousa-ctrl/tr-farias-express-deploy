import { z } from "zod";
import { protectedProcedure, router } from "../_core/trpc";
import { listVehicles, getVehicleById, createVehicle, updateVehicle } from "../db";

export const vehiclesRouter = router({
  list: protectedProcedure.query(async () => listVehicles()),
  getById: protectedProcedure.input(z.object({ id: z.number() })).query(async ({ input }) => getVehicleById(input.id)),
  create: protectedProcedure.input(z.object({
    plate: z.string().min(1),
    type: z.enum(["vuc", "toco", "truck", "carreta", "bitrem", "van", "utilitario"]),
    brand: z.string().optional(),
    model: z.string().optional(),
    year: z.number().optional(),
    capacityKg: z.number().optional(),
    capacityM3: z.number().optional(),
    driverId: z.number().optional(),
    fuelType: z.string().optional(),
    kmCurrent: z.number().optional(),
    nextMaintenanceKm: z.number().optional(),
    crlvExpiry: z.date().optional(),
  })).mutation(async ({ input }) => {
    const id = await createVehicle(input);
    return { id };
  }),
  update: protectedProcedure.input(z.object({
    id: z.number(),
    plate: z.string().optional(),
    type: z.enum(["vuc", "toco", "truck", "carreta", "bitrem", "van", "utilitario"]).optional(),
    brand: z.string().optional(),
    model: z.string().optional(),
    year: z.number().optional(),
    capacityKg: z.number().optional(),
    capacityM3: z.number().optional(),
    driverId: z.number().optional().nullable(),
    status: z.enum(["available", "in_use", "maintenance", "inactive"]).optional(),
    fuelType: z.string().optional(),
    kmCurrent: z.number().optional(),
    nextMaintenanceKm: z.number().optional(),
    crlvExpiry: z.date().optional().nullable(),
  })).mutation(async ({ input }) => {
    const { id, ...data } = input;
    await updateVehicle(id, data);
    return { success: true };
  }),
});

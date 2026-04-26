import { z } from "zod";
import { protectedProcedure, router } from "../_core/trpc";
import { listDrivers, getDriverById, createDriver, updateDriver } from "../db";

export const driversRouter = router({
  list: protectedProcedure.query(async () => listDrivers()),
  getById: protectedProcedure.input(z.object({ id: z.number() })).query(async ({ input }) => getDriverById(input.id)),
  create: protectedProcedure.input(z.object({
    name: z.string().min(1),
    cpf: z.string().min(1),
    cnh: z.string().min(1),
    cnhCategory: z.string().optional(),
    cnhExpiry: z.date().optional(),
    phone: z.string().optional(),
    email: z.string().optional(),
    address: z.string().optional(),
    city: z.string().optional(),
    state: z.string().optional(),
  })).mutation(async ({ input }) => {
    const id = await createDriver(input);
    return { id };
  }),
  update: protectedProcedure.input(z.object({
    id: z.number(),
    name: z.string().optional(),
    cpf: z.string().optional(),
    cnh: z.string().optional(),
    cnhCategory: z.string().optional(),
    cnhExpiry: z.date().optional().nullable(),
    phone: z.string().optional(),
    email: z.string().optional(),
    address: z.string().optional(),
    city: z.string().optional(),
    state: z.string().optional(),
    status: z.enum(["available", "on_trip", "inactive", "suspended"]).optional(),
    rating: z.number().optional(),
    lat: z.number().optional(),
    lng: z.number().optional(),
  })).mutation(async ({ input }) => {
    const { id, ...data } = input;
    await updateDriver(id, data);
    return { success: true };
  }),
  updateLocation: protectedProcedure.input(z.object({
    id: z.number(),
    lat: z.number(),
    lng: z.number(),
  })).mutation(async ({ input }) => {
    await updateDriver(input.id, { lat: input.lat, lng: input.lng, lastLocationUpdate: new Date() });
    return { success: true };
  }),
});

import { z } from "zod";
import { protectedProcedure, router } from "../_core/trpc";
import { listClients, getClientById, createClient, updateClient } from "../db";

export const clientsRouter = router({
  list: protectedProcedure.query(async () => listClients()),
  getById: protectedProcedure.input(z.object({ id: z.number() })).query(async ({ input }) => getClientById(input.id)),
  create: protectedProcedure.input(z.object({
    name: z.string().min(1),
    cnpj: z.string().min(1),
    email: z.string().email().optional(),
    phone: z.string().optional(),
    address: z.string().optional(),
    city: z.string().optional(),
    state: z.string().optional(),
    zipCode: z.string().optional(),
    contactPerson: z.string().optional(),
  })).mutation(async ({ input }) => {
    const id = await createClient(input);
    return { id };
  }),
  update: protectedProcedure.input(z.object({
    id: z.number(),
    name: z.string().optional(),
    cnpj: z.string().optional(),
    email: z.string().optional(),
    phone: z.string().optional(),
    address: z.string().optional(),
    city: z.string().optional(),
    state: z.string().optional(),
    zipCode: z.string().optional(),
    contactPerson: z.string().optional(),
    status: z.enum(["active", "inactive"]).optional(),
  })).mutation(async ({ input }) => {
    const { id, ...data } = input;
    await updateClient(id, data);
    return { success: true };
  }),
});

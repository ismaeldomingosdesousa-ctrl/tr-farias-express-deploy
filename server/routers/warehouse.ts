import { z } from "zod";
import { protectedProcedure, router } from "../_core/trpc";
import {
  listWarehouses, getWarehouseById, createWarehouse, updateWarehouse,
  listInventory, getInventoryById, createInventoryItem, updateInventoryItem,
  createInventoryMovement, listInventoryMovements,
} from "../db";

export const warehouseRouter = router({
  list: protectedProcedure.query(async () => listWarehouses()),
  getById: protectedProcedure.input(z.object({ id: z.number() })).query(async ({ input }) => getWarehouseById(input.id)),
  create: protectedProcedure.input(z.object({
    name: z.string().min(1),
    code: z.string().min(1),
    address: z.string().optional(),
    city: z.string().optional(),
    state: z.string().optional(),
    zipCode: z.string().optional(),
    lat: z.number().optional(),
    lng: z.number().optional(),
    totalCapacityM3: z.number().optional(),
  })).mutation(async ({ input }) => {
    const id = await createWarehouse(input);
    return { id };
  }),
  update: protectedProcedure.input(z.object({
    id: z.number(),
    name: z.string().optional(),
    code: z.string().optional(),
    address: z.string().optional(),
    city: z.string().optional(),
    state: z.string().optional(),
    zipCode: z.string().optional(),
    totalCapacityM3: z.number().optional(),
    usedCapacityM3: z.number().optional(),
    status: z.enum(["active", "inactive"]).optional(),
  })).mutation(async ({ input }) => {
    const { id, ...data } = input;
    await updateWarehouse(id, data);
    return { success: true };
  }),

  // Inventory
  inventoryList: protectedProcedure.input(z.object({ warehouseId: z.number().optional() }).optional()).query(async ({ input }) => listInventory(input?.warehouseId)),
  inventoryGetById: protectedProcedure.input(z.object({ id: z.number() })).query(async ({ input }) => getInventoryById(input.id)),
  inventoryCreate: protectedProcedure.input(z.object({
    sku: z.string().min(1),
    productName: z.string().min(1),
    warehouseId: z.number(),
    location: z.string().optional(),
    availableQty: z.number().default(0),
    minQty: z.number().optional(),
    weightKg: z.number().optional(),
    volumeM3: z.number().optional(),
    unitPrice: z.number().optional(),
  })).mutation(async ({ input }) => {
    const id = await createInventoryItem(input);
    return { id };
  }),
  inventoryUpdate: protectedProcedure.input(z.object({
    id: z.number(),
    productName: z.string().optional(),
    location: z.string().optional(),
    availableQty: z.number().optional(),
    reservedQty: z.number().optional(),
    minQty: z.number().optional(),
    weightKg: z.number().optional(),
    volumeM3: z.number().optional(),
    unitPrice: z.number().optional(),
  })).mutation(async ({ input }) => {
    const { id, ...data } = input;
    await updateInventoryItem(id, data);
    return { success: true };
  }),

  // Movements
  movementsList: protectedProcedure.input(z.object({ warehouseId: z.number().optional() }).optional()).query(async ({ input }) => listInventoryMovements(input?.warehouseId)),
  movementCreate: protectedProcedure.input(z.object({
    inventoryId: z.number(),
    warehouseId: z.number(),
    type: z.enum(["inbound", "outbound", "transfer", "adjustment", "picking", "packing"]),
    quantity: z.number(),
    reference: z.string().optional(),
    notes: z.string().optional(),
  })).mutation(async ({ input, ctx }) => {
    await createInventoryMovement({ ...input, userId: ctx.user.id });
    // Update inventory qty
    const item = await getInventoryById(input.inventoryId);
    if (item) {
      const delta = ["inbound", "adjustment"].includes(input.type) ? input.quantity : -input.quantity;
      await updateInventoryItem(input.inventoryId, { availableQty: Math.max(0, item.availableQty + delta) });
    }
    return { success: true };
  }),
});

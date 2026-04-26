import { z } from "zod";
import { protectedProcedure, router } from "../_core/trpc";
import { listQuotes, getQuoteById, createQuote, updateQuote, createOrder, addOrderStatusHistory } from "../db";
import { nanoid } from "nanoid";

// Pricing engine: dynamic pricing based on weight, distance, volume, urgency
function calculatePrice(weightKg: number, distanceKm: number, volumeM3: number | undefined, urgency: string) {
  const BASE_PRICE = 35.0;
  const PRICE_PER_KG = 0.45;
  const PRICE_PER_KM = 1.20;
  const PRICE_PER_M3 = 15.0;

  const urgencyMultipliers: Record<string, number> = {
    standard: 1.0,
    express: 1.5,
    same_day: 2.2,
  };

  const weightPrice = weightKg * PRICE_PER_KG;
  const distancePrice = distanceKm * PRICE_PER_KM;
  const volumePrice = (volumeM3 || 0) * PRICE_PER_M3;
  const multiplier = urgencyMultipliers[urgency] || 1.0;
  const totalPrice = (BASE_PRICE + weightPrice + distancePrice + volumePrice) * multiplier;

  return {
    basePrice: BASE_PRICE,
    weightPrice: Math.round(weightPrice * 100) / 100,
    distancePrice: Math.round(distancePrice * 100) / 100,
    urgencyMultiplier: multiplier,
    totalPrice: Math.round(totalPrice * 100) / 100,
  };
}

export const quotesRouter = router({
  list: protectedProcedure.query(async () => listQuotes()),
  getById: protectedProcedure.input(z.object({ id: z.number() })).query(async ({ input }) => getQuoteById(input.id)),

  simulate: protectedProcedure.input(z.object({
    originZip: z.string().min(1),
    destZip: z.string().min(1),
    weightKg: z.number().positive(),
    volumeM3: z.number().optional(),
    distanceKm: z.number().positive(),
    urgency: z.enum(["standard", "express", "same_day"]).default("standard"),
  })).mutation(async ({ input }) => {
    const pricing = calculatePrice(input.weightKg, input.distanceKm, input.volumeM3, input.urgency);
    return pricing;
  }),

  create: protectedProcedure.input(z.object({
    clientId: z.number().optional(),
    originZip: z.string().min(1),
    originCity: z.string().optional(),
    originState: z.string().optional(),
    destZip: z.string().min(1),
    destCity: z.string().optional(),
    destState: z.string().optional(),
    weightKg: z.number().positive(),
    volumeM3: z.number().optional(),
    distanceKm: z.number().positive(),
    urgency: z.enum(["standard", "express", "same_day"]).default("standard"),
  })).mutation(async ({ input }) => {
    const pricing = calculatePrice(input.weightKg, input.distanceKm, input.volumeM3, input.urgency);
    const quoteNumber = `COT-${nanoid(8).toUpperCase()}`;
    const validUntil = new Date();
    validUntil.setDate(validUntil.getDate() + 7);

    const id = await createQuote({
      ...input,
      quoteNumber,
      ...pricing,
      validUntil,
    });
    return { id, quoteNumber, ...pricing };
  }),

  update: protectedProcedure.input(z.object({
    id: z.number(),
    status: z.enum(["pending", "accepted", "rejected", "expired", "converted"]).optional(),
    orderId: z.number().optional(),
  })).mutation(async ({ input }) => {
    const { id, ...data } = input;
    await updateQuote(id, data);
    return { success: true };
  }),

  convertToOrder: protectedProcedure.input(z.object({
    id: z.number(),
  })).mutation(async ({ input, ctx }) => {
    const quote = await getQuoteById(input.id);
    if (!quote) throw new Error("Cotação não encontrada");
    if (quote.status === "converted") throw new Error("Esta cotação já foi convertida em pedido");
    if (quote.status === "rejected") throw new Error("Não é possível converter uma cotação rejeitada");
    if (quote.status === "expired") throw new Error("Não é possível converter uma cotação expirada");
    if (quote.status !== "accepted") throw new Error("A cotação precisa estar ACEITA para ser convertida em pedido");
    if (!quote.clientId) throw new Error("A cotação não possui cliente vinculado. Edite a cotação e selecione um cliente antes de converter.");

    // Map urgency to priority
    const priorityMap: Record<string, "low" | "normal" | "high" | "urgent"> = {
      standard: "normal",
      express: "high",
      same_day: "urgent",
    };

    const orderNumber = `ORD-${nanoid(8).toUpperCase()}`;
    const orderId = await createOrder({
      orderNumber,
      clientId: quote.clientId ?? 0,
      originZip: quote.originZip,
      originCity: quote.originCity ?? undefined,
      originState: quote.originState ?? undefined,
      destZip: quote.destZip,
      destCity: quote.destCity ?? undefined,
      destState: quote.destState ?? undefined,
      totalWeight: quote.weightKg,
      totalVolume: quote.volumeM3 ?? undefined,
      freightValue: quote.totalPrice ?? undefined,
      priority: priorityMap[quote.urgency] ?? "normal",
      notes: `Gerado a partir da cotação ${quote.quoteNumber}`,
    });

    if (!orderId) throw new Error("Falha ao criar pedido");

    await addOrderStatusHistory(orderId, null, "pending", ctx.user.id, `Pedido criado a partir da cotação ${quote.quoteNumber}`);
    await updateQuote(input.id, { status: "converted", orderId });

    return { orderId, orderNumber };
  }),
});

import { Router } from "express";
import { storagePut } from "../storage";
import { getDb, updateOrder } from "../db";
import { orders } from "../../drizzle/schema";
import { eq } from "drizzle-orm";
import { nanoid } from "nanoid";

export function registerPhotoUploadRoute(app: Router) {
  // POST /api/upload/proof
  // Body: { orderId: number, driverId: number, imageBase64: string, mimeType: string }
  app.post("/api/upload/proof", async (req, res) => {
    try {
      const { orderId, driverId, imageBase64, mimeType } = req.body;
      if (!orderId || !imageBase64) {
        return res.status(400).json({ error: "orderId and imageBase64 are required" });
      }
      const ext = (mimeType || "image/jpeg").split("/")[1] ?? "jpg";
      const key = `delivery-proofs/order-${orderId}-driver-${driverId ?? "x"}-${nanoid(8)}.${ext}`;
      const buffer = Buffer.from(imageBase64, "base64");
      const { url } = await storagePut(key, buffer, mimeType || "image/jpeg");

      // Save photoProofUrl to order
      const db = await getDb();
      if (db) {
        await db.update(orders)
          .set({ photoProofUrl: url })
          .where(eq(orders.id, Number(orderId)));
      }

      return res.json({ url, key });
    } catch (err: any) {
      console.error("[PhotoUpload] Error:", err);
      return res.status(500).json({ error: err.message ?? "Upload failed" });
    }
  });
}

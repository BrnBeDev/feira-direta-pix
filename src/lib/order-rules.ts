import { z } from "zod";

export const accountPreferencesSchema = z.object({
  name: z.string().trim().min(1).max(80),
  role: z.enum(["produtor", "consumidor"]),
});
export function orderStatusLabel(status: string) {
  if (status === "concluido") return "Concluído";
  if (status === "pago") return "Pago";
  return "Pendente pagamento";
}
export function nextOrderStatus(status: string) {
  if (status === "aguardando_pagamento") return "pago";
  if (status === "pago") return "concluido";
  return null;
}
export function canSendReceipt(isBuyer: boolean, paymentMethod: string) {
  return isBuyer && paymentMethod === "pix";
}
export const messageSchema = z.object({ body: z.string().trim().max(2000), attachment: z.boolean() })
  .refine((value) => value.body.length > 0 || value.attachment);
export function validUpload(file: { size: number; type: string }, receipt = false) {
  const types = ["image/jpeg", "image/png", "image/webp", ...(receipt ? ["application/pdf"] : [])];
  return file.size > 0 && file.size <= 5 * 1024 * 1024 && types.includes(file.type);
}
export function uploadExtension(type: string) {
  return ({ "image/jpeg": "jpg", "image/png": "png", "image/webp": "webp", "application/pdf": "pdf" } as Record<string, string>)[type];
}
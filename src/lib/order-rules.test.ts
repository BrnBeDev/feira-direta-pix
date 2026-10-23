import { describe, test } from "node:test";
import { strictEqual } from "node:assert";
import { accountPreferencesSchema, nextOrderStatus, canSendReceipt, validUpload, messageSchema } from "./order-rules";

describe("regras de contas e pedidos", () => {
  test("configurações aceitam apenas produtor e consumidor", () => {
    strictEqual(accountPreferencesSchema.safeParse({ name: "Bruno", role: "produtor" }).success, true);
    strictEqual(accountPreferencesSchema.safeParse({ name: "Bruno", role: "consumidor" }).success, true);
    strictEqual(accountPreferencesSchema.safeParse({ name: "Bruno", role: "admin" }).success, false);
  });
  test("pedido deve ser pago antes de concluído", () => {
    strictEqual(nextOrderStatus("aguardando_pagamento"), "pago");
    strictEqual(nextOrderStatus("pago"), "concluido");
    strictEqual(nextOrderStatus("concluido"), null);
  });
  test("somente comprador de pedido PIX pode enviar comprovante", () => {
    strictEqual(canSendReceipt(true, "pix"), true);
    strictEqual(canSendReceipt(false, "pix"), false);
    strictEqual(canSendReceipt(true, "na_retirada"), false);
  });
  test("anexos são fotos ou PDF, nunca conteúdo executável", () => {
    strictEqual(validUpload({ size: 10, type: "application/pdf" }, true), true);
    strictEqual(validUpload({ size: 10, type: "application/pdf" }), false);
    strictEqual(validUpload({ size: 10, type: "text/html" }, true), false);
    strictEqual(validUpload({ size: 6 * 1024 * 1024, type: "image/jpeg" }), false);
  });
  test("chat rejeita mensagem vazia sem anexo", () => {
    strictEqual(messageSchema.safeParse({ body: "", attachment: false }).success, false);
    strictEqual(messageSchema.safeParse({ body: "", attachment: true }).success, true);
  });
});
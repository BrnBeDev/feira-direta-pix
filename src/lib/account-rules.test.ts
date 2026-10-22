import { describe, test } from "node:test";
import { strictEqual } from "node:assert";
import { isProducerAccount, validStock } from "./account-rules";

describe("painéis da conta", () => {
  test("produtor recebe painel de produtor", () => {
    strictEqual(isProducerAccount(["produtor"], false), true);
  });
  test("consumidor sem banca recebe painel de comprador", () => {
    strictEqual(isProducerAccount(["consumidor"], false), false);
  });
  test("produtor antigo com banca mantém seu painel", () => {
    strictEqual(isProducerAccount([], true), true);
  });
  test("estoque admite peso fracionado e zero, mas não valores negativos", () => {
    strictEqual(validStock("2,5"), 2.5);
    strictEqual(validStock("0"), 0);
    strictEqual(validStock("-1"), null);
    strictEqual(validStock(""), null);
    strictEqual(validStock("abc"), null);
  });
});
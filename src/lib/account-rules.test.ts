/// <reference types="bun" />
import { describe, expect, test } from "bun:test";
import { isProducerAccount, validStock } from "./account-rules";

describe("painéis da conta", () => {
  test("produtor recebe painel de produtor", () => {
    expect(isProducerAccount(["produtor"], false)).toBe(true);
  });
  test("consumidor sem banca recebe painel de comprador", () => {
    expect(isProducerAccount(["consumidor"], false)).toBe(false);
  });
  test("produtor antigo com banca mantém seu painel", () => {
    expect(isProducerAccount([], true)).toBe(true);
  });
  test("estoque admite peso fracionado e zero, mas não valores negativos", () => {
    expect(validStock("2,5")).toBe(2.5);
    expect(validStock("0")).toBe(0);
    expect(validStock("-1")).toBe(null);
    expect(validStock("")).toBe(null);
    expect(validStock("abc")).toBe(null);
  });
});
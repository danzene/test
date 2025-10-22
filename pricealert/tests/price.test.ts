import { describe, it, expect } from "vitest";
import { parsePriceBRL } from "../src/utils/assert";

describe("parsePriceBRL", () => {
  it("lê BRL padrão", () => {
    expect(parsePriceBRL("R$ 1.234,56")).toBe(1234.56);
  });
  
  it("ignora parcelado e 'de R$'", () => {
    expect(parsePriceBRL("de R$ 2.000,00 por R$ 1.500,00")).toBe(1500.00);
    expect(parsePriceBRL("R$ 1.000,00 em 10x de 100,00")).toBe(null);
  });
  
  it("retorna null para entrada inválida", () => {
    expect(parsePriceBRL("")).toBe(null);
    expect(parsePriceBRL(null)).toBe(null);
    expect(parsePriceBRL("sem preço")).toBe(null);
  });
  
  it("processa formato sem separador de milhares", () => {
    expect(parsePriceBRL("R$ 999,90")).toBe(999.90);
  });
  
  it("processa formato apenas com vírgula", () => {
    expect(parsePriceBRL("R$ 50,00")).toBe(50.00);
  });
});

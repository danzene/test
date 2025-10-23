import { describe, it, expect, vi } from "vitest";
import { parsePriceBRL } from "../src/utils/assert";

describe("PriceAlert - Extração de Preço", () => {
  describe("parsePriceBRL", () => {
    it("deve extrair preço em formato BRL padrão", () => {
      expect(parsePriceBRL("R$ 1.234,56")).toBe(1234.56);
      expect(parsePriceBRL("R$ 99,90")).toBe(99.90);
      expect(parsePriceBRL("R$ 50,00")).toBe(50.00);
    });

    it("deve rejeitar preço parcelado", () => {
      expect(parsePriceBRL("R$ 1.000 em 10x")).toBe(null);
      expect(parsePriceBRL("R$ 1.000,00 em 10x de 100,00")).toBe(null);
      expect(parsePriceBRL("10x de R$ 100,00 juros")).toBe(null);
    });

    it("deve aceitar apenas o preço válido (não 'de R$')", () => {
      expect(parsePriceBRL("de R$ 2.000,00 por R$ 1.500,00")).toBe(1500.00);
      expect(parsePriceBRL("de R$ 500,00")).toBe(null);
    });

    it("deve lidar com formatos alternativos", () => {
      expect(parsePriceBRL("R$1.234,56")).toBe(1234.56);
      expect(parsePriceBRL("R$ 999,99")).toBe(999.99);
      expect(parsePriceBRL("R$  50,00  ")).toBe(50.00);
    });

    it("deve rejeitar valores inválidos", () => {
      expect(parsePriceBRL("")).toBe(null);
      expect(parsePriceBRL(null as any)).toBe(null);
      expect(parsePriceBRL("sem preço")).toBe(null);
      expect(parsePriceBRL("abc")).toBe(null);
    });

    it("deve processar formato sem separador de milhares", () => {
      expect(parsePriceBRL("R$ 999,90")).toBe(999.90);
      expect(parsePriceBRL("R$ 1599,00")).toBe(1599.00);
    });
  });
});

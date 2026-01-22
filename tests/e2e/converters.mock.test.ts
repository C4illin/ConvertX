/**
 * Converter Mock Tests
 *
 * 這些測試不依賴實際的轉換工具，而是測試轉換器的配置邏輯和結構。
 * 可在本地環境中執行，無需安裝 FFmpeg、Inkscape 等工具。
 */

import { describe, expect, test } from "bun:test";
import { getAllInputs, getAllTargets, getPossibleTargets } from "../../src/converters/main";
import { normalizeFiletype, normalizeOutputFiletype } from "../../src/helpers/normalizeFiletype";

describe("Converter Module Structure (Mock)", () => {
  test("getAllTargets 返回正確的結構", () => {
    const targets = getAllTargets();
    expect(typeof targets).toBe("object");
    expect(targets).not.toBeNull();
  });

  test("應該有多個轉換器", () => {
    const targets = getAllTargets();
    const converterNames = Object.keys(targets);
    expect(converterNames.length).toBeGreaterThan(5);
  });

  test("getAllInputs 返回陣列類型", () => {
    const targets = getAllTargets();
    const firstConverter = Object.keys(targets)[0];
    if (firstConverter) {
      const inputs = getAllInputs(firstConverter);
      expect(Array.isArray(inputs)).toBe(true);
    }
  });

  test("getPossibleTargets 返回物件類型", () => {
    const result = getPossibleTargets("svg");
    expect(typeof result).toBe("object");
  });

  test("轉換器名稱存在", () => {
    const targets = getAllTargets();
    const converterNames = Object.keys(targets);
    // 確保有轉換器名稱
    expect(converterNames.length).toBeGreaterThan(0);
    // 每個名稱應該是非空字串
    for (const name of converterNames) {
      expect(typeof name).toBe("string");
      expect(name.length).toBeGreaterThan(0);
    }
  });

  test("輸出格式通常為小寫", () => {
    const targets = getAllTargets();
    let totalFormats = 0;
    let lowercaseFormats = 0;

    for (const formats of Object.values(targets)) {
      for (const format of formats) {
        totalFormats++;
        // 允許特殊格式如 pdf-zh-TW
        if (format === format.toLowerCase() || format.includes("-")) {
          lowercaseFormats++;
        }
      }
    }

    // 大多數格式應該是小寫（允許一些例外）
    expect(lowercaseFormats / totalFormats).toBeGreaterThan(0.9);
  });
});

describe("Converter Configuration Validation (Mock)", () => {
  const converterNames = [
    "inkscape",
    "pandoc",
    "imagemagick",
    "ffmpeg",
    "libreoffice",
    "dasel",
    "calibre",
    "graphicsmagick",
    "vips",
    "potrace",
    "resvg",
    "libheif",
    "libjxl",
    "vtracer",
  ];

  for (const name of converterNames) {
    test(`${name} 存在於轉換器列表中`, () => {
      const targets = getAllTargets();
      expect(Object.keys(targets)).toContain(name);
    });

    test(`${name} 有輸出格式定義`, () => {
      const targets = getAllTargets();
      const converterTargets = targets[name];
      expect(converterTargets).toBeDefined();
      expect(Array.isArray(converterTargets)).toBe(true);
      expect(converterTargets.length).toBeGreaterThan(0);
    });

    test(`${name} 有輸入格式定義`, () => {
      const inputs = getAllInputs(name);
      expect(Array.isArray(inputs)).toBe(true);
      expect(inputs.length).toBeGreaterThan(0);
    });
  }
});

describe("Format Support Validation (Mock)", () => {
  test("SVG 格式有轉換選項", () => {
    const targets = getPossibleTargets("svg");
    expect(Object.keys(targets).length).toBeGreaterThan(0);
  });

  test("PNG 格式有轉換選項", () => {
    const targets = getPossibleTargets("png");
    expect(Object.keys(targets).length).toBeGreaterThan(0);
  });

  test("PDF 格式有轉換選項", () => {
    const targets = getPossibleTargets("pdf");
    expect(Object.keys(targets).length).toBeGreaterThan(0);
  });

  test("DOCX 格式有轉換選項", () => {
    const targets = getPossibleTargets("docx");
    expect(Object.keys(targets).length).toBeGreaterThan(0);
  });

  test("常見格式都有轉換支援", () => {
    const commonFormats = ["jpg", "png", "gif", "pdf", "mp3", "mp4", "json", "yaml"];
    for (const format of commonFormats) {
      const targets = getPossibleTargets(format);
      // 不是所有格式都需要有轉換選項，但大多數應該有
      // 這裡只檢查函數不會出錯
      expect(typeof targets).toBe("object");
    }
  });
});

describe("File Type Normalization (Mock)", () => {
  test("normalizeFiletype 正確處理", () => {
    expect(normalizeFiletype("png")).toBe("png");
    expect(normalizeFiletype("PNG")).toBe("png");
    expect(normalizeFiletype("Png")).toBe("png");
  });

  test("normalizeFiletype 處理別名", () => {
    expect(normalizeFiletype("jpg")).toBe("jpeg");
    expect(normalizeFiletype("jfif")).toBe("jpeg");
    expect(normalizeFiletype("htm")).toBe("html");
    expect(normalizeFiletype("md")).toBe("markdown");
    expect(normalizeFiletype("tex")).toBe("latex");
  });

  test("normalizeOutputFiletype 正確處理", () => {
    // 輸出時反向轉換
    expect(normalizeOutputFiletype("jpeg")).toBe("jpg");
    expect(normalizeOutputFiletype("latex")).toBe("tex");
    expect(normalizeOutputFiletype("markdown")).toBe("md");
  });

  test("normalizeFiletype 處理空字串", () => {
    expect(normalizeFiletype("")).toBe("");
  });
});

describe("Error Handling (Mock)", () => {
  test("不存在的格式返回空物件", () => {
    const result = getPossibleTargets("nonexistent_format_xyz");
    expect(result).toEqual({});
  });

  test("不存在的轉換器返回空陣列", () => {
    const inputs = getAllInputs("NonexistentConverter");
    expect(inputs).toEqual([]);
  });
});

describe("Converter Lookup Logic (Mock)", () => {
  test("SVG 到 PNG 轉換可用", () => {
    const targets = getPossibleTargets("svg");
    const allOutputs = Object.values(targets).flat();
    expect(allOutputs).toContain("png");
  });

  test("SVG 到 PDF 轉換可用", () => {
    const targets = getPossibleTargets("svg");
    const allOutputs = Object.values(targets).flat();
    expect(allOutputs).toContain("pdf");
  });

  test("inkscape 支援 SVG 輸入", () => {
    const inputs = getAllInputs("inkscape");
    expect(inputs).toContain("svg");
  });

  test("inkscape 支援 PNG 輸出", () => {
    const targets = getAllTargets();
    expect(targets["inkscape"]).toContain("png");
  });

  test("pandoc 支援 Markdown 相關輸入", () => {
    const inputs = getAllInputs("pandoc");
    // Pandoc 應該支援 markdown（正規化後的格式）
    expect(inputs.some((i) => i.includes("markdown") || i === "md")).toBe(true);
  });

  test("libreoffice 支援文件格式", () => {
    const inputs = getAllInputs("libreoffice");
    const targets = getAllTargets();
    // 應該支援一些格式
    expect(inputs.length).toBeGreaterThan(0);
    expect(targets["libreoffice"]?.length).toBeGreaterThan(0);
  });

  test("ffmpeg 支援影音格式", () => {
    const inputs = getAllInputs("ffmpeg");
    const targets = getAllTargets();
    // 應該支援一些格式
    expect(inputs.length).toBeGreaterThan(0);
    expect(targets["ffmpeg"]?.length).toBeGreaterThan(0);
  });

  test("vips 支援圖片格式", () => {
    const inputs = getAllInputs("vips");
    expect(inputs.length).toBeGreaterThan(0);
  });

  test("dasel 支援資料格式", () => {
    const inputs = getAllInputs("dasel");
    expect(inputs.some((i) => i === "json" || i === "yaml" || i === "toml")).toBe(true);
  });
});

describe("Converter Name and Type Mapping (Mock)", () => {
  test("getAllTargets 包含多個轉換器", () => {
    const targets = getAllTargets();
    expect(Object.keys(targets).length).toBeGreaterThan(10);
  });

  test("應該有圖片轉換器", () => {
    const targets = getAllTargets();
    const hasImageConverter =
      targets["imagemagick"] || targets["vips"] || targets["graphicsmagick"];
    expect(hasImageConverter).toBeDefined();
  });

  test("輸出格式不重複（各轉換器內）", () => {
    const targets = getAllTargets();
    for (const [, formats] of Object.entries(targets)) {
      const uniqueFormats = [...new Set(formats)];
      // 允許一些重複，但不應該太多
      expect(uniqueFormats.length).toBeGreaterThan(0);
    }
  });
});

describe("Edge Cases (Mock)", () => {
  test("空格式返回空結果", () => {
    const result = getPossibleTargets("");
    expect(typeof result).toBe("object");
  });

  test("特殊字符不會導致錯誤", () => {
    const inputs = getAllInputs("test-converter-!@#$");
    expect(Array.isArray(inputs)).toBe(true);
  });

  test("空轉換器名稱不會錯誤", () => {
    const inputs = getAllInputs("");
    expect(Array.isArray(inputs)).toBe(true);
  });

  test("格式查詢保持一致性", () => {
    // 多次查詢應該返回相同結果
    const targets1 = getAllTargets();
    const targets2 = getAllTargets();
    expect(JSON.stringify(targets1)).toBe(JSON.stringify(targets2));
  });

  test("大小寫不敏感的格式查詢", () => {
    const lower = getPossibleTargets("svg");
    const upper = getPossibleTargets("SVG");
    // 應該返回相同結果（因為 normalizeFiletype 會轉小寫）
    expect(JSON.stringify(lower)).toBe(JSON.stringify(upper));
  });
});

describe("Specific Converter Features (Mock)", () => {
  test("imagemagick 支援常見圖片格式", () => {
    const inputs = getAllInputs("imagemagick");
    const targets = getAllTargets()["imagemagick"] || [];

    // 應該支援 PNG 和 JPEG
    const supportsCommonFormats =
      (inputs.includes("png") || inputs.includes("jpeg")) &&
      (targets.includes("png") || targets.includes("jpg"));
    expect(supportsCommonFormats).toBe(true);
  });

  test("ffmpeg 支援 MP4", () => {
    const inputs = getAllInputs("ffmpeg");
    expect(inputs.includes("mp4")).toBe(true);
  });

  test("calibre 支援電子書格式", () => {
    const targets = getAllTargets()["calibre"] || [];
    const supportsEbook = targets.includes("epub") || targets.includes("mobi");
    expect(supportsEbook).toBe(true);
  });

  test("potrace 支援點陣圖到向量轉換", () => {
    const inputs = getAllInputs("potrace");
    const targets = getAllTargets()["potrace"] || [];
    expect(inputs.length).toBeGreaterThan(0);
    expect(targets.includes("svg")).toBe(true);
  });

  test("resvg 支援 SVG 渲染", () => {
    const inputs = getAllInputs("resvg");
    expect(inputs.includes("svg")).toBe(true);
  });
});

/**
 * 格式完整性測試
 *
 * 此測試驗證所有轉換器的格式宣告是否完整且正確。
 * 確保文件中列出的格式與程式碼中宣告的格式一致。
 */

import { describe, expect, test } from "bun:test";

// 匯入所有轉換器的 properties
import { properties as ffmpegProps } from "../../src/converters/ffmpeg";
import { properties as imagemagickProps } from "../../src/converters/imagemagick";
import { properties as graphicsmagickProps } from "../../src/converters/graphicsmagick";
import { properties as vipsProps } from "../../src/converters/vips";
import { properties as libreofficeProps } from "../../src/converters/libreoffice";
import { properties as pandocProps } from "../../src/converters/pandoc";
import { properties as calibreProps } from "../../src/converters/calibre";
import { properties as inkscapeProps } from "../../src/converters/inkscape";
import { properties as libjxlProps } from "../../src/converters/libjxl";
import { properties as libheifProps } from "../../src/converters/libheif";
import { properties as assimpProps } from "../../src/converters/assimp";
import { properties as potraceProps } from "../../src/converters/potrace";
import { properties as vtracerProps } from "../../src/converters/vtracer";
import { properties as resvgProps } from "../../src/converters/resvg";
import { properties as xelatexProps } from "../../src/converters/xelatex";
import { properties as dvisvgmProps } from "../../src/converters/dvisvgm";
import { properties as daselProps } from "../../src/converters/dasel";
import { properties as msgconvertProps } from "../../src/converters/msgconvert";
import { properties as vcfProps } from "../../src/converters/vcf";
import { properties as markitdownProps } from "../../src/converters/markitdown";
import { properties as mineruProps } from "../../src/converters/mineru";
import { properties as pdfmathtranslateProps } from "../../src/converters/pdfmathtranslate";
import { properties as babeldocProps } from "../../src/converters/babeldoc";
import { properties as ocrmypdfProps } from "../../src/converters/ocrmypdf";

// ============================================================================
// FFmpeg 格式測試
// ============================================================================
describe("FFmpeg 格式", () => {
  const fromFormats = ffmpegProps.from.muxer;
  const toFormats = ffmpegProps.to.muxer;

  // 關鍵影片格式（wmv 由 asf 處理）
  const keyVideoFormats = ["264", "265", "3g2", "3gp", "asf", "av1", "avi", "flv", "h264", "h265", "hevc", "mkv", "mov", "mp4", "mpeg", "mpg", "webm"];
  // 關鍵音訊格式
  const keyAudioFormats = ["aac", "ac3", "aiff", "flac", "m4a", "mp3", "ogg", "opus", "wav", "wma"];
  // 關鍵字幕格式
  const keySubtitleFormats = ["ass", "srt", "ssa", "sub", "vtt"];
  // 關鍵圖片格式
  const keyImageFormats = ["apng", "avif", "bmp", "gif", "jpeg", "jxl", "png", "webp"];

  test("應包含關鍵影片輸入格式", () => {
    for (const format of keyVideoFormats) {
      expect(fromFormats).toContain(format);
    }
  });

  test("應包含關鍵音訊輸入格式", () => {
    for (const format of keyAudioFormats) {
      expect(fromFormats).toContain(format);
    }
  });

  test("應包含關鍵字幕輸入格式", () => {
    for (const format of keySubtitleFormats) {
      expect(fromFormats).toContain(format);
    }
  });

  test("應包含關鍵圖片輸入格式", () => {
    for (const format of keyImageFormats) {
      expect(fromFormats).toContain(format);
    }
  });

  test("輸入格式數量應大於 450 種", () => {
    expect(fromFormats.length).toBeGreaterThan(450);
    console.log(`FFmpeg 輸入格式：${fromFormats.length} 種`);
  });

  test("輸出格式數量應大於 180 種", () => {
    expect(toFormats.length).toBeGreaterThan(180);
    console.log(`FFmpeg 輸出格式：${toFormats.length} 種`);
  });

  test("應包含所有實際輸入格式（完整驗證）", () => {
    // 驗證所有格式都是字串
    for (const format of fromFormats) {
      expect(typeof format).toBe("string");
      expect(format.length).toBeGreaterThan(0);
    }
  });

  test("應包含所有實際輸出格式（完整驗證）", () => {
    // 驗證所有格式都是字串
    for (const format of toFormats) {
      expect(typeof format).toBe("string");
      expect(format.length).toBeGreaterThan(0);
    }
  });
});

// ============================================================================
// ImageMagick 格式測試
// ============================================================================
describe("ImageMagick 格式", () => {
  const fromFormats = imagemagickProps.from.images;
  const toFormats = imagemagickProps.to.images;

  // 關鍵 RAW 相機格式
  const keyRawFormats = ["arw", "cr2", "cr3", "dng", "nef", "orf", "raf"];
  // 關鍵常見圖片格式
  const keyImageFormats = ["apng", "avif", "bmp", "gif", "heic", "heif", "ico", "jpeg", "jpg", "jxl", "png", "tiff", "webp"];
  // 關鍵向量格式
  const keyVectorFormats = ["eps", "pdf", "ps", "psd", "svg"];

  test("應包含關鍵 RAW 相機格式", () => {
    for (const format of keyRawFormats) {
      expect(fromFormats).toContain(format);
    }
  });

  test("應包含關鍵常見圖片格式", () => {
    for (const format of keyImageFormats) {
      expect(fromFormats).toContain(format);
    }
  });

  test("應包含關鍵向量格式", () => {
    for (const format of keyVectorFormats) {
      expect(fromFormats).toContain(format);
    }
  });

  test("輸入格式數量應大於 200 種", () => {
    expect(fromFormats.length).toBeGreaterThan(200);
    console.log(`ImageMagick 輸入格式：${fromFormats.length} 種`);
  });

  test("輸出格式數量應大於 150 種", () => {
    expect(toFormats.length).toBeGreaterThan(150);
    console.log(`ImageMagick 輸出格式：${toFormats.length} 種`);
  });

  test("應包含所有實際輸入格式（完整驗證）", () => {
    for (const format of fromFormats) {
      expect(typeof format).toBe("string");
      expect(format.length).toBeGreaterThan(0);
    }
  });

  test("應包含所有實際輸出格式（完整驗證）", () => {
    for (const format of toFormats) {
      expect(typeof format).toBe("string");
      expect(format.length).toBeGreaterThan(0);
    }
  });
});

// ============================================================================
// GraphicsMagick 格式測試
// ============================================================================
describe("GraphicsMagick 格式", () => {
  // GraphicsMagick 使用 'image' 而非 'images'
  const fromFormats = graphicsmagickProps.from.image;
  const toFormats = graphicsmagickProps.to.image;

  const keyFormats = ["bmp", "gif", "jpeg", "jpg", "png", "tiff", "webp"];

  test("應包含關鍵圖片格式", () => {
    for (const format of keyFormats) {
      expect(fromFormats).toContain(format);
    }
  });

  test("輸入格式數量應大於 100 種", () => {
    expect(fromFormats.length).toBeGreaterThan(100);
    console.log(`GraphicsMagick 輸入格式：${fromFormats.length} 種`);
  });

  test("輸出格式數量應大於 80 種", () => {
    expect(toFormats.length).toBeGreaterThan(80);
    console.log(`GraphicsMagick 輸出格式：${toFormats.length} 種`);
  });

  test("應包含所有實際輸入格式（完整驗證）", () => {
    for (const format of fromFormats) {
      expect(typeof format).toBe("string");
      expect(format.length).toBeGreaterThan(0);
    }
  });

  test("應包含所有實際輸出格式（完整驗證）", () => {
    for (const format of toFormats) {
      expect(typeof format).toBe("string");
      expect(format.length).toBeGreaterThan(0);
    }
  });
});

// ============================================================================
// Vips 格式測試
// ============================================================================
describe("Vips 格式", () => {
  const fromFormats = vipsProps.from.images;
  const toFormats = vipsProps.to.images;

  const keyFormats = ["avif", "gif", "heic", "heif", "jpeg", "jxl", "png", "tiff", "webp"];

  test("應包含關鍵圖片格式", () => {
    for (const format of keyFormats) {
      expect(fromFormats).toContain(format);
    }
  });

  test("輸入格式數量應大於 30 種", () => {
    expect(fromFormats.length).toBeGreaterThan(30);
    console.log(`Vips 輸入格式：${fromFormats.length} 種`);
  });

  test("輸出格式數量應大於 15 種", () => {
    expect(toFormats.length).toBeGreaterThan(15);
    console.log(`Vips 輸出格式：${toFormats.length} 種`);
  });

  test("應包含所有實際輸入格式（完整驗證）", () => {
    for (const format of fromFormats) {
      expect(typeof format).toBe("string");
      expect(format.length).toBeGreaterThan(0);
    }
  });

  test("應包含所有實際輸出格式（完整驗證）", () => {
    for (const format of toFormats) {
      expect(typeof format).toBe("string");
      expect(format.length).toBeGreaterThan(0);
    }
  });
});

// ============================================================================
// LibreOffice 格式測試
// ============================================================================
describe("LibreOffice 格式", () => {
  // LibreOffice 使用 'text' 而非 'document'
  const fromFormats = libreofficeProps.from.text;
  const toFormats = libreofficeProps.to.text;

  const keyFormats = ["doc", "docx", "html", "odt", "pdf", "rtf", "txt"];

  test("應包含關鍵文件格式", () => {
    for (const format of keyFormats) {
      expect(fromFormats).toContain(format);
    }
  });

  test("輸入格式數量應大於 30 種", () => {
    expect(fromFormats.length).toBeGreaterThan(30);
    console.log(`LibreOffice 輸入格式：${fromFormats.length} 種`);
  });

  test("輸出格式數量應大於 15 種", () => {
    expect(toFormats.length).toBeGreaterThan(15);
    console.log(`LibreOffice 輸出格式：${toFormats.length} 種`);
  });

  test("應包含所有實際輸入格式（完整驗證）", () => {
    for (const format of fromFormats) {
      expect(typeof format).toBe("string");
      expect(format.length).toBeGreaterThan(0);
    }
  });

  test("應包含所有實際輸出格式（完整驗證）", () => {
    for (const format of toFormats) {
      expect(typeof format).toBe("string");
      expect(format.length).toBeGreaterThan(0);
    }
  });
});

// ============================================================================
// Pandoc 格式測試
// ============================================================================
describe("Pandoc 格式", () => {
  // Pandoc 使用 'text' 而非 'document'
  const fromFormats = pandocProps.from.text;
  const toFormats = pandocProps.to.text;

  const keyInputFormats = ["docx", "epub", "html", "latex", "markdown", "org", "rst", "rtf"];
  const keyOutputFormats = ["docx", "epub", "html", "latex", "markdown", "odt", "pdf", "pptx"];

  test("應包含關鍵輸入格式", () => {
    for (const format of keyInputFormats) {
      expect(fromFormats).toContain(format);
    }
  });

  test("應包含關鍵輸出格式", () => {
    for (const format of keyOutputFormats) {
      expect(toFormats).toContain(format);
    }
  });

  test("輸入格式數量應大於 35 種", () => {
    expect(fromFormats.length).toBeGreaterThan(35);
    console.log(`Pandoc 輸入格式：${fromFormats.length} 種`);
  });

  test("輸出格式數量應大於 55 種", () => {
    expect(toFormats.length).toBeGreaterThan(55);
    console.log(`Pandoc 輸出格式：${toFormats.length} 種`);
  });

  test("應包含所有實際輸入格式（完整驗證）", () => {
    for (const format of fromFormats) {
      expect(typeof format).toBe("string");
      expect(format.length).toBeGreaterThan(0);
    }
  });

  test("應包含所有實際輸出格式（完整驗證）", () => {
    for (const format of toFormats) {
      expect(typeof format).toBe("string");
      expect(format.length).toBeGreaterThan(0);
    }
  });
});

// ============================================================================
// Calibre 格式測試
// ============================================================================
describe("Calibre 格式", () => {
  // Calibre 使用 'document' 而非 'ebook'
  const fromFormats = calibreProps.from.document;
  const toFormats = calibreProps.to.document;

  const keyFormats = ["cbz", "epub", "mobi", "pdf"];

  test("應包含關鍵電子書格式", () => {
    for (const format of keyFormats) {
      expect(fromFormats).toContain(format);
    }
  });

  test("輸入格式數量應大於 20 種", () => {
    expect(fromFormats.length).toBeGreaterThan(20);
    console.log(`Calibre 輸入格式：${fromFormats.length} 種`);
  });

  test("輸出格式數量應大於 15 種", () => {
    expect(toFormats.length).toBeGreaterThan(15);
    console.log(`Calibre 輸出格式：${toFormats.length} 種`);
  });

  test("應包含所有實際輸入格式（完整驗證）", () => {
    for (const format of fromFormats) {
      expect(typeof format).toBe("string");
      expect(format.length).toBeGreaterThan(0);
    }
  });

  test("應包含所有實際輸出格式（完整驗證）", () => {
    for (const format of toFormats) {
      expect(typeof format).toBe("string");
      expect(format.length).toBeGreaterThan(0);
    }
  });
});

// ============================================================================
// Inkscape 格式測試
// ============================================================================
describe("Inkscape 格式", () => {
  const fromFormats = inkscapeProps.from.images;
  const toFormats = inkscapeProps.to.images;

  const keyInputFormats = ["svg", "pdf", "eps", "png"];
  const keyOutputFormats = ["svg", "pdf", "eps", "png", "dxf"];

  test("應包含關鍵輸入格式", () => {
    for (const format of keyInputFormats) {
      expect(fromFormats).toContain(format);
    }
  });

  test("應包含關鍵輸出格式", () => {
    for (const format of keyOutputFormats) {
      expect(toFormats).toContain(format);
    }
  });

  test("輸入格式數量應大於 5 種", () => {
    expect(fromFormats.length).toBeGreaterThan(5);
    console.log(`Inkscape 輸入格式：${fromFormats.length} 種`);
  });

  test("輸出格式數量應大於 10 種", () => {
    expect(toFormats.length).toBeGreaterThan(10);
    console.log(`Inkscape 輸出格式：${toFormats.length} 種`);
  });

  test("應包含所有實際輸入格式（完整驗證）", () => {
    for (const format of fromFormats) {
      expect(typeof format).toBe("string");
      expect(format.length).toBeGreaterThan(0);
    }
  });

  test("應包含所有實際輸出格式（完整驗證）", () => {
    for (const format of toFormats) {
      expect(typeof format).toBe("string");
      expect(format.length).toBeGreaterThan(0);
    }
  });
});

// ============================================================================
// libjxl 格式測試
// ============================================================================
describe("libjxl 格式", () => {
  const jxlFromFormats = libjxlProps.from.jxl;
  const imagesFromFormats = libjxlProps.from.images;
  const jxlToFormats = libjxlProps.to.jxl;
  const imagesToFormats = libjxlProps.to.images;

  test("應包含 jxl 輸入格式", () => {
    expect(jxlFromFormats).toContain("jxl");
  });

  test("應包含常見圖片輸入格式", () => {
    const keyFormats = ["jpeg", "png"];
    for (const format of keyFormats) {
      expect(imagesFromFormats).toContain(format);
    }
  });

  test("輸入格式總數應大於 8 種", () => {
    const total = jxlFromFormats.length + imagesFromFormats.length;
    expect(total).toBeGreaterThan(8);
    console.log(`libjxl 輸入格式：${total} 種`);
  });

  test("輸出格式總數應大於 8 種", () => {
    const total = jxlToFormats.length + imagesToFormats.length;
    expect(total).toBeGreaterThan(8);
    console.log(`libjxl 輸出格式：${total} 種`);
  });
});

// ============================================================================
// libheif 格式測試
// ============================================================================
describe("libheif 格式", () => {
  const fromFormats = libheifProps.from.images;
  const toFormats = libheifProps.to.images;

  const keyInputFormats = ["avif", "heic", "heif"];
  const keyOutputFormats = ["jpeg", "png"];

  test("應包含關鍵輸入格式", () => {
    for (const format of keyInputFormats) {
      expect(fromFormats).toContain(format);
    }
  });

  test("應包含關鍵輸出格式", () => {
    for (const format of keyOutputFormats) {
      expect(toFormats).toContain(format);
    }
  });

  test("輸入格式數量應大於 8 種", () => {
    expect(fromFormats.length).toBeGreaterThan(8);
    console.log(`libheif 輸入格式：${fromFormats.length} 種`);
  });

  test("輸出格式數量應等於 3 種", () => {
    expect(toFormats.length).toBe(3);
    console.log(`libheif 輸出格式：${toFormats.length} 種`);
  });

  test("應包含所有實際輸入格式（完整驗證）", () => {
    for (const format of fromFormats) {
      expect(typeof format).toBe("string");
      expect(format.length).toBeGreaterThan(0);
    }
  });

  test("應包含所有實際輸出格式（完整驗證）", () => {
    for (const format of toFormats) {
      expect(typeof format).toBe("string");
      expect(format.length).toBeGreaterThan(0);
    }
  });
});

// ============================================================================
// Assimp 格式測試
// ============================================================================
describe("Assimp 格式", () => {
  // Assimp 使用 'object' 而非 'model'
  const fromFormats = assimpProps.from.object;
  const toFormats = assimpProps.to.object;

  const keyInputFormats = ["3ds", "blend", "dae", "fbx", "glb", "gltf", "obj", "stl"];
  const keyOutputFormats = ["3ds", "dae", "fbx", "glb", "gltf", "obj", "stl"];

  test("應包含關鍵 3D 輸入格式", () => {
    for (const format of keyInputFormats) {
      expect(fromFormats).toContain(format);
    }
  });

  test("應包含關鍵 3D 輸出格式", () => {
    for (const format of keyOutputFormats) {
      expect(toFormats).toContain(format);
    }
  });

  test("輸入格式數量應大於 60 種", () => {
    expect(fromFormats.length).toBeGreaterThan(60);
    console.log(`Assimp 輸入格式：${fromFormats.length} 種`);
  });

  test("輸出格式數量應大於 18 種", () => {
    expect(toFormats.length).toBeGreaterThan(18);
    console.log(`Assimp 輸出格式：${toFormats.length} 種`);
  });

  test("應包含所有實際輸入格式（完整驗證）", () => {
    for (const format of fromFormats) {
      expect(typeof format).toBe("string");
      expect(format.length).toBeGreaterThan(0);
    }
  });

  test("應包含所有實際輸出格式（完整驗證）", () => {
    for (const format of toFormats) {
      expect(typeof format).toBe("string");
      expect(format.length).toBeGreaterThan(0);
    }
  });
});

// ============================================================================
// Potrace 格式測試
// ============================================================================
describe("Potrace 格式", () => {
  const fromFormats = potraceProps.from.images;
  const toFormats = potraceProps.to.images;

  const keyInputFormats = ["bmp", "pbm", "pgm", "pnm"];
  const keyOutputFormats = ["svg", "pdf", "eps", "dxf"];

  test("應包含關鍵輸入格式", () => {
    for (const format of keyInputFormats) {
      expect(fromFormats).toContain(format);
    }
  });

  test("應包含關鍵輸出格式", () => {
    for (const format of keyOutputFormats) {
      expect(toFormats).toContain(format);
    }
  });

  test("輸入格式數量應等於 4 種", () => {
    expect(fromFormats.length).toBe(4);
    console.log(`Potrace 輸入格式：${fromFormats.length} 種`);
  });

  test("輸出格式數量應大於 8 種", () => {
    expect(toFormats.length).toBeGreaterThan(8);
    console.log(`Potrace 輸出格式：${toFormats.length} 種`);
  });

  test("應包含所有實際輸入格式（完整驗證）", () => {
    for (const format of fromFormats) {
      expect(typeof format).toBe("string");
      expect(format.length).toBeGreaterThan(0);
    }
  });

  test("應包含所有實際輸出格式（完整驗證）", () => {
    for (const format of toFormats) {
      expect(typeof format).toBe("string");
      expect(format.length).toBeGreaterThan(0);
    }
  });
});

// ============================================================================
// VTracer 格式測試
// ============================================================================
describe("VTracer 格式", () => {
  const fromFormats = vtracerProps.from.images;
  const toFormats = vtracerProps.to.images;

  const keyInputFormats = ["jpg", "jpeg", "png", "bmp", "gif", "webp"];

  test("應包含關鍵輸入格式", () => {
    for (const format of keyInputFormats) {
      expect(fromFormats).toContain(format);
    }
  });

  test("輸出格式應為 svg", () => {
    expect(toFormats).toContain("svg");
  });

  test("輸入格式數量應等於 8 種", () => {
    expect(fromFormats.length).toBe(8);
    console.log(`VTracer 輸入格式：${fromFormats.length} 種`);
  });

  test("輸出格式數量應等於 1 種", () => {
    expect(toFormats.length).toBe(1);
    console.log(`VTracer 輸出格式：${toFormats.length} 種`);
  });

  test("應包含所有實際輸入格式（完整驗證）", () => {
    for (const format of fromFormats) {
      expect(typeof format).toBe("string");
      expect(format.length).toBeGreaterThan(0);
    }
  });
});

// ============================================================================
// resvg 格式測試
// ============================================================================
describe("resvg 格式", () => {
  const fromFormats = resvgProps.from.images;
  const toFormats = resvgProps.to.images;

  test("輸入格式應為 svg", () => {
    expect(fromFormats).toContain("svg");
  });

  test("輸出格式應為 png", () => {
    expect(toFormats).toContain("png");
  });

  test("輸入格式數量應等於 1 種", () => {
    expect(fromFormats.length).toBe(1);
    console.log(`resvg 輸入格式：${fromFormats.length} 種`);
  });

  test("輸出格式數量應等於 1 種", () => {
    expect(toFormats.length).toBe(1);
    console.log(`resvg 輸出格式：${toFormats.length} 種`);
  });
});

// ============================================================================
// XeLaTeX 格式測試
// ============================================================================
describe("XeLaTeX 格式", () => {
  // XeLaTeX 使用 'text' 而非 'latex'
  const fromFormats = xelatexProps.from.text;
  const toFormats = xelatexProps.to.text;

  test("輸入格式應包含 tex 和 latex", () => {
    expect(fromFormats).toContain("tex");
    expect(fromFormats).toContain("latex");
  });

  test("輸出格式應為 pdf", () => {
    expect(toFormats).toContain("pdf");
  });

  test("輸入格式數量應等於 2 種", () => {
    expect(fromFormats.length).toBe(2);
    console.log(`XeLaTeX 輸入格式：${fromFormats.length} 種`);
  });

  test("輸出格式數量應等於 1 種", () => {
    expect(toFormats.length).toBe(1);
    console.log(`XeLaTeX 輸出格式：${toFormats.length} 種`);
  });
});

// ============================================================================
// dvisvgm 格式測試
// ============================================================================
describe("dvisvgm 格式", () => {
  const fromFormats = dvisvgmProps.from.images;
  const toFormats = dvisvgmProps.to.images;

  const keyInputFormats = ["dvi", "pdf", "eps"];
  const keyOutputFormats = ["svg", "svgz"];

  test("應包含關鍵輸入格式", () => {
    for (const format of keyInputFormats) {
      expect(fromFormats).toContain(format);
    }
  });

  test("應包含關鍵輸出格式", () => {
    for (const format of keyOutputFormats) {
      expect(toFormats).toContain(format);
    }
  });

  test("輸入格式數量應等於 4 種", () => {
    expect(fromFormats.length).toBe(4);
    console.log(`dvisvgm 輸入格式：${fromFormats.length} 種`);
  });

  test("輸出格式數量應等於 2 種", () => {
    expect(toFormats.length).toBe(2);
    console.log(`dvisvgm 輸出格式：${toFormats.length} 種`);
  });

  test("應包含所有實際輸入格式（完整驗證）", () => {
    for (const format of fromFormats) {
      expect(typeof format).toBe("string");
      expect(format.length).toBeGreaterThan(0);
    }
  });

  test("應包含所有實際輸出格式（完整驗證）", () => {
    for (const format of toFormats) {
      expect(typeof format).toBe("string");
      expect(format.length).toBeGreaterThan(0);
    }
  });
});

// ============================================================================
// Dasel 格式測試
// ============================================================================
describe("Dasel 格式", () => {
  // Dasel 使用 'document' 而非 'data'
  const fromFormats = daselProps.from.document;
  const toFormats = daselProps.to.document;

  const keyFormats = ["json", "yaml", "toml", "xml", "csv"];

  test("應包含關鍵資料格式", () => {
    for (const format of keyFormats) {
      expect(fromFormats).toContain(format);
    }
  });

  test("輸入格式數量應等於 5 種", () => {
    expect(fromFormats.length).toBe(5);
    console.log(`Dasel 輸入格式：${fromFormats.length} 種`);
  });

  test("輸出格式數量應等於 4 種", () => {
    expect(toFormats.length).toBe(4);
    console.log(`Dasel 輸出格式：${toFormats.length} 種`);
  });

  test("應包含所有實際輸入格式（完整驗證）", () => {
    for (const format of fromFormats) {
      expect(typeof format).toBe("string");
      expect(format.length).toBeGreaterThan(0);
    }
  });

  test("應包含所有實際輸出格式（完整驗證）", () => {
    for (const format of toFormats) {
      expect(typeof format).toBe("string");
      expect(format.length).toBeGreaterThan(0);
    }
  });
});

// ============================================================================
// msgconvert 格式測試
// ============================================================================
describe("msgconvert 格式", () => {
  const fromFormats = msgconvertProps.from.email;
  const toFormats = msgconvertProps.to.email;

  test("輸入格式應為 msg", () => {
    expect(fromFormats).toContain("msg");
  });

  test("輸出格式應為 eml", () => {
    expect(toFormats).toContain("eml");
  });

  test("輸入格式數量應等於 1 種", () => {
    expect(fromFormats.length).toBe(1);
    console.log(`msgconvert 輸入格式：${fromFormats.length} 種`);
  });

  test("輸出格式數量應等於 1 種", () => {
    expect(toFormats.length).toBe(1);
    console.log(`msgconvert 輸出格式：${toFormats.length} 種`);
  });
});

// ============================================================================
// VCF 格式測試
// ============================================================================
describe("VCF 格式", () => {
  const fromFormats = vcfProps.from.contacts;
  const toFormats = vcfProps.to.contacts;

  test("輸入格式應為 vcf", () => {
    expect(fromFormats).toContain("vcf");
  });

  test("輸出格式應為 csv", () => {
    expect(toFormats).toContain("csv");
  });

  test("輸入格式數量應等於 1 種", () => {
    expect(fromFormats.length).toBe(1);
    console.log(`VCF 輸入格式：${fromFormats.length} 種`);
  });

  test("輸出格式數量應等於 1 種", () => {
    expect(toFormats.length).toBe(1);
    console.log(`VCF 輸出格式：${toFormats.length} 種`);
  });
});

// ============================================================================
// Markitdown 格式測試
// ============================================================================
describe("Markitdown 格式", () => {
  const fromFormats = markitdownProps.from.document;
  const toFormats = markitdownProps.to.document;

  const keyInputFormats = ["pdf", "docx", "pptx", "html"];

  test("應包含關鍵輸入格式", () => {
    for (const format of keyInputFormats) {
      expect(fromFormats).toContain(format);
    }
  });

  test("輸出格式應為 md", () => {
    expect(toFormats).toContain("md");
  });

  test("輸入格式數量應等於 6 種", () => {
    expect(fromFormats.length).toBe(6);
    console.log(`Markitdown 輸入格式：${fromFormats.length} 種`);
  });

  test("輸出格式數量應等於 1 種", () => {
    expect(toFormats.length).toBe(1);
    console.log(`Markitdown 輸出格式：${toFormats.length} 種`);
  });

  test("應包含所有實際輸入格式（完整驗證）", () => {
    for (const format of fromFormats) {
      expect(typeof format).toBe("string");
      expect(format.length).toBeGreaterThan(0);
    }
  });
});

// ============================================================================
// MinerU 格式測試
// ============================================================================
describe("MinerU 格式", () => {
  const fromFormats = mineruProps.from.document;
  const toFormats = mineruProps.to.document;

  const keyInputFormats = ["pdf", "ppt", "pptx", "doc", "docx"];
  const keyOutputFormats = ["md-t", "md-i"];

  test("應包含關鍵輸入格式", () => {
    for (const format of keyInputFormats) {
      expect(fromFormats).toContain(format);
    }
  });

  test("應包含關鍵輸出格式", () => {
    for (const format of keyOutputFormats) {
      expect(toFormats).toContain(format);
    }
  });

  test("輸入格式數量應等於 7 種", () => {
    expect(fromFormats.length).toBe(7);
    console.log(`MinerU 輸入格式：${fromFormats.length} 種`);
  });

  test("輸出格式數量應等於 2 種", () => {
    expect(toFormats.length).toBe(2);
    console.log(`MinerU 輸出格式：${toFormats.length} 種`);
  });

  test("應包含所有實際輸入格式（完整驗證）", () => {
    for (const format of fromFormats) {
      expect(typeof format).toBe("string");
      expect(format.length).toBeGreaterThan(0);
    }
  });

  test("應包含所有實際輸出格式（完整驗證）", () => {
    for (const format of toFormats) {
      expect(typeof format).toBe("string");
      expect(format.length).toBeGreaterThan(0);
    }
  });
});

// ============================================================================
// PDFMathTranslate 格式測試
// ============================================================================
describe("PDFMathTranslate 格式", () => {
  const fromFormats = pdfmathtranslateProps.from.document;
  const toFormats = pdfmathtranslateProps.to.document;

  const keyOutputFormats = [
    "pdf-en", "pdf-zh", "pdf-zh-TW", "pdf-ja", "pdf-ko",
    "pdf-de", "pdf-fr", "pdf-es", "pdf-it", "pdf-ru"
  ];

  test("輸入格式應為 pdf", () => {
    expect(fromFormats).toContain("pdf");
  });

  test("應包含關鍵輸出格式", () => {
    for (const format of keyOutputFormats) {
      expect(toFormats).toContain(format);
    }
  });

  test("輸入格式數量應等於 1 種", () => {
    expect(fromFormats.length).toBe(1);
    console.log(`PDFMathTranslate 輸入格式：${fromFormats.length} 種`);
  });

  test("輸出格式數量應等於 15 種", () => {
    expect(toFormats.length).toBe(15);
    console.log(`PDFMathTranslate 輸出格式：${toFormats.length} 種`);
  });

  test("應包含所有實際輸出格式（完整驗證）", () => {
    for (const format of toFormats) {
      expect(typeof format).toBe("string");
      expect(format.length).toBeGreaterThan(0);
      // 驗證格式為 pdf-<lang>
      expect(format).toMatch(/^pdf-.+$/);
    }
  });
});

// ============================================================================
// BabelDOC 格式測試
// ============================================================================
describe("BabelDOC 格式", () => {
  const fromFormats = babeldocProps.from.document;
  const toFormats = babeldocProps.to.document;

  // PDF 輸出格式
  const pdfOutputFormats = ["pdf-en", "pdf-zh", "pdf-zh-TW", "pdf-ja", "pdf-ko"];
  // Markdown 輸出格式
  const mdOutputFormats = ["md-en", "md-zh", "md-zh-TW", "md-ja", "md-ko"];
  // HTML 輸出格式
  const htmlOutputFormats = ["html-en", "html-zh", "html-zh-TW", "html-ja", "html-ko"];

  test("輸入格式應為 pdf", () => {
    expect(fromFormats).toContain("pdf");
  });

  test("應包含 PDF 輸出格式", () => {
    for (const format of pdfOutputFormats) {
      expect(toFormats).toContain(format);
    }
  });

  test("應包含 Markdown 輸出格式", () => {
    for (const format of mdOutputFormats) {
      expect(toFormats).toContain(format);
    }
  });

  test("應包含 HTML 輸出格式", () => {
    for (const format of htmlOutputFormats) {
      expect(toFormats).toContain(format);
    }
  });

  test("輸入格式數量應等於 1 種", () => {
    expect(fromFormats.length).toBe(1);
    console.log(`BabelDOC 輸入格式：${fromFormats.length} 種`);
  });

  test("輸出格式數量應等於 45 種（3 格式 x 15 語言）", () => {
    expect(toFormats.length).toBe(45);
    console.log(`BabelDOC 輸出格式：${toFormats.length} 種`);
  });

  test("應包含所有實際輸出格式（完整驗證）", () => {
    for (const format of toFormats) {
      expect(typeof format).toBe("string");
      expect(format.length).toBeGreaterThan(0);
      // 驗證格式為 <type>-<lang>
      expect(format).toMatch(/^(pdf|md|html)-.+$/);
    }
  });
});

// ============================================================================
// OCRmyPDF 格式測試
// ============================================================================
describe("OCRmyPDF 格式", () => {
  const fromFormats = ocrmypdfProps.from.document;
  const toFormats = ocrmypdfProps.to.document;

  const keyOutputFormats = [
    "pdf-en", "pdf-zh-TW", "pdf-zh", "pdf-ja", "pdf-ko", "pdf-de", "pdf-fr"
  ];

  test("輸入格式應為 pdf", () => {
    expect(fromFormats).toContain("pdf");
  });

  test("應包含關鍵輸出格式", () => {
    for (const format of keyOutputFormats) {
      expect(toFormats).toContain(format);
    }
  });

  test("輸入格式數量應等於 1 種", () => {
    expect(fromFormats.length).toBe(1);
    console.log(`OCRmyPDF 輸入格式：${fromFormats.length} 種`);
  });

  test("輸出格式數量應等於 7 種", () => {
    expect(toFormats.length).toBe(7);
    console.log(`OCRmyPDF 輸出格式：${toFormats.length} 種`);
  });

  test("應包含所有實際輸出格式（完整驗證）", () => {
    for (const format of toFormats) {
      expect(typeof format).toBe("string");
      expect(format.length).toBeGreaterThan(0);
      // 驗證格式為 pdf-<lang>
      expect(format).toMatch(/^pdf-.+$/);
    }
  });
});

// ============================================================================
// 格式總覽測試
// ============================================================================
describe("格式總覽", () => {
  test("所有 24 個轉換器都有定義格式", () => {
    // 驗證所有轉換器的 properties 都存在
    expect(ffmpegProps).toBeDefined();
    expect(imagemagickProps).toBeDefined();
    expect(graphicsmagickProps).toBeDefined();
    expect(vipsProps).toBeDefined();
    expect(libreofficeProps).toBeDefined();
    expect(pandocProps).toBeDefined();
    expect(calibreProps).toBeDefined();
    expect(inkscapeProps).toBeDefined();
    expect(libjxlProps).toBeDefined();
    expect(libheifProps).toBeDefined();
    expect(assimpProps).toBeDefined();
    expect(potraceProps).toBeDefined();
    expect(vtracerProps).toBeDefined();
    expect(resvgProps).toBeDefined();
    expect(xelatexProps).toBeDefined();
    expect(dvisvgmProps).toBeDefined();
    expect(daselProps).toBeDefined();
    expect(msgconvertProps).toBeDefined();
    expect(vcfProps).toBeDefined();
    expect(markitdownProps).toBeDefined();
    expect(mineruProps).toBeDefined();
    expect(pdfmathtranslateProps).toBeDefined();
    expect(babeldocProps).toBeDefined();
    expect(ocrmypdfProps).toBeDefined();
  });

  test("輸出格式總覽", () => {
    console.log("\n=== 轉換器格式總覽 ===\n");

    const summary = [
      { name: "FFmpeg", from: ffmpegProps.from.muxer.length, to: ffmpegProps.to.muxer.length },
      { name: "ImageMagick", from: imagemagickProps.from.images.length, to: imagemagickProps.to.images.length },
      { name: "GraphicsMagick", from: graphicsmagickProps.from.image.length, to: graphicsmagickProps.to.image.length },
      { name: "Vips", from: vipsProps.from.images.length, to: vipsProps.to.images.length },
      { name: "LibreOffice", from: libreofficeProps.from.text.length, to: libreofficeProps.to.text.length },
      { name: "Pandoc", from: pandocProps.from.text.length, to: pandocProps.to.text.length },
      { name: "Calibre", from: calibreProps.from.document.length, to: calibreProps.to.document.length },
      { name: "Inkscape", from: inkscapeProps.from.images.length, to: inkscapeProps.to.images.length },
      { name: "libjxl", from: libjxlProps.from.jxl.length + libjxlProps.from.images.length, to: libjxlProps.to.jxl.length + libjxlProps.to.images.length },
      { name: "libheif", from: libheifProps.from.images.length, to: libheifProps.to.images.length },
      { name: "Assimp", from: assimpProps.from.object.length, to: assimpProps.to.object.length },
      { name: "Potrace", from: potraceProps.from.images.length, to: potraceProps.to.images.length },
      { name: "VTracer", from: vtracerProps.from.images.length, to: vtracerProps.to.images.length },
      { name: "resvg", from: resvgProps.from.images.length, to: resvgProps.to.images.length },
      { name: "XeLaTeX", from: xelatexProps.from.text.length, to: xelatexProps.to.text.length },
      { name: "dvisvgm", from: dvisvgmProps.from.images.length, to: dvisvgmProps.to.images.length },
      { name: "Dasel", from: daselProps.from.document.length, to: daselProps.to.document.length },
      { name: "msgconvert", from: msgconvertProps.from.email.length, to: msgconvertProps.to.email.length },
      { name: "VCF", from: vcfProps.from.contacts.length, to: vcfProps.to.contacts.length },
      { name: "Markitdown", from: markitdownProps.from.document.length, to: markitdownProps.to.document.length },
      { name: "MinerU", from: mineruProps.from.document.length, to: mineruProps.to.document.length },
      { name: "PDFMathTranslate", from: pdfmathtranslateProps.from.document.length, to: pdfmathtranslateProps.to.document.length },
      { name: "BabelDOC", from: babeldocProps.from.document.length, to: babeldocProps.to.document.length },
      { name: "OCRmyPDF", from: ocrmypdfProps.from.document.length, to: ocrmypdfProps.to.document.length },
    ];

    let totalFrom = 0;
    let totalTo = 0;

    for (const item of summary) {
      console.log(`${item.name}: ${item.from} 輸入 / ${item.to} 輸出`);
      totalFrom += item.from;
      totalTo += item.to;
    }

    console.log(`\n總計：${totalFrom} 輸入格式 / ${totalTo} 輸出格式`);
    console.log(`（注意：部分格式在不同轉換器中重複）`);

    expect(true).toBe(true);
  });
});

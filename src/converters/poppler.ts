const { Poppler } = require("node-poppler");
const poppler = new Poppler();

export const properties = {
  from: {
    text: ["pdf"],
  },
  to: {
    text: [
      "jpeg",
      "png",
      "tiff",
      "eps",
      "icc",
      "pdf",
      "svg",
      "ps",
      "html",
      "text",
    ],
  },
};

export function convert(
  filePath: string,
  fileType: string,
  convertTo: string,
  targetPath: string,
  // biome-ignore lint/suspicious/noExplicitAny: <explanation>
  options?: any,
): Promise<string> {
  return new Promise((resolve, reject) => {
    const cairoFiles = [
      "jpeg",
      "png",
      "tiff",
      "eps",
      "icc",
      "pdf",
      "svg",
      "ps",
    ];

    if (cairoFiles.includes(convertTo)) {
      const popplerOptions: {
        jpegFile?: boolean;
        pngFile?: boolean;
        tiffFile?: boolean;
        epsFile?: boolean;
        iccFile?: boolean;
        pdfFile?: boolean;
        svgFile?: boolean;
        psFile?: boolean;
      } = {};

      switch (convertTo) {
        case "jpeg":
          popplerOptions.jpegFile = true;
          break;
        case "png":
          popplerOptions.pngFile = true;
          break;
        case "tiff":
          popplerOptions.tiffFile = true;
          break;
        case "eps":
          popplerOptions.epsFile = true;
          break;
        case "icc":
          popplerOptions.iccFile = true;
          break;
        case "pdf":
          popplerOptions.pdfFile = true;
          break;
        case "svg":
          popplerOptions.svgFile = true;
          break;
        case "ps":
          popplerOptions.psFile = true;
          break;
        default:
          reject(`Invalid convertTo option: ${convertTo}`);
      }

      poppler
        .pdfToCairo(filePath, targetPath, popplerOptions)
        .then(() => {
          resolve("success");
        })
        .catch((err: Error) => {
          reject(err);
        });
    } else if (convertTo === "html") {
      poppler
        .pdfToHtml(filePath, targetPath)
        .then(() => {
          resolve("success");
        })
        .catch((err: Error) => {
          reject(err);
        });
    } else if (convertTo === "text") {
      poppler
        .pdfToText(filePath, targetPath)
        .then(() => {
          resolve("success");
        })
        .catch((err: Error) => {
          reject(err);
        });
    } else {
      reject(`Invalid convertTo option: ${convertTo}`);
    }
  });
}

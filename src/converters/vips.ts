import { execFile as execFileOriginal } from "node:child_process";
import { ExecFileFn } from "./types.ts";

// declare possible conversions
export const properties = {
  from: {
    images: [
      "avif",
      "bif",
      "csv",
      "exr",
      "fits",
      "gif",
      "hdr.gz",
      "hdr",
      "heic",
      "heif",
      "img.gz",
      "img",
      "j2c",
      "j2k",
      "jp2",
      "jpeg",
      "jpx",
      "jxl",
      "mat",
      "mrxs",
      "ndpi",
      "nia.gz",
      "nia",
      "nii.gz",
      "nii",
      "pdf",
      "pfm",
      "pgm",
      "pic",
      "png",
      "ppm",
      "raw",
      "scn",
      "svg",
      "svs",
      "svslide",
      "szi",
      "tif",
      "tiff",
      "v",
      "vips",
      "vms",
      "vmu",
      "webp",
      "zip",
    ],
  },
  to: {
    images: [
      "avif",
      "dzi",
      "fits",
      "gif",
      "hdr.gz",
      "heic",
      "heif",
      "img.gz",
      "j2c",
      "j2k",
      "jp2",
      "jpeg",
      "jpx",
      "jxl",
      "mat",
      "nia.gz",
      "nia",
      "nii.gz",
      "nii",
      "png",
      "tiff",
      "vips",
      "webp",
    ],
  },
  options: {
    svg: {
      scale: {
        description: "Scale the image up or down",
        type: "number",
        default: 1,
      },
    },
  },
};

export function convert(
  filePath: string,
  fileType: string,
  convertTo: string,
  targetPath: string,
  options?: unknown,
  execFile: ExecFileFn = execFileOriginal,
): Promise<string> {
  // if (fileType === "svg") {
  //   const scale = options.scale || 1;
  //   const metadata = await sharp(filePath).metadata();

  //   if (!metadata || !metadata.width || !metadata.height) {
  //     throw new Error("Could not get metadata from image");
  //   }

  //   const newWidth = Math.round(metadata.width * scale);
  //   const newHeight = Math.round(metadata.height * scale);

  //   return await sharp(filePath)
  //     .resize(newWidth, newHeight)
  //     .toFormat(convertTo)
  //     .toFile(targetPath);
  // }
  let action = "copy";
  if (fileType === "pdf") {
    action = "pdfload";
  }

  return new Promise((resolve, reject) => {
    execFile("vips", [action, filePath, targetPath], (error, stdout, stderr) => {
      if (error) {
        reject(`error: ${error}`);
      }

      if (stdout) {
        console.log(`stdout: ${stdout}`);
      }

      if (stderr) {
        console.error(`stderr: ${stderr}`);
      }

      resolve("Done");
    });
  });
}

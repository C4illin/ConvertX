import sharp from "sharp";
import type { FormatEnum } from "sharp";

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

export async function convert(
  filePath: string,
  fileType: string,
  convertTo: keyof FormatEnum,
  targetPath: string,
  // biome-ignore lint/suspicious/noExplicitAny: <explanation>
  options?: any,
) {
  if (fileType === "svg") {
    const scale = options.scale || 1;
    const metadata = await sharp(filePath).metadata();

    if (!metadata || !metadata.width || !metadata.height) {
      throw new Error("Could not get metadata from image");
    }

    const newWidth = Math.round(metadata.width * scale);
    const newHeight = Math.round(metadata.height * scale);

    return await sharp(filePath)
      .resize(newWidth, newHeight)
      .toFormat(convertTo)
      .toFile(targetPath);
  }

  return await sharp(filePath).toFormat(convertTo).toFile(targetPath);
}

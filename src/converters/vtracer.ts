import { execFile as execFileOriginal } from "node:child_process";
import { ExecFileFn } from "./types";

export const properties = {
  from: {
    images: ["jpg", "jpeg", "png", "bmp", "gif", "tiff", "tif", "webp"],
  },
  to: {
    images: ["svg"],
  },
};

export function convert(
  filePath: string,
  fileType: string,
  convertTo: string,
  targetPath: string,
  options?: unknown,
  execFile: ExecFileFn = execFileOriginal, // to make it mockable
): Promise<string> {
  return new Promise((resolve, reject) => {
    // Build vtracer arguments
    const args = ["--input", filePath, "--output", targetPath];

    // Add option parameter if provided
    if (options && typeof options === "object") {
      const opts = options as Record<string, any>;

      if (opts.colormode) {
        args.push("--colormode", opts.colormode);
      }

      if (opts.hierarchical) {
        args.push("--hierarchical", opts.hierarchical);
      }

      if (opts.mode) {
        args.push("--mode", opts.mode);
      }

      if (opts.filter_speckle) {
        args.push("--filter_speckle", opts.filter_speckle);
      }

      if (opts.color_precision) {
        args.push("--color_precision", opts.color_precision);
      }

      if (opts.layer_difference) {
        args.push("--layer_difference", opts.layer_difference);
      }

      if (opts.corner_threshold) {
        args.push("--corner_threshold", opts.corner_threshold);
      }

      if (opts.length_threshold) {
        args.push("--length_threshold", opts.length_threshold);
      }

      if (opts.max_iterations) {
        args.push("--max_iterations", opts.max_iterations);
      }

      if (opts.splice_threshold) {
        args.push("--splice_threshold", opts.splice_threshold);
      }

      if (opts.path_precision) {
        args.push("--path_precision", opts.path_precision);
      }

      execFile("vtracer", args, (error, stdout, stderr) => {
        if (error) {
          reject(`error: ${error}${stderr ? `\nstderr: ${stderr}` : ''}`);
          return;
        }

        if (stdout) {
          console.log(`stdout: ${stdout}`);
        }

        if (stderr) {
          console.log(`stderr: ${stderr}`);
        }

        resolve("Done");
      });
    }
  });
}

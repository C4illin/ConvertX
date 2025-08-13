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

    // Add optional parameter if provided
    if (options && typeof options === "object") {
      const opts = options as Record<string, any>;

      const validOptions = [
        "colormode", "hierarchical", "mode", "filter_speckle",
        "color_precision", "layer_difference", "corner_threshold",
        "length_threshold", "max_iterations", "splice_threshold",
        "path_precision",
      ];

      for (const option of validOptions) {
          if(opts[option]){
            args.push(`--${option}`, opts[option]);
          }
      }
    }

    execFile("vtracer", args, (error, stdout, stderr) => {
      if(error){
        reject(`error: ${error}${stderr ? `\nstderr: ${stderr}` : ''}`)
        return;
      }

      if(stdout){
        console.log(`stdout: ${stdout}`)
      }

      if(stderr){
        console.log(`stderr: ${stderr}`)
      }

      resolve("Done");
    });
  });
}

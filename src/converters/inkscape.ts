import { exec } from "node:child_process";

export const properties = {
    from: {
      images: [
        "svg",
        "pdf",
        "eps",
        "ps",
        "wmf",
        "emf",
        "png"
      ]
    },
    to: {
      images: [
        "dxf",
        "emf",
        "eps",
        "fxg",
        "gpl",
        "hpgl",
        "html",
        "odg",
        "pdf",
        "png",
        "pov",
        "ps",
        "sif",
        "svg",
        "svgz",
        "tex",
        "wmf",
      ]
    },
  };

  export function convert(
    filePath: string,
    fileType: string,
    convertTo: string,
    targetPath: string,
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    options?: unknown,
  ): Promise<string> {
    return new Promise((resolve, reject) => {
      exec(`inkscape "${filePath}" -o "${targetPath}"`, (error, stdout, stderr) => {
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
  
import { execFile } from "node:child_process";

export const properties = {
  from: {
    text: ["docx", "txt"],
  },
  to: {
    text: [
      "doc",
      "dot",
      "fodt",
      "htm",
      "html",
      "odt",
      "pdf",
      "rtf",
      "sxw", //bugged
      "txt",
      "wps",
      "wpt",
      "xhtml",
      "xml",
    ],
  },
};

const filterNames: Record<string, string> = {
  //default
  doc: "doc",
  dot: "dot",
  fodt: "fodt",
  htm: "htm",
  html: "html",
  odt: "odt",
  rtf: "rtf",
  sxw: "sxw",
  pdf: "pdf",
  txt: "txt",
  wps: "wps",
  wpt: "wpt",
  xhtml: "xhtml",
  xml: "xml",
};

export function convert(
  filePath: string,
  fileType: string,
  convertTo: string,
  targetPath: string,
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  options?: unknown,
): Promise<string> {
  const outputPath = targetPath.split("/").slice(0, -1).join("/").replace("./", "");
  const filterName = filterNames[convertTo];

  if (!filterName) {
    console.error("Unable to resolve file extension to filtername");
    return Promise.reject("Something went wrong");
  }

  // Build arguments array
  const args: string[] = [];

  args.push("--headless");
  args.push("--convert-to", filterName, filePath);
  args.push("--outdir", outputPath);

  return new Promise((resolve, reject) => {
    execFile("soffice", args, (error, stdout, stderr) => {
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

import { randomUUID } from "node:crypto";
import { mkdir, readdir, rename, rm, unlink } from "node:fs/promises";
import { Cookie } from "elysia";
import db from "../db/db";
import { MAX_CONVERT_PROCESS } from "../helpers/env";
import { normalizeFiletype, normalizeOutputFiletype } from "../helpers/normalizeFiletype";
import { convert as convertassimp, properties as propertiesassimp } from "./assimp";
import { convert as convertCalibre, properties as propertiesCalibre } from "./calibre";
import { convert as convertDasel, properties as propertiesDasel } from "./dasel";
import { convert as convertDvisvgm, properties as propertiesDvisvgm } from "./dvisvgm";
import { convert as convertFFmpeg, properties as propertiesFFmpeg } from "./ffmpeg";
import {
  convert as convertGraphicsmagick,
  properties as propertiesGraphicsmagick,
} from "./graphicsmagick";
import { convert as convertImagemagick, properties as propertiesImagemagick } from "./imagemagick";
import { convert as convertInkscape, properties as propertiesInkscape } from "./inkscape";
import { convert as convertLibheif, properties as propertiesLibheif } from "./libheif";
import { convert as convertLibjxl, properties as propertiesLibjxl } from "./libjxl";
import { convert as convertLibreOffice, properties as propertiesLibreOffice } from "./libreoffice";
import { convert as convertMsgconvert, properties as propertiesMsgconvert } from "./msgconvert";
import { convert as convertPandoc, properties as propertiesPandoc } from "./pandoc";
import { convert as convertPdftops, properties as propertiesPdftops } from "./pdftops";
import { convert as convertPotrace, properties as propertiesPotrace } from "./potrace";
import { convert as convertresvg, properties as propertiesresvg } from "./resvg";
import { convert as convertImage, properties as propertiesImage } from "./vips";
import { convert as convertVtracer, properties as propertiesVtracer } from "./vtracer";
import { convert as convertVcf, properties as propertiesVcf } from "./vcf";
import { convert as convertxelatex, properties as propertiesxelatex } from "./xelatex";
import { convert as convertMarkitdown, properties as propertiesMarkitdown } from "./markitdown";

// This should probably be reconstructed so that the functions are not imported instead the functions hook into this to make the converters more modular

const properties: Record<
  string,
  {
    properties: {
      from: Record<string, string[]>;
      to: Record<string, string[]>;
      options?: Record<
        string,
        Record<
          string,
          {
            description: string;
            type: string;
            default: number;
          }
        >
      >;
    };
    converter: (
      filePath: string,
      fileType: string,
      convertTo: string,
      targetPath: string,

      options?: unknown,
    ) => unknown;
  }
> = {
  // Prioritize Inkscape for EMF files as it handles them better than ImageMagick
  inkscape: {
    properties: propertiesInkscape,
    converter: convertInkscape,
  },
  libjxl: {
    properties: propertiesLibjxl,
    converter: convertLibjxl,
  },
  resvg: {
    properties: propertiesresvg,
    converter: convertresvg,
  },
  vips: {
    properties: propertiesImage,
    converter: convertImage,
  },
  libheif: {
    properties: propertiesLibheif,
    converter: convertLibheif,
  },
  xelatex: {
    properties: propertiesxelatex,
    converter: convertxelatex,
  },
  calibre: {
    properties: propertiesCalibre,
    converter: convertCalibre,
  },
  dasel: {
    properties: propertiesDasel,
    converter: convertDasel,
  },
  libreoffice: {
    properties: propertiesLibreOffice,
    converter: convertLibreOffice,
  },
  pandoc: {
    properties: propertiesPandoc,
    converter: convertPandoc,
  },
  msgconvert: {
    properties: propertiesMsgconvert,
    converter: convertMsgconvert,
  },
  dvisvgm: {
    properties: propertiesDvisvgm,
    converter: convertDvisvgm,
  },
  imagemagick: {
    properties: propertiesImagemagick,
    converter: convertImagemagick,
  },
  graphicsmagick: {
    properties: propertiesGraphicsmagick,
    converter: convertGraphicsmagick,
  },
  assimp: {
    properties: propertiesassimp,
    converter: convertassimp,
  },
  ffmpeg: {
    properties: propertiesFFmpeg,
    converter: convertFFmpeg,
  },
  potrace: {
    properties: propertiesPotrace,
    converter: convertPotrace,
  },
  vtracer: {
    properties: propertiesVtracer,
    converter: convertVtracer,
  },
  vcf: {
    properties: propertiesVcf,
    converter: convertVcf,
  },
  markitDown: {
    properties: propertiesMarkitdown,
    converter: convertMarkitdown,
  },
  pdftops: {
    properties: propertiesPdftops,
    converter: convertPdftops,
  },
};

function chunks<T>(arr: T[], size: number): T[][] {
  if (size <= 0) {
    return [arr];
  }
  return Array.from({ length: Math.ceil(arr.length / size) }, (_: T, i: number) =>
    arr.slice(i * size, i * size + size),
  );
}

/**
 * Not every converter writes the single file it was asked for: ImageMagick
 * turns a multi-page PDF into one numbered file per page (`name-0.jpg`,
 * `name-1.jpg`, ...). Work out which of the files a conversion produced should
 * be offered for download.
 */
function pickOutputNames(produced: string[], expectedName: string): string[] {
  if (produced.includes(expectedName)) {
    return [expectedName];
  }

  const extIndex = expectedName.lastIndexOf(".");
  const base = extIndex === -1 ? expectedName : expectedName.slice(0, extIndex);
  const ext = extIndex === -1 ? "" : expectedName.slice(extIndex);

  const numbered = produced
    .map((name) => {
      if (!name.startsWith(`${base}-`) || !name.endsWith(ext)) {
        return null;
      }
      const suffix = name.slice(base.length + 1, name.length - ext.length);
      return /^\d+$/.test(suffix) ? { name, index: Number(suffix) } : null;
    })
    .filter((match) => match !== null)
    .sort((a, b) => a.index - b.index)
    .map((match) => match.name);

  // Nothing recognisable was written, which is what a failed conversion looks
  // like. Keep the expected name so those rows read as they always have.
  return numbered.length > 0 ? numbered : [expectedName];
}

/**
 * Uploads and output may sit on different filesystems, where rename fails with
 * EXDEV, so fall back to a copy when it does.
 */
async function moveInto(sourceDir: string, targetDir: string, name: string, destination: string) {
  try {
    await rename(`${sourceDir}${name}`, `${targetDir}${destination}`);
  } catch (error) {
    if ((error as NodeJS.ErrnoException)?.code !== "EXDEV") {
      throw error;
    }

    await Bun.write(`${targetDir}${destination}`, Bun.file(`${sourceDir}${name}`));
    await unlink(`${sourceDir}${name}`);
  }
}

/**
 * Two inputs of one job can produce the same output name: `report.pdf` split
 * into pages and `report-1.pdf` both write `report-1.jpg`. Moving the second
 * over the first would lose a page and leave a result row pointing at another
 * conversion's content, so hand the later arrival a name of its own.
 */
function claimDestination(claimed: Set<string>, name: string): string {
  if (!claimed.has(name)) {
    claimed.add(name);
    return name;
  }

  const extIndex = name.lastIndexOf(".");
  const base = extIndex === -1 ? name : name.slice(0, extIndex);
  const ext = extIndex === -1 ? "" : name.slice(extIndex);

  let suffix = 2;
  let candidate = `${base} (${suffix})${ext}`;
  while (claimed.has(candidate)) {
    suffix += 1;
    candidate = `${base} (${suffix})${ext}`;
  }

  claimed.add(candidate);
  return candidate;
}

export async function handleConvert(
  fileNames: string[],
  userUploadsDir: string,
  userOutputDir: string,
  convertTo: string,
  converterName: string,
  jobId: Cookie<string | undefined>,
) {
  const query = db.query(
    "INSERT INTO file_names (job_id, file_name, output_file_name, status) VALUES (?1, ?2, ?3, ?4)",
  );

  const newFileExt = normalizeOutputFiletype(convertTo);
  // Should two conversions of the same job ever overlap, this keeps them from
  // sharing a scratch directory.
  const runId = randomUUID().slice(0, 8);
  const conversions = fileNames.map((fileName, index) => {
    const fileTypeOrig = fileName.includes(".") ? (fileName.split(".").pop() ?? "") : "";
    const newFileName =
      fileTypeOrig === ""
        ? `${fileName}.${newFileExt}`
        : fileName.replace(new RegExp(`${fileTypeOrig}(?!.*${fileTypeOrig})`), newFileExt);

    return {
      fileName,
      filePath: `${userUploadsDir}${fileName}`,
      fileType: normalizeFiletype(fileTypeOrig),
      newFileName,
      // Each conversion writes into a directory of its own, so whatever lands
      // there was produced by that conversion and by nothing else. Two inputs
      // whose names overlap (`report.pdf` and `report-1.pdf`) can no longer be
      // confused for one another. It lives under the uploads directory, which
      // is neither served nor archived.
      scratchDir: `${userUploadsDir}.output-${runId}-${index}/`,
    };
  });

  // Output names handed out so far, so the conversions started here never
  // overwrite one another. A job converted a second time still overwrites its
  // earlier output, exactly as it did before.
  const claimed = new Set<string>();

  for (const chunk of chunks(conversions, MAX_CONVERT_PROCESS)) {
    const toProcess = chunk.map(
      async ({ fileName, filePath, fileType, newFileName, scratchDir }) => {
        await mkdir(scratchDir, { recursive: true });

        try {
          const status = await mainConverter(
            filePath,
            fileType,
            convertTo,
            `${scratchDir}${newFileName}`,
            {},
            converterName,
          );

          // Directories are skipped: a converter leaving a working directory
          // behind is not an output file.
          let produced: string[] = [];
          try {
            produced = (await readdir(scratchDir, { withFileTypes: true }))
              .filter((entry) => entry.isFile())
              .map((entry) => entry.name);
          } catch {
            produced = [];
          }

          // Claimed in one go, before any await, so parallel conversions in the
          // same chunk cannot be handed the same destination.
          const destinations = new Map(
            produced.map((name) => [name, claimDestination(claimed, name)] as const),
          );

          const outputNames = pickOutputNames(produced, newFileName).map(
            (name) => destinations.get(name) ?? name,
          );

          for (const [name, destination] of destinations) {
            await moveInto(scratchDir, userOutputDir, name, destination);
          }

          if (jobId.value) {
            for (const outputName of outputNames) {
              query.run(jobId.value, fileName, outputName, status);
            }

            if (outputNames.length > 1) {
              // One input produced several files, so the job now holds more
              // files than it was created with. Without this the results page
              // waits forever for a count that can never be reached, leaving
              // the delete and tar buttons disabled.
              db.query("UPDATE jobs SET num_files = num_files + ?1 WHERE id = ?2").run(
                outputNames.length - 1,
                jobId.value,
              );
            }
          }

          return status;
        } finally {
          await rm(scratchDir, { recursive: true, force: true });
        }
      },
    );

    await Promise.all(toProcess);
  }
}

async function mainConverter(
  inputFilePath: string,
  fileTypeOriginal: string,
  convertTo: string,
  targetPath: string,
  options?: unknown,
  converterName?: string,
) {
  const fileType = normalizeFiletype(fileTypeOriginal);

  let converterFunc: (typeof properties)["libjxl"]["converter"] | undefined;

  if (converterName) {
    converterFunc = properties[converterName]?.converter;
  } else {
    // Iterate over each converter in properties
    for (converterName in properties) {
      const converterObj = properties[converterName];

      if (!converterObj) {
        break;
      }

      for (const key in converterObj.properties.from) {
        if (
          converterObj?.properties?.from[key]?.includes(fileType) &&
          converterObj?.properties?.to[key]?.includes(convertTo)
        ) {
          converterFunc = converterObj.converter;
          break;
        }
      }
    }
  }

  if (!converterFunc) {
    console.log(`No available converter supports converting from ${fileType} to ${convertTo}.`);
    return "File type not supported";
  }

  try {
    const result = await converterFunc(inputFilePath, fileType, convertTo, targetPath, options);

    console.log(
      `Converted ${inputFilePath} from ${fileType} to ${convertTo} successfully using ${converterName}.`,
      result,
    );

    if (typeof result === "string") {
      return result;
    }

    return "Done";
  } catch (error) {
    console.error(
      `Failed to convert ${inputFilePath} from ${fileType} to ${convertTo} using ${converterName}.`,
      error,
    );
    return "Failed, check logs";
  }
}

const possibleTargets: Record<string, Record<string, string[]>> = {};

for (const converterName in properties) {
  const converterProperties = properties[converterName]?.properties;
  if (!converterProperties) continue;

  for (const key in converterProperties.from) {
    const fromList = converterProperties.from[key];
    const toList = converterProperties.to[key];

    if (!fromList || !toList) continue;

    for (const ext of fromList) {
      if (!possibleTargets[ext]) possibleTargets[ext] = {};

      possibleTargets[ext][converterName] = toList;
    }
  }
}

export const getPossibleTargets = (from: string): Record<string, string[]> => {
  const fromClean = normalizeFiletype(from);

  return possibleTargets[fromClean] || {};
};

const possibleInputs: string[] = [];
for (const converterName in properties) {
  const converterProperties = properties[converterName]?.properties;

  if (!converterProperties) {
    continue;
  }

  for (const key in converterProperties.from) {
    for (const extension of converterProperties.from[key] ?? []) {
      if (!possibleInputs.includes(extension)) {
        possibleInputs.push(extension);
      }
    }
  }
}
possibleInputs.sort();

const allTargets: Record<string, string[]> = {};

for (const converterName in properties) {
  const converterProperties = properties[converterName]?.properties;

  if (!converterProperties) {
    continue;
  }

  for (const key in converterProperties.to) {
    if (allTargets[converterName]) {
      allTargets[converterName].push(...(converterProperties.to[key] || []));
    } else {
      allTargets[converterName] = converterProperties.to[key] || [];
    }
  }
}

export const getAllTargets = () => {
  return allTargets;
};

const allInputs: Record<string, string[]> = {};
for (const converterName in properties) {
  const converterProperties = properties[converterName]?.properties;

  if (!converterProperties) {
    continue;
  }

  for (const key in converterProperties.from) {
    if (allInputs[converterName]) {
      allInputs[converterName].push(...(converterProperties.from[key] || []));
    } else {
      allInputs[converterName] = converterProperties.from[key] || [];
    }
  }
}

export const getAllInputs = (converter: string) => {
  return allInputs[converter] || [];
};

/**
 * @internal For testing only. Do not use in production.
 * Tests need direct access to cover all branches of converter discovery and chunking logic.
 */
export { chunks, mainConverter };

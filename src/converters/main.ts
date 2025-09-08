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
import { convert as convertPotrace, properties as propertiesPotrace } from "./potrace";
import { convert as convertresvg, properties as propertiesresvg } from "./resvg";
import { convert as convertImage, properties as propertiesImage } from "./vips";
import { convert as convertVtracer, properties as propertiesVtracer } from "./vtracer";
import { convert as convertxelatex, properties as propertiesxelatex } from "./xelatex";

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
};

function chunks<T>(arr: T[], size: number): T[][] {
  if (size <= 0) {
    return [arr];
  }
  return Array.from({ length: Math.ceil(arr.length / size) }, (_: T, i: number) =>
    arr.slice(i * size, i * size + size),
  );
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

  for (const chunk of chunks(fileNames, MAX_CONVERT_PROCESS)) {
    const toProcess: Promise<string>[] = [];
    for (const fileName of chunk) {
      const filePath = `${userUploadsDir}${fileName}`;
      const fileTypeOrig = fileName.split(".").pop() ?? "";
      const fileType = normalizeFiletype(fileTypeOrig);
      const newFileExt = normalizeOutputFiletype(convertTo);
      const newFileName = fileName.replace(
        new RegExp(`${fileTypeOrig}(?!.*${fileTypeOrig})`),
        newFileExt,
      );
      const targetPath = `${userOutputDir}${newFileName}`;
      toProcess.push(
        new Promise((resolve, reject) => {
          mainConverter(filePath, fileType, convertTo, targetPath, {}, converterName)
            .then((r) => {
              if (jobId.value) {
                query.run(jobId.value, fileName, newFileName, r);
              }
              resolve(r);
            })
            .catch((c) => reject(c));
        }),
      );
    }
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

  if (!converterProperties) {
    continue;
  }

  for (const key in converterProperties.from) {
    if (converterProperties.from[key] === undefined) {
      continue;
    }

    for (const extension of converterProperties.from[key] ?? []) {
      if (!possibleTargets[extension]) {
        possibleTargets[extension] = {};
      }

      possibleTargets[extension][converterName] = converterProperties.to[key] || [];
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

// eslint-disable-next-line @typescript-eslint/no-unused-vars
const getPossibleInputs = () => {
  return possibleInputs;
};

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

// // count the number of unique formats
// const uniqueFormats = new Set();

// for (const converterName in properties) {
//   const converterProperties = properties[converterName]?.properties;

//   if (!converterProperties) {
//     continue;
//   }

//   for (const key in converterProperties.from) {
//     for (const extension of converterProperties.from[key] ?? []) {
//       uniqueFormats.add(extension);
//     }
//   }

//   for (const key in converterProperties.to) {
//     for (const extension of converterProperties.to[key] ?? []) {
//       uniqueFormats.add(extension);
//     }
//   }
// }

// // print the number of unique Inputs and Outputs
// console.log(`Unique Formats: ${uniqueFormats.size}`);

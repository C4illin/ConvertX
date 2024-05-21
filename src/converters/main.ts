import {
  properties as propertiesImage,
  convert as convertImage,
} from "./sharp";

import {
  properties as propertiesPandoc,
  convert as convertPandoc,
} from "./pandoc";

import {
  properties as propertiesFfmpeg,
  convert as convertFfmpeg,
} from "./ffmpeg";

const properties: {
  [key: string]: {
    properties: {
      from: { [key: string]: string[] };
      to: { [key: string]: string[] };
      options?: {
        [key: string]: {
          [key: string]: {
            description: string;
            type: string;
            default: number;
          };
        };
      };
    };
    converter: (
      filePath: string,
      fileType: string,
      // biome-ignore lint/suspicious/noExplicitAny: <explanation>
      convertTo: any,
      targetPath: string,
      // biome-ignore lint/suspicious/noExplicitAny: <explanation>
      options?: any,
      // biome-ignore lint/suspicious/noExplicitAny: <explanation>
    ) => any;
  };
} = {
  sharp: {
    properties: propertiesImage,
    converter: convertImage,
  },
  pandoc: {
    properties: propertiesPandoc,
    converter: convertPandoc,
  },
  ffmpeg: {
    properties: propertiesFfmpeg,
    converter: convertFfmpeg,
  },
};

import { normalizeFiletype } from "../helpers/normalizeFiletype";

export async function mainConverter(
  inputFilePath: string,
  fileTypeOriginal: string,
  // biome-ignore lint/suspicious/noExplicitAny: <explanation>
  convertTo: any,
  targetPath: string,
  // biome-ignore lint/suspicious/noExplicitAny: <explanation>
  options?: any,
  converterName?: string,
) {
  const fileType = normalizeFiletype(fileTypeOriginal);

  // biome-ignore lint/suspicious/noExplicitAny: <explanation>
  let converterFunc: any;
  // let converterName = converterName;

  if (converterName) {
    converterFunc = properties[converterName]?.converter;
  } else {
    // Iterate over each converter in properties
    // biome-ignore lint/style/noParameterAssign: <explanation>
    for (converterName in properties) {
      const converterObj = properties[converterName];

      if (!converterObj) {
        break;
      }

      for (const key in converterObj.properties.from) {
        if (
          converterObj.properties.from[key].includes(fileType) &&
          converterObj.properties.to[key].includes(convertTo)
        ) {
          converterFunc = converterObj.converter;
          break;
        }
      }
    }
  }

  if (!converterFunc) {
    console.log(
      `No available converter supports converting from ${fileType} to ${convertTo}.`,
    );
    return;
  }

  try {
    await converterFunc(
      inputFilePath,
      fileType,
      convertTo,
      targetPath,
      options,
    );
    console.log(
      `Converted ${inputFilePath} from ${fileType} to ${convertTo} successfully using ${converterName}.`,
    );
  } catch (error) {
    console.error(
      `Failed to convert ${inputFilePath} from ${fileType} to ${convertTo} using ${converterName}.`,
      error,
    );
  }
}

const possibleConversions: { [key: string]: { [key: string]: string[] } } = {};

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
      if (!possibleConversions[extension]) {
        possibleConversions[extension] = {};
      }
      possibleConversions[extension][converterName] =
        converterProperties.to[key] || [];
    }
  }
}

// // save all possible conversions to a file
// import fs from "fs";
// import path from "path";
// import { FormatEnum } from "sharp";
// fs.writeFileSync(
//   path.join(__dirname, ".", "possibleConversions.json"),
//   JSON.stringify(possibleConversions),
// );

export const getPossibleConversions = (
  from: string,
): { [key: string]: string[] } => {
  const fromClean = normalizeFiletype(from);

  return possibleConversions[fromClean] || {};
};

const allTargets: { [key: string]: string[] | undefined } = {};

for (const converterName in properties) {
  const converterProperties = properties[converterName]?.properties;

  if (!converterProperties) {
    continue;
  }

  for (const key in converterProperties.to) {
    if (allTargets[converterName]) {
      allTargets[converterName].push(...converterProperties.to[key]);
    } else {
      allTargets[converterName] = converterProperties.to[key];
    }
  }
}

export const getAllTargets = () => {
  return allTargets;
};

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
      from: string[] | { [key: string]: string[] };
      to: string[] | { [key: string]: string[] };
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
  converter?: string,
) {
  const fileType = normalizeFiletype(fileTypeOriginal);

  // biome-ignore lint/suspicious/noExplicitAny: <explanation>
  let converterFunc: any;

  if (converter) {
    converterFunc = properties[converter];
  } else {
    // Iterate over each converter in properties
    for (const converterName in properties) {
      const converterObj = properties[converterName];

      if (!converterObj) {
        break;
      }

      // if converter properties.from is an object loop thorugh the keys otherwise use the array
      // for example ffmpeg is an object eg from: {video: ["mp4", "webm"], audio: ["mp3"]}
      if (Array.isArray(converterObj.properties.from) && Array.isArray(converterObj.properties.to)) {
        if (
          converterObj.properties.from.includes(fileType) &&
          converterObj.properties.to.includes(convertTo)
        ) {
          converterFunc = converterObj.converter;
          break;
        }
      } else {
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
      `Converted ${inputFilePath} from ${fileType} to ${convertTo} successfully using ${converter}.`,
    );
  } catch (error) {
    console.error(
      `Failed to convert ${inputFilePath} from ${fileType} to ${convertTo} using ${converter}.`,
      error,
    );
  }
}

const possibleConversions: { [key: string]: string[] } = {};

for (const converterName in properties) {
  const converterProperties = properties[converterName]?.properties;

  if (!converterProperties) {
    continue;
  }

  if (Array.isArray(converterProperties.from)) {
    for (const extension of converterProperties.from) {
      possibleConversions[extension] = converterProperties.to;
    }
  } else {
    for (const key in converterProperties.from) {
      if (!converterProperties.from[key] || !converterProperties.to[key]) {
        continue;
      }

      for (const extension of converterProperties.from[key]) {
        possibleConversions[extension] = converterProperties.to[key];
      }
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

export const getPossibleConversions = (from: string): string[] => {
  const fromClean = normalizeFiletype(from);

  return possibleConversions[fromClean] || ([] as string[]);
};

let allTargets: string[] = [];

for (const converterName in properties) {
  const converterProperties = properties[converterName].properties;

  if (Array.isArray(converterProperties.from)) {
    allTargets = allTargets.concat(converterProperties.to);
  } else {
    for (const key in converterProperties.to) {
      allTargets = allTargets.concat(converterProperties.to[key]);
    }
  }
}

export const getAllTargets = () => {
  return allTargets;
};

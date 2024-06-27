import { convert as convertImage, properties as propertiesImage } from "./vips";

import {
  convert as convertPandoc,
  properties as propertiesPandoc,
} from "./pandoc";

import {
  convert as convertFFmpeg,
  properties as propertiesFFmpeg,
} from "./ffmpeg";

import {
  convert as convertGraphicsmagick,
  properties as propertiesGraphicsmagick,
} from "./graphicsmagick";

import {
  convert as convertxelatex,
  properties as propertiesxelatex,
} from "./xelatex";

import {
  convert as convertLibjxl,
  properties as propertiesLibjxl,
} from "./libjxl";

import { normalizeFiletype } from "../helpers/normalizeFiletype";

// This should probably be reconstructed so that the functions are not imported instead the functions hook into this to make the converters more modular

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
      convertTo: string,
      targetPath: string,
      // biome-ignore lint/suspicious/noExplicitAny: <explanation>
      options?: any,
      // biome-ignore lint/suspicious/noExplicitAny: <explanation>
    ) => any;
  };
} = {
  libjxl: {
    properties: propertiesLibjxl,
    converter: convertLibjxl,
  },
  vips: {
    properties: propertiesImage,
    converter: convertImage,
  },
  xelatex: {
    properties: propertiesxelatex,
    converter: convertxelatex,
  },
  pandoc: {
    properties: propertiesPandoc,
    converter: convertPandoc,
  },
  graphicsmagick: {
    properties: propertiesGraphicsmagick,
    converter: convertGraphicsmagick,
  },
  ffmpeg: {
    properties: propertiesFFmpeg,
    converter: convertFFmpeg,
  },
};

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
    console.log(
      `No available converter supports converting from ${fileType} to ${convertTo}.`,
    );
    return "File type not supported";
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
    return "Done";
  } catch (error) {
    console.error(
      `Failed to convert ${inputFilePath} from ${fileType} to ${convertTo} using ${converterName}.`,
      error,
    );
    return "Failed, check logs";
  }
}

const possibleTargets: { [key: string]: { [key: string]: string[] } } = {};

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

      possibleTargets[extension][converterName] =
        converterProperties.to[key] || [];
    }
  }
}

export const getPossibleTargets = (
  from: string,
): { [key: string]: string[] } => {
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

export const getPossibleInputs = () => {
  return possibleInputs;
};

const allTargets: { [key: string]: string[] } = {};

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

const allInputs: { [key: string]: string[] } = {};
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

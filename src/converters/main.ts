import {
  properties as propertiesImage,
  convert as convertImage,
} from "./sharp";

import {
  properties as propertiesPandoc,
  convert as convertPandoc,
} from "./pandoc";

import { normalizeFiletype } from "../helpers/normalizeFiletype";

export async function mainConverter(
  inputFilePath: string,
  fileType: string,
  convertTo: string,
  targetPath: string,
  options?: any,
) {
  // Check if the fileType and convertTo are supported by the sharp converter
  if (
    propertiesImage.from.includes(fileType) &&
    propertiesImage.to.includes(convertTo)
  ) {
    // Use the sharp converter
    try {
      await convertImage(
        inputFilePath,
        fileType,
        convertTo,
        targetPath,
        options,
      );
      console.log(
        `Converted ${inputFilePath} from ${fileType} to ${convertTo} successfully.`,
      );
    } catch (error) {
      console.error(
        `Failed to convert ${inputFilePath} from ${fileType} to ${convertTo}.`,
        error,
      );
    }
  }
  // Check if the fileType and convertTo are supported by the pandoc converter
  else if (
    propertiesPandoc.from.includes(fileType) &&
    propertiesPandoc.to.includes(convertTo)
  ) {
    // Use the pandoc converter
    try {
      await convertPandoc(
        inputFilePath,
        fileType,
        convertTo,
        targetPath,
        options,
      );
      console.log(
        `Converted ${inputFilePath} from ${fileType} to ${convertTo} successfully.`,
      );
    } catch (error) {
      console.error(
        `Failed to convert ${inputFilePath} from ${fileType} to ${convertTo}.`,
        error,
      );
    }
  } else {
    console.log(
      `Neither the sharp nor pandoc converter support converting from ${fileType} to ${convertTo}.`,
    );
  }
}

const possibleConversions: { [key: string]: string[] } = {};

for (const from of propertiesImage.from) {
  possibleConversions[from] = propertiesImage.to;
}

for (const from of propertiesPandoc.from) {
  possibleConversions[from] = propertiesPandoc.to;
}

export const getPossibleConversions = (from: string): string[] => {
  const fromClean = normalizeFiletype(from);

  return possibleConversions[fromClean] || ([] as string[]);
};

export const getAllTargets = () => {
  return [...propertiesImage.to, ...propertiesPandoc.to];
};

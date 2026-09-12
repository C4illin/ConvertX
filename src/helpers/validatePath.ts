import path from "node:path";

export const isSafePath = (expectedParent: string, userInput: string): boolean => {
  const relativePath = path.relative(expectedParent, userInput);
  return !!relativePath && !relativePath.startsWith("..") && !path.isAbsolute(relativePath);
};

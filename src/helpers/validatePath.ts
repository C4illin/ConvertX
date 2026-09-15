import path from "node:path";

export const isSafePath = (expectedParent: string, userInput: string): boolean => {
  const relativePath = path.relative(expectedParent, userInput);
  const isEscaping = relativePath === ".." || relativePath.startsWith(".." + path.sep);
  return !!relativePath && !isEscaping && !path.isAbsolute(relativePath);
};

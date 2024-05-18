export const normalizeFiletype = (filetype: string): string => {
  const lowercaseFiletype = filetype.toLowerCase();
  
  switch (lowercaseFiletype) {
    case "jpg":
      return "jpeg";
    case "htm":
      return "html";
    default:
      return lowercaseFiletype;
  }
}
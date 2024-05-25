export const normalizeFiletype = (filetype: string): string => {
  const lowercaseFiletype = filetype.toLowerCase();
  
  switch (lowercaseFiletype) {
    case "jpg":
      return "jpeg";
    case "htm":
      return "html";
    case "tex":
      return "latex";
    default:
      return lowercaseFiletype;
  }
}

export const normalizeOutputFiletype = (filetype: string): string => {
  const lowercaseFiletype = filetype.toLowerCase();
  
  switch (lowercaseFiletype) {
    case "jpeg":
      return "jpg";
    case "latex":
      return "tex";
    default:
      return lowercaseFiletype;
  }
}
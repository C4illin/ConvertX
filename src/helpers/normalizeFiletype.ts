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

export const normalizeOutputFiletype = (filetype: string): string => {
  const lowercaseFiletype = filetype.toLowerCase();
  
  switch (lowercaseFiletype) {
    case "jpeg":
      return "jpg";
    case "mpeg4":
      return "mp4";
    default:
      return lowercaseFiletype;
  }
}
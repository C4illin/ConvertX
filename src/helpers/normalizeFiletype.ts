export const normalizeFiletype = (filetype: string): string => {
  const lowercaseFiletype = filetype.toLowerCase();

  switch (lowercaseFiletype) {
    case "jfif":
    case "jpg":
      return "jpeg";
    case "htm":
      return "html";
    case "tex":
      return "latex";
    case "md":
      return "markdown";
    case "unknown":
      return "m4a";
    default:
      return lowercaseFiletype;
  }
};

export const normalizeOutputFiletype = (filetype: string): string => {
  const lowercaseFiletype = filetype.toLowerCase();

  switch (lowercaseFiletype) {
    case "jpeg":
      return "jpg";
    case "latex":
      return "tex";
    case "markdown_phpextra":
    case "markdown_strict":
    case "markdown_mmd":
    case "markdown":
      return "md";
    // MinerU output formats - 保持原始格式名稱（.tar 由 main.ts 自動添加）
    // 因為 MinerU 是 archive-only 引擎，outputMode: "archive"
    case "md-t":
    case "md-i":
      return lowercaseFiletype;
    default:
      return lowercaseFiletype;
  }
};

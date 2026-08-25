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
    // assimp format ids that aren't real file extensions — map to the
    // canonical extension for the underlying format so the output file
    // opens in third-party viewers. The format id is still passed to
    // `assimp export -f<id>` so the right encoding/variant is produced.
    case "glb2":
      return "glb";
    case "gltf2":
      return "gltf";
    case "objnomtl":
      return "obj";
    case "stlb":
      return "stl";
    case "plyb":
      return "ply";
    case "fbxa":
      return "fbx";
    case "assjson":
      return "json";
    default:
      return lowercaseFiletype;
  }
};

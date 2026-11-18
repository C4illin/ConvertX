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

/**
 * Splits a file name into its extension (filetype) and stem. Compound extensions such as "nii.gz"
 * are recognized when listed in knownFiletypes (longest match wins; both sides are lowercased
 * before comparing, so mixed-case extension lists work too);
 * otherwise the last dot-separated segment is used, matching path.parse(fileName).ext. The returned
 * filetype keeps the file name's original casing.
 */
export const splitFileName = (
  fileName: string,
  knownFiletypes: string[],
): { filetype: string; stem: string } => {
  const lowerName = fileName.toLowerCase();
  let match = "";
  for (const ext of knownFiletypes) {
    const lowerExt = ext.toLowerCase();
    if (lowerExt.length > match.length && lowerName.endsWith(`.${lowerExt}`)) {
      match = lowerExt;
    }
  }
  if (match !== "") {
    return {
      filetype: fileName.slice(fileName.length - match.length),
      stem: fileName.slice(0, fileName.length - match.length - 1),
    };
  }
  if (!fileName.includes(".")) {
    return { filetype: "", stem: fileName };
  }
  const dot = fileName.lastIndexOf(".");
  return { filetype: fileName.slice(dot + 1), stem: fileName.slice(0, dot) };
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

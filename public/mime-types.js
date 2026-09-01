const mimeTypeExtensions = {
  "application/epub+zip": "epub",
  "application/json": "json",
  "application/msword": "doc",
  "application/pdf": "pdf",
  "application/rtf": "rtf",
  "application/vnd.ms-excel": "xls",
  "application/vnd.ms-powerpoint": "ppt",
  "application/vnd.oasis.opendocument.presentation": "odp",
  "application/vnd.oasis.opendocument.spreadsheet": "ods",
  "application/vnd.oasis.opendocument.text": "odt",
  "application/vnd.openxmlformats-officedocument.presentationml.presentation": "pptx",
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet": "xlsx",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document": "docx",
  "application/x-yaml": "yaml",
  "application/xml": "xml",
  "application/zip": "zip",
  "image/jpeg": "jpg",
  "image/pjpeg": "jpg",
  "image/svg+xml": "svg",
  "image/tiff": "tif",
  "image/vnd.adobe.photoshop": "psd",
  "image/vnd.djvu": "djvu",
  "image/vnd.dwg": "dwg",
  "image/vnd.dxf": "dxf",
  "image/vnd.microsoft.icon": "ico",
  "image/x-icon": "ico",
  "text/csv": "csv",
  "text/html": "html",
  "text/markdown": "md",
  "text/plain": "txt",
  "text/xml": "xml",
  "text/yaml": "yaml",
};

window.inferExtensionFromMimeType = (type) => {
  const normalizedType = type.toLowerCase();
  // If it's a known MIME type, return the extension.
  if (mimeTypeExtensions[normalizedType]) {
    return mimeTypeExtensions[normalizedType];
  }

  // If it's a yet-unhandled `image/*` MIME type, return the subtype.
  const [mediaType, subtype] = normalizedType.split("/");
  if (mediaType === "image" && subtype && !subtype.startsWith("vnd.")) {
    return subtype.split("+")[0];
  }

  // Use `.bin` if we don't know what to do.
  return "bin";
};

export function buildDownloadUrl(webroot: string, outputPath: string, fileName: string): string {
  return `${webroot}/download/${outputPath}${encodeURIComponent(fileName)}`;
}

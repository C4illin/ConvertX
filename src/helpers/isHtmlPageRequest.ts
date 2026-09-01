export function isHtmlPageRequest(request: Request): boolean {
  const acceptsHtml = request.headers.get("accept")?.includes("text/html");
  return (request.method === "GET" || request.method === "HEAD") && Boolean(acceptsHtml);
}

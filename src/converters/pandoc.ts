import { exec } from "node:child_process";

export const properties = {
  from: [
    "md", "html", "docx", "pdf", "tex", "txt", "bibtex", "biblatex", "commonmark", "commonmark_x", "creole", "csljson", "csv", "tsv", "docbook", "dokuwiki", "endnotexml", "epub", "fb2", "gfm", "haddock", "ipynb", "jats", "jira", "json", "latex", "markdown", "markdown_mmd", "markdown_phpextra", "markdown_strict", "mediawiki", "man", "muse", "native", "odt", "opml", "org", "ris", "rtf", "rst", "t2t", "textile", "tikiwiki", "twiki", "vimwiki"
  ],
  to: [
    "asciidoc", "asciidoctor", "beamer", "bibtex", "biblatex", "commonmark", "commonmark_x", "context", "csljson", "docbook", "docbook4", "docbook5", "docx", "dokuwiki", "epub", "epub3", "epub2", "fb2", "gfm", "haddock", "html", "html5", "html4", "icml", "ipynb", "jats_archiving", "jats_articleauthoring", "jats_publishing", "jats", "jira", "json", "latex", "man", "markdown", "markdown_mmd", "markdown_phpextra", "markdown_strict", "markua", "mediawiki", "ms", "muse", "native", "odt", "opml", "opendocument", "org", "pdf", "plain", "pptx", "rst", "rtf", "texinfo", "textile", "slideous", "slidy", "dzslides", "revealjs", "s5", "tei", "xwiki", "zimwiki"
  ]
};

// biome-ignore lint/suspicious/noExplicitAny: <explanation>
export function convert(filePath: string, fileType: string, convertTo: string, targetPath: string, options?: any) {
  return exec(
    `pandoc ${filePath} -f ${fileType} -t ${convertTo} -o ${targetPath}`,
  );
}
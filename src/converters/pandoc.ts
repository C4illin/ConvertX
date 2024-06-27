import { exec } from "node:child_process";

export const properties = {
  from: {
    text: [
      "textile",
      "tikiwiki",
      "tsv",
      "twiki",
      "typst",
      "vimwiki",
      "biblatex",
      "bibtex",
      "bits",
      "commonmark",
      "commonmark_x",
      "creole",
      "csljson",
      "csv",
      "djot",
      "docbook",
      "docx",
      "dokuwiki",
      "endnotexml",
      "epub",
      "fb2",
      "gfm",
      "haddock",
      "html",
      "ipynb",
      "jats",
      "jira",
      "json",
      "latex",
      "man",
      "markdown",
      "markdown_mmd",
      "markdown_phpextra",
      "markdown_strict",
      "mediawiki",
      "muse",
      "pandoc native",
      "opml",
      "org",
      "ris",
      "rst",
      "rtf",
      "t2t",
    ],
  },
  to: {
    text: [
      "tei",
      "texinfo",
      "textile",
      "typst",
      "xwiki",
      "zimwiki",
      "asciidoc",
      "asciidoc_legacy",
      "asciidoctor",
      "beamer",
      "biblatex",
      "bibtex",
      "chunkedhtml",
      "commonmark",
      "commonmark_x",
      "context",
      "csljson",
      "djot",
      "docbook",
      "docbook4",
      "docbook5",
      "docx",
      "dokuwiki",
      "dzslides",
      "epub",
      "epub2",
      "epub3",
      "fb2",
      "gfm",
      "haddock",
      "html",
      "html4",
      "html5",
      "icml",
      "ipynb",
      "jats",
      "jats_archiving",
      "jats_articleauthoring",
      "jats_publishing",
      "jira",
      "json",
      "latex",
      "man",
      "markdown",
      "markdown_mmd",
      "markdown_phpextra",
      "markdown_strict",
      "markua",
      "mediawiki",
      "ms",
      "muse",
      "pandoc native",
      "odt",
      "opendocument",
      "opml",
      "org",
      "pdf",
      "plain",
      "pptx",
      "revealjs",
      "rst",
      "rtf",
      "s5",
      "slideous",
      "slidy",
    ],
  },
};

export function convert(
  filePath: string,
  fileType: string,
  convertTo: string,
  targetPath: string,
  // biome-ignore lint/suspicious/noExplicitAny: <explanation>
  options?: any,
): Promise<string> {
  // set xelatex here
  const xelatex = ["pdf", "latex"];
  let option = "";
  if (xelatex.includes(convertTo)) {
    option = "--pdf-engine=xelatex";
  }
  return new Promise((resolve, reject) => {
    exec(
      `pandoc ${option} "${filePath}" -f ${fileType} -t ${convertTo} -o "${targetPath}"`,
      (error, stdout, stderr) => {
        if (error) {
          reject(`error: ${error}`);
        }

        if (stdout) {
          console.log(`stdout: ${stdout}`);
        }

        if (stderr) {
          console.error(`stderr: ${stderr}`);
        }

        resolve("success");
      },
    );
  });
}

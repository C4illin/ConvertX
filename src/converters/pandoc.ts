import { execFile as execFileOriginal } from "node:child_process";
import { readFileSync } from "node:fs";
import { ExecFileFn } from "./types";

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

/**
 * Detects CJK characters in a file and returns the appropriate Noto Sans CJK
 * font variant for the detected language. Returns null for non-CJK content
 * so that the CJK font argument is omitted entirely, keeping non-CJK
 * conversions working in environments without CJK fonts installed.
 *
 * Detection order matters: Japanese Kana is checked first (most specific),
 * then Korean Hangul, then CJK Unified Ideographs (Chinese). This is because
 * Japanese text also uses Kanji (shared with Chinese), but the presence of
 * Kana uniquely identifies Japanese content.
 */
function detectCJKFont(filePath: string): string | null {
  let content: string;
  try {
    content = readFileSync(filePath, "utf-8");
  } catch {
    // If the file can't be read, don't add a CJK font to avoid breaking
    // conversions. Pandoc will still process the file independently.
    return null;
  }

  // Japanese: Hiragana (U+3040-309F) or Katakana (U+30A0-30FF)
  if (/[\u3040-\u309f\u30a0-\u30ff]/.test(content)) {
    return "Noto Sans CJK JP";
  }

  // Korean: Hangul Syllables (U+AC00-D7AF)
  if (/[\uac00-\ud7af]/.test(content)) {
    return "Noto Sans CJK KR";
  }

  // Chinese: CJK Unified Ideographs (U+4E00-9FFF)
  if (/[\u4e00-\u9fff]/.test(content)) {
    return "Noto Sans CJK SC";
  }

  return null;
}

export function convert(
  filePath: string,
  fileType: string,
  convertTo: string,
  targetPath: string,
  options?: unknown,
  execFile: ExecFileFn = execFileOriginal,
): Promise<string> {
  // set xelatex here
  const xelatex = ["pdf", "latex"];

  // Build arguments array
  const args: string[] = [];

  if (xelatex.includes(convertTo)) {
    args.push("--pdf-engine=xelatex");
    // Detect CJK characters in the source file and set an appropriate
    // CJK font only when needed. This avoids breaking non-CJK conversions
    // in environments without CJK fonts, and selects the correct locale-
    // specific font variant (JP/KR/SC) for proper glyph rendering.
    const cjkFont = detectCJKFont(filePath);
    if (cjkFont) {
      args.push("-V", `CJKmainfont=${cjkFont}`);
    }
  }

  args.push(filePath);
  args.push("-f", fileType);
  args.push("-t", convertTo);
  args.push("-o", targetPath);

  return new Promise((resolve, reject) => {
    execFile("pandoc", args, (error, stdout, stderr) => {
      if (error) {
        reject(`error: ${error}`);
      }

      if (stdout) {
        console.log(`stdout: ${stdout}`);
      }

      if (stderr) {
        console.error(`stderr: ${stderr}`);
      }

      resolve("Done");
    });
  });
}

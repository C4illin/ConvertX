import { exec } from "node:child_process";
import { readFile } from "node:fs";
import { version } from "../../package.json";

console.log(`ConvertX v${version}`);

if (process.env.NODE_ENV === "production") {
  readFile("/etc/os-release", "utf8", (error, stdout) => {
    if (error) {
      console.error("Not running on docker, this is not supported.");
      return;
    }

    if (stdout) {
      console.log(stdout.split('PRETTY_NAME="')[1]?.split('"')[0]);
    }
  });

  exec("pandoc -v", (error, stdout) => {
    if (error) {
      console.error("Pandoc is not installed.");
      return;
    }

    if (stdout) {
      console.log(`pandoc v${stdout.match(/pandoc ([\d.]+)/)?.[1] || "unknown"}`);
    }
  });

  exec("ffmpeg -version", (error, stdout) => {
    if (error) {
      console.error("FFmpeg is not installed.");
      return;
    }

    if (stdout) {
      console.log(`FFmpeg v${stdout.match(/version ([\w+.-]+)/)?.[1] || "unknown"}`);
    }
  });

  exec("vips -v", (error, stdout) => {
    if (error) {
      console.error("Vips is not installed.");
      return;
    }

    if (stdout) {
      console.log(`Vips v${stdout.match(/vips-([\d.]+)/)?.[1] || "unknown"}`);
    }
  });

  exec("magick --version", (error, stdout) => {
    if (error) {
      console.error("ImageMagick is not installed.");
      return;
    }

    if (stdout) {
      console.log(`ImageMagick v${stdout.match(/ImageMagick ([\d.-]+)/)?.[1] || "unknown"}`);
    }
  });

  exec("gm version", (error, stdout) => {
    if (error) {
      console.error("GraphicsMagick is not installed.");
      return;
    }

    if (stdout) {
      console.log(`GraphicsMagick v${stdout.match(/GraphicsMagick ([\d.]+)/)?.[1] || "unknown"}`);
    }
  });

  exec("inkscape --version", (error, stdout) => {
    if (error) {
      console.error("Inkscape is not installed.");
      return;
    }

    if (stdout) {
      console.log(`Inkscape v${stdout.match(/Inkscape ([\d.]+)/)?.[1] || "unknown"}`);
    }
  });

  exec("djxl --version", (error, stdout) => {
    if (error) {
      console.error("libjxl-tools is not installed.");
      return;
    }

    if (stdout) {
      console.log(`djxl v${stdout.match(/(?:v)?([\d.]+)/)?.[1] || "unknown"}`);
    }
  });

  exec("dasel version", (error, stdout) => {
    if (error) {
      console.error("dasel is not installed.");
      return;
    }

    if (stdout) {
      const ver = stdout.replace("dasel", "").trim().split(/\s+/)[0] || "unknown";
      console.log(`dasel ${ver}`);
    }
  });

  exec("xelatex -version", (error, stdout) => {
    if (error) {
      console.error("Tex Live with XeTeX is not installed.");
      return;
    }

    if (stdout) {
      console.log(`XeTeX v${stdout.match(/XeTeX ([\d.-]+)/)?.[1] || "unknown"}`);
    }
  });

  exec("resvg -V", (error, stdout) => {
    if (error) {
      console.error("resvg is not installed");
      return;
    }

    if (stdout) {
      console.log(`resvg v${(stdout.split("\n")[0] ?? "").trim().replace(/^v/, "")}`);
    }
  });

  exec("assimp version", (error, stdout) => {
    if (error) {
      console.error("assimp is not installed");
      return;
    }

    if (stdout) {
      const match = stdout.match(/Version ([\d.]+)/i);
      console.log(`assimp v${match?.[1] || "unknown"}`);
    }
  });

  exec("ebook-convert --version", (error, stdout) => {
    if (error) {
      console.error("ebook-convert (calibre) is not installed");
      return;
    }

    if (stdout) {
      console.log(`ebook-convert v${stdout.match(/calibre ([\d.]+)/)?.[1] || "unknown"}`);
    }
  });

  exec("heif-info -v", (error, stdout) => {
    if (error) {
      console.error("libheif is not installed");
      return;
    }

    if (stdout) {
      console.log(`libheif v${stdout.split("\n")[0]}`);
    }
  });

  exec("potrace -v", (error, stdout) => {
    if (error) {
      console.error("potrace is not installed");
      return;
    }

    if (stdout) {
      const ver = stdout.match(/potrace ([\d.]+)/)?.[1]?.replace(/\.$/, "") || "unknown";
      console.log(`potrace v${ver}`);
    }
  });

  exec("soffice --version", (error, stdout) => {
    if (error) {
      console.error("libreoffice is not installed");
      return;
    }

    if (stdout) {
      console.log(`LibreOffice v${stdout.match(/LibreOffice ([\d.]+)/)?.[1] || "unknown"}`);
    }
  });

  // msgconvert has no version flag, so read the version of the perl module providing it
  exec(
    "perl -MEmail::Outlook::Message -e 'print $Email::Outlook::Message::VERSION'",
    (error, stdout) => {
      if (error) {
        console.error("msgconvert (libemail-outlook-message-perl) is not installed");
        return;
      }

      if (stdout) {
        console.log(`msgconvert v${stdout.split("\n")[0]}`);
      }
    },
  );

  exec("markitdown -v", (error, stdout) => {
    if (error) {
      console.error("markitdown is not installed");
      return;
    }

    if (stdout) {
      const ver = stdout.match(/([\d.]+)/)?.[1] || "unknown";
      console.log(`markitdown v${ver}`);
    }
  });

  exec("bun -v", (error, stdout) => {
    if (error) {
      console.error("Bun is not installed. wait what");
      return;
    }

    if (stdout) {
      console.log(`Bun v${stdout.split("\n")[0]}`);
    }
  });
}

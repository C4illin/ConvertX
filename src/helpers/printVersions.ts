import { exec } from "node:child_process";
import { readFile } from "node:fs";
import { version } from "../../package.json";

console.log(`ConvertX v${version}`);

if (process.env.NODE_ENV === "production") {
  readFile("/etc/os-release", "utf8", (error, stdout) => {
    if (error) {
      console.error("Not running on docker, this is not supported.");
    }

    if (stdout) {
      console.log(stdout.split('PRETTY_NAME="')[1]?.split('"')[0]);
    }
  });

  exec("pandoc -v", (error, stdout) => {
    if (error) {
      console.error("Pandoc is not installed.");
    }

    if (stdout) {
      console.log(stdout.split("\n")[0]);
    }
  });

  exec("ffmpeg -version", (error, stdout) => {
    if (error) {
      console.error("FFmpeg is not installed.");
    }

    if (stdout) {
      console.log(stdout.split("\n")[0]);
    }
  });

  exec("vips -v", (error, stdout) => {
    if (error) {
      console.error("Vips is not installed.");
    }

    if (stdout) {
      console.log(stdout.split("\n")[0]);
    }
  });

  exec("magick --version", (error, stdout) => {
    if (error) {
      console.error("ImageMagick is not installed.");
    }

    if (stdout) {
      console.log(stdout.split("\n")[0]?.replace("Version: ", ""));
    }
  });

  exec("gm version", (error, stdout) => {
    if (error) {
      console.error("GraphicsMagick is not installed.");
    }

    if (stdout) {
      console.log(stdout.split("\n")[0]);
    }
  });

  exec("inkscape --version", (error, stdout) => {
    if (error) {
      console.error("Inkscape is not installed.");
    }

    if (stdout) {
      console.log(stdout.split("\n")[0]);
    }
  });

  exec("djxl --version", (error, stdout) => {
    if (error) {
      console.error("libjxl-tools is not installed.");
    }

    if (stdout) {
      console.log(stdout.split("\n")[0]);
    }
  });

  exec("dasel --version", (error, stdout) => {
    if (error) {
      console.error("dasel is not installed.");
    }

    if (stdout) {
      console.log(stdout.split("\n")[0]);
    }
  });

  exec("xelatex -version", (error, stdout) => {
    if (error) {
      console.error("Tex Live with XeTeX is not installed.");
    }

    if (stdout) {
      console.log(stdout.split("\n")[0]);
    }
  });

  exec("resvg -V", (error, stdout) => {
    if (error) {
      console.error("resvg is not installed");
    }

    if (stdout) {
      console.log(`resvg v${stdout.split("\n")[0]}`);
    }
  });

  exec("assimp version", (error, stdout) => {
    if (error) {
      console.error("assimp is not installed");
    }

    if (stdout) {
      console.log(`assimp ${stdout.split("\n")[5]}`);
    }
  });

  exec("ebook-convert --version", (error, stdout) => {
    if (error) {
      console.error("ebook-convert (calibre) is not installed");
    }

    if (stdout) {
      console.log(stdout.split("\n")[0]);
    }
  });

  exec("heif-info -v", (error, stdout) => {
    if (error) {
      console.error("libheif is not installed");
    }

    if (stdout) {
      console.log(`libheif v${stdout.split("\n")[0]}`);
    }
  });

  exec("potrace -v", (error, stdout) => {
    if (error) {
      console.error("potrace is not installed");
    }

    if (stdout) {
      console.log(stdout.split("\n")[0]);
    }
  });

  exec("soffice --version", (error, stdout) => {
    if (error) {
      console.error("libreoffice is not installed");
    }

    if (stdout) {
      console.log(stdout.split("\n")[0]);
    }
  });

  exec("msgconvert --version", (error, stdout) => {
    if (error) {
      console.error("msgconvert (libemail-outlook-message-perl) is not installed");
    }

    if (stdout) {
      console.log(stdout.split("\n")[0]);
    }
  });

  exec("bun -v", (error, stdout) => {
    if (error) {
      console.error("Bun is not installed. wait what");
    }

    if (stdout) {
      console.log(`Bun v${stdout.split("\n")[0]}`);
    }
  });
}

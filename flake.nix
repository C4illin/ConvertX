{
  description = "ConvertX";

  inputs = {
    nixpkgs.url = "github:NixOS/nixpkgs/nixos-unstable";
    flake-utils.url = "github:numtide/flake-utils";
  };

  outputs = { self, nixpkgs, flake-utils, ... }:
    flake-utils.lib.eachDefaultSystem (system:
      let
        pkgs = import nixpkgs { inherit system; };
        appSrc = ./.;

        app = pkgs.dockerTools.buildLayeredImage {
          name = "convertx";
          tag = "latest";

          contents = [
            pkgs.bun
            pkgs.resvg
            pkgs.ffmpeg
            pkgs.graphicsmagick
            pkgs.ghostscript
            pkgs.vips
            pkgs.pandoc
            pkgs.texlive.combined.scheme-full
            pkgs.calibre
            pkgs.inkscape
            pkgs.poppler_utils
            pkgs.assimp
            pkgs.jxrlib
            pkgs.libheif
            pkgs.libjxl
            pkgs.python3Packages.numpy
          ];

          config = {
            Env = [
              "NODE_ENV=production"
              "PATH=/bin:/usr/bin"
            ];
            WorkingDir = "/app";
            Cmd = [ "bun" "run" "./src/index.tsx" ];
            ExposedPorts = {
              "3000/tcp" = {};
            };
          };

          extraCommands = ''
            export PATH=${pkgs.bun}/bin:$PATH
            mkdir -p app
            cp -r ${appSrc}/* app/
            cd app
            bun install --frozen-lockfile --production
            bun run build
          '';
        };
      in {
        packages.default = app;
      });
}

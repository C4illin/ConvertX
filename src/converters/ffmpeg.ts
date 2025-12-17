import { execFile as execFileOriginal } from "node:child_process";
import { ExecFileFn } from "./types";

// This could be done dynamically by running `ffmpeg -formats` and parsing the output
export const properties = {
  from: {
    muxer: [
      "264",
      "265",
      "266",
      "302",
      "3dostr",
      "3g2",
      "3gp",
      "4xm",
      "669",
      "722",
      "aa",
      "aa3",
      "aac",
      "aax",
      "ac3",
      "ac4",
      "ace",
      "acm",
      "act",
      "adf",
      "adp",
      "ads",
      "adx",
      "aea",
      "afc",
      "aiff",
      "aix",
      "al",
      "alaw",
      "alias_pix",
      "alp",
      "alsa",
      "amf",
      "amr",
      "amrnb",
      "amrwb",
      "ams",
      "anm",
      "ans",
      "apc",
      "ape",
      "apl",
      "apm",
      "apng",
      "aptx",
      "aptxhd",
      "aqt",
      "aqtitle",
      "argo_asf",
      "argo_brp",
      "art",
      "asc",
      "asf",
      "asf_o",
      "ass",
      "ast",
      "au",
      "av1",
      "avc",
      "avi",
      "avif",
      "avr",
      "avs",
      "avs2",
      "avs3",
      "awb",
      "bcstm",
      "bethsoftvid",
      "bfi",
      "bfstm",
      "bin",
      "bink",
      "binka",
      "bit",
      "bitpacked",
      "bmv",
      "bmp",
      "bonk",
      "boa",
      "brender_pix",
      "brstm",
      "c2",
      "c93",
      "caf",
      "cavsvideo",
      "cdata",
      "cdg",
      "cdxl",
      "cgi",
      "cif",
      "cine",
      "codec2",
      "codec2raw",
      "concat",
      "cri",
      "dash",
      "dat",
      "data",
      "daud",
      "dav",
      "dbm",
      "dcstr",
      "dds",
      "derf",
      "dfpwm",
      "dfa",
      "dhav",
      "dif",
      "digi",
      "dirac",
      "diz",
      "dmf",
      "dnxhd",
      "dpx_pipe",
      "dsf",
      "dsicin",
      "dsm",
      "dss",
      "dtk",
      "dtm",
      "dts",
      "dtshd",
      "dv",
      "dvbsub",
      "dvbtxt",
      "dxa",
      "ea",
      "eac3",
      "ea_cdata",
      "epaf",
      "exr_pipe",
      "f32be",
      "f32le",
      "ec3",
      "evc",
      "f4v",
      "f64be",
      "f64le",
      "fap",
      "far",
      "fbdev",
      "ffmetadata",
      "filmstrip",
      "film_cpk",
      "fits",
      "flac",
      "flic",
      "flm",
      "flv",
      "frm",
      "fsb",
      "fwse",
      "g722",
      "g723_1",
      "g726",
      "g726le",
      "g729",
      "gdm",
      "gdv",
      "genh",
      "gif",
      "gsm",
      "gxf",
      "h261",
      "h263",
      "h264",
      "h265",
      "h266",
      "h26l",
      "hca",
      "hcom",
      "hevc",
      "hls",
      "hnm",
      "ice",
      "ico",
      "idcin",
      "idf",
      "idx",
      "iec61883",
      "iff",
      "ifv",
      "ilbc",
      "image2",
      "imf",
      "imx",
      "ingenient",
      "ipmovie",
      "ipu",
      "ircam",
      "ism",
      "isma",
      "ismv",
      "iss",
      "it",
      "iv8",
      "ivf",
      "ivr",
      "j2b",
      "j2k",
      "jack",
      "jacosub",
      "jv",
      "jpegls",
      "jpeg",
      "jxl",
      "kmsgrab",
      "kux",
      "kvag",
      "lavfi",
      "laf",
      "lmlm4",
      "loas",
      "lrc",
      "luodat",
      "lvf",
      "lxf",
      "m15",
      "m2a",
      "m4a",
      "m4b",
      "m4v",
      "mac",
      "mca",
      "mcc",
      "mdl",
      "med",
      "microdvd",
      "mj2",
      "mjpeg",
      "mjpg",
      "mk3d",
      "mka",
      "mks",
      "mkv",
      "mlp",
      "mlv",
      "mm",
      "mmcmp",
      "mmf",
      "mms",
      "mo3",
      "mod",
      "mods",
      "moflex",
      "mov",
      "mp2",
      "mp3",
      "mp4",
      "mpa",
      "mpc",
      "mpc8",
      "mpeg",
      "mpg",
      "mpjpeg",
      "mpl2",
      "mpo",
      "mpsub",
      "mptm",
      "msbc",
      "msf",
      "msnwctcp",
      "msp",
      "mt2",
      "mtaf",
      "mtm",
      "mtv",
      "mulaw",
      "musx",
      "mv",
      "mvi",
      "mxf",
      "mxg",
      "nc",
      "nfo",
      "nist",
      "nistsphere",
      "nsp",
      "nst",
      "nsv",
      "nut",
      "nuv",
      "obu",
      "ogg",
      "okt",
      "oma",
      "omg",
      "opus",
      "openal",
      "oss",
      "osq",
      "paf",
      "pdv",
      "pam",
      "pbm",
      "pcx",
      "pgmyuv",
      "pgm",
      "pgx",
      "photocd",
      "pictor",
      "pjs",
      "plm",
      "pmp",
      "png",
      "ppm",
      "pp",
      "psd",
      "psm",
      "psp",
      "psxstr",
      "pt36",
      "ptm",
      "pulse",
      "pva",
      "pvf",
      "qcif",
      "qcp",
      "qdraw",
      "r3d",
      "rawvideo",
      "rco",
      "rcv",
      "realtext",
      "redspark",
      "rgb",
      "rl2",
      "rm",
      "roq",
      "rpl",
      "rka",
      "rsd",
      "rso",
      "rt",
      "rtp",
      "rtsp",
      "s16be",
      "s16le",
      "s24be",
      "s24le",
      "s32be",
      "s32le",
      "s337m",
      "s3m",
      "s8",
      "sami",
      "sap",
      "sb",
      "sbc",
      "sbg",
      "scc",
      "sdns",
      "sdp",
      "sdr2",
      "sds",
      "sdx",
      "ser",
      "sf",
      "sfx",
      "sfx2",
      "sga",
      "sgi",
      "shn",
      "siff",
      "sln",
      "smi",
      "smjpeg",
      "smk",
      "smush",
      "sndio",
      "sol",
      "son",
      "sox",
      "spdif",
      "sph",
      "srt",
      "ss2",
      "ssa",
      "st26",
      "stk",
      "stl",
      "stm",
      "stp",
      "str",
      "sub",
      "sup",
      "svag",
      "svg",
      "svs",
      "sw",
      "swf",
      "tak",
      "tco",
      "tedcaptions",
      "thd",
      "thp",
      "tiertexseq",
      "tif",
      "tiff",
      "tmv",
      "truehd",
      "tta",
      "tty",
      "txd",
      "txt",
      "ty",
      "ty+",
      "u16be",
      "u16le",
      "u24be",
      "u24le",
      "u32be",
      "u32le",
      "u8",
      "ub",
      "ul",
      "ult",
      "umx",
      "usm",
      "uw",
      "v",
      "v210",
      "v210x",
      "vag",
      "vb",
      "vc1",
      "vc1test",
      "vidc",
      "video4linux2",
      "viv",
      "vividas",
      "vivo",
      "vmd",
      "vobsub",
      "voc",
      "vpk",
      "vplayer",
      "vqe",
      "vqf",
      "vql",
      "vt",
      "vtt",
      "vvc",
      "w64",
      "wa",
      "wav",
      "way",
      "wc3movie",
      "webm",
      "webp",
      "webvtt",
      "wow",
      "wsaud",
      "wsd",
      "wsvqa",
      "wtv",
      "wv",
      "wve",
      "x11grab",
      "xa",
      "xbin",
      "xl",
      "xm",
      "xmd",
      "xmv",
      "xpk",
      "xvag",
      "xwma",
      "y4m",
      "yop",
      "yuv",
      "yuv10",
    ],
  },
  to: {
    muxer: [
      "264",
      "265",
      "266",
      "302",
      "3g2",
      "3gp",
      "a64",
      "aac",
      "ac3",
      "ac4",
      "adts",
      "adx",
      "afc",
      "aif",
      "aifc",
      "aiff",
      "al",
      "amr",
      "amv",
      "apm",
      "apng",
      "aptx",
      "aptxhd",
      "asf",
      "ass",
      "ast",
      "au",
      "aud",
      "av1.mkv",
      "av1.mp4",
      "avi",
      "avif",
      "avs",
      "avs2",
      "avs3",
      "bit",
      "bmp",
      "c2",
      "caf",
      "cavs",
      "chk",
      "cpk",
      "cvg",
      "dfpwm",
      "dnxhd",
      "dnxhr",
      "dpx",
      "drc",
      "dts",
      "dv",
      "dvd",
      "eac3",
      "ec3",
      "evc",
      "exr",
      "f4v",
      "ffmeta",
      "fits",
      "flac",
      "flm",
      "flv",
      "g722",
      "gif",
      "gsm",
      "gxf",
      "h261",
      "h263",
      "h264.mkv",
      "h264.mp4",
      "h265.mkv",
      "h265.mp4",
      "h266.mkv",
      "hdr",
      "hevc",
      "ico",
      "im1",
      "im24",
      "im8",
      "ircam",
      "isma",
      "ismv",
      "ivf",
      "j2c",
      "j2k",
      "jls",
      "jp2",
      "jpeg",
      "jpg",
      "js",
      "jss",
      "jxl",
      "latm",
      "lbc",
      "ljpg",
      "loas",
      "lrc",
      "m1v",
      "m2a",
      "m2t",
      "m2ts",
      "m2v",
      "m3u8",
      "m4a",
      "m4b",
      "m4v",
      "mjpeg",
      "mjpg",
      "mkv",
      "mlp",
      "mmf",
      "mov",
      "mp2",
      "mp3",
      "mp4",
      "mpa",
      "mpd",
      "mpeg",
      "mpg",
      "msbc",
      "mts",
      "mxf",
      "nut",
      "obu",
      "oga",
      "ogg",
      "ogv",
      "oma",
      "opus",
      "pam",
      "pbm",
      "pcm",
      "pcx",
      "pfm",
      "pgm",
      "pgmyuv",
      "phm",
      "pix",
      "png",
      "ppm",
      "psp",
      "qoi",
      "ra",
      "ras",
      "rco",
      "rcv",
      "rgb",
      "rm",
      "roq",
      "rs",
      "rso",
      "sb",
      "sbc",
      "scc",
      "sf",
      "sgi",
      "sox",
      "spdif",
      "spx",
      "srt",
      "ssa",
      "sub",
      "sun",
      "sunras",
      "sup",
      "sw",
      "swf",
      "tco",
      "tga",
      "thd",
      "tif",
      "tiff",
      "ts",
      "tta",
      "ttml",
      "tun",
      "ub",
      "ul",
      "uw",
      "vag",
      "vbn",
      "vc1",
      "vc2",
      "vob",
      "voc",
      "vtt",
      "vvc",
      "w64",
      "wav",
      "wbmp",
      "webm",
      "webp",
      "wma",
      "wmv",
      "wtv",
      "wv",
      "xbm",
      "xface",
      "xml",
      "xwd",
      "y",
      "y4m",
      "yuv",
    ],
  },
};

// CUDA-supported codec names (as detected by ffprobe)
const cudaSupportedCodecs = new Set(["h264", "hevc", "vp9", "vp8", "mpeg2video", "mpeg4", "av1"]);

// Known image formats that should skip ffprobe (no video codec to detect)
const imageFormats = new Set([
  "jpg",
  "jpeg",
  "png",
  "gif",
  "bmp",
  "webp",
  "ico",
  "tiff",
  "tif",
  "svg",
  "avif",
  "jxl",
  "heic",
  "heif",
  "raw",
  "cr2",
  "nef",
  "orf",
  "sr2",
  "arw",
  "dng",
  "psd",
  "xcf",
  "exr",
  "hdr",
]);

// Cache NVIDIA GPU availability to avoid repeated checks
let nvidiaGpuAvailable: boolean | null = null;

// Export for testing (allows resetting cache between tests)
export const resetNvidiaGpuCache = () => {
  nvidiaGpuAvailable = null;
};

/**
 * Checks if an NVIDIA GPU is available using nvidia-smi.
 * Returns false if no GPU is available or nvidia-smi fails.
 */
async function checkNvidiaGpuAvailable(execFile: ExecFileFn = execFileOriginal): Promise<boolean> {
  // Cache the result to avoid repeated checks
  if (nvidiaGpuAvailable !== null) {
    return nvidiaGpuAvailable;
  }

  try {
    await new Promise<void>((resolve, reject) => {
      execFile(
        "nvidia-smi",
        ["-L"], // List GPUs (simple check that succeeds if GPU is available)
        (error) => {
          if (error) {
            reject(error);
            return;
          }
          resolve();
        },
      );
    });

    // If nvidia-smi succeeds, GPU is available
    nvidiaGpuAvailable = true;
    console.log("NVIDIA GPU detected - hardware acceleration available");
    return true;
  } catch (error) {
    // nvidia-smi failed - no GPU available or not installed
    console.warn("NVIDIA GPU not available - using software encoding/decoding:", error);
    nvidiaGpuAvailable = false;
    return false;
  }
}

/**
 * Uses ffprobe to detect if the video codec in a file is supported by CUDA hardware acceleration.
 * Returns false for image formats without probing (performance optimization).
 * Falls back to false if probing fails (safe default).
 */
async function isCudaSupportedCodec(
  filePath: string,
  fileType: string,
  execFile: ExecFileFn = execFileOriginal,
): Promise<boolean> {
  // Skip ffprobe for known image formats (no video codec to detect)
  if (imageFormats.has(fileType.toLowerCase())) {
    console.log(`Skipping CUDA detection for image format: ${fileType}`);
    return false;
  }

  try {
    // Wrap execFile callback in a Promise for async/await
    const stdout = await new Promise<string>((resolve, reject) => {
      execFile(
        "ffprobe",
        ["-v", "quiet", "-print_format", "json", "-show_streams", filePath],
        (error, stdout) => {
          if (error) {
            reject(error);
            return;
          }
          resolve(stdout);
        },
      );
    });

    const probeData = JSON.parse(stdout);
    const videoStream = probeData.streams?.find(
      (s: { codec_type?: string }) => s.codec_type === "video",
    );

    if (!videoStream || !videoStream.codec_name) {
      return false;
    }

    const codecName = videoStream.codec_name.toLowerCase();
    const isSupported = cudaSupportedCodecs.has(codecName);
    if (isSupported) {
      console.log(`CUDA-supported codec detected: ${codecName} in ${filePath}`);
    } else {
      console.log(
        `Codec not CUDA-supported: ${codecName} in ${filePath} - using software decoding`,
      );
    }
    return isSupported;
  } catch (error) {
    // If probing fails, fall back to conservative approach (no CUDA)
    console.warn(`Failed to probe codec for ${filePath}:`, error);
    return false;
  }
}

export async function convert(
  filePath: string,
  fileType: string,
  convertTo: string,
  targetPath: string,
  options?: unknown,
  execFile: ExecFileFn = execFileOriginal, // to make it mockable
): Promise<string> {
  let extraArgs: string[] = [];
  let message = "Done";

  // Check if hardware encoding is preferred (NVENC, VAAPI, etc.)
  const preferHardware =
    process.env.FFMPEG_PREFER_HARDWARE === "true" || process.env.FFMPEG_PREFER_HARDWARE === "1";

  // Check GPU availability if hardware is preferred
  const gpuAvailable = preferHardware ? await checkNvidiaGpuAvailable(execFile) : false;

  if (preferHardware && gpuAvailable) {
    console.log("Hardware acceleration enabled for conversion");
  } else if (preferHardware && !gpuAvailable) {
    console.log("Hardware acceleration requested but GPU not available - using software");
  } else {
    console.log("Using software encoding/decoding (hardware not preferred)");
  }

  if (convertTo === "ico") {
    // Make sure image is 256x256 or smaller
    extraArgs = [
      "-filter:v",
      "scale='min(256,iw)':min'(256,ih)':force_original_aspect_ratio=decrease",
    ];
    message = "Done: resized to 256x256";
  }

  if (convertTo.split(".").length > 1) {
    // Support av1.mkv and av1.mp4 and h265.mp4 etc.
    const split = convertTo.split(".");
    const codec_short = split[0];

    switch (codec_short) {
      case "av1":
        extraArgs.push("-c:v", "libaom-av1");
        break;
      case "h264":
        if (preferHardware) {
          extraArgs.push("-c:v", "h264_nvenc");
        } else {
          extraArgs.push("-c:v", "libx264");
        }
        break;
      case "h265":
        if (preferHardware) {
          extraArgs.push("-c:v", "hevc_nvenc");
        } else {
          extraArgs.push("-c:v", "libx265");
        }
        break;
      case "h266":
        extraArgs.push("-c:v", "libx266");
        break;
    }
  }

  // Parse FFMPEG_ARGS environment variable into array
  const ffmpegArgs = process.env.FFMPEG_ARGS ? process.env.FFMPEG_ARGS.split(/\s+/) : [];

  // If hardware is preferred, check if the codec supports CUDA hardware acceleration
  // This only applies if FFMPEG_ARGS doesn't already specify a hardware accelerator
  const hasHardwareAccel = ffmpegArgs.includes("-hwaccel");

  if (preferHardware && !hasHardwareAccel) {
    const supportsCuda = await isCudaSupportedCodec(filePath, fileType, execFile);
    if (supportsCuda) {
      ffmpegArgs.push("-hwaccel", "cuda");
      console.log("Added CUDA hardware acceleration for input decoding");
    } else {
      console.log("CUDA not supported for input file - using software decoding");
    }
  }

  const ffmpegOutputArgs = process.env.FFMPEG_OUTPUT_ARGS
    ? process.env.FFMPEG_OUTPUT_ARGS.split(/\s+/)
    : [];

  return new Promise((resolve, reject) => {
    execFile(
      "ffmpeg",
      [...ffmpegArgs, "-i", filePath, ...ffmpegOutputArgs, ...extraArgs, targetPath],
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

        resolve(message);
      },
    );
  });
}

import { execFile as execFileOriginal } from "node:child_process";
import { ExecFileFn } from "./types";

export const properties = {
  from: {
    object: [
      "3d",
      "3ds",
      "3mf",
      "ac",
      "ac3d",
      "acc",
      "amf",
      "amj",
      "ase",
      "ask",
      "assbin",
      "b3d",
      "blend",
      "bsp",
      "bvh",
      "cob",
      "csm",
      "dae",
      "dxf",
      "enff",
      "fbx",
      "glb",
      "gltf",
      "hmb",
      "hmp",
      "ifc",
      "ifczip",
      "iqm",
      "irr",
      "irrmesh",
      "lwo",
      "lws",
      "lxo",
      "m3d",
      "md2",
      "md3",
      "md5anim",
      "md5camera",
      "md5mesh",
      "mdc",
      "mdl",
      "mesh.xml",
      "mesh",
      "mot",
      "ms3d",
      "ndo",
      "nff",
      "obj",
      "off",
      "ogex",
      "pk3",
      "ply",
      "pmx",
      "prj",
      "q3o",
      "q3s",
      "raw",
      "scn",
      "sib",
      "smd",
      "step",
      "stl",
      "stp",
      "ter",
      "uc",
      "usd",
      "usda",
      "usdc",
      "usdz",
      "vta",
      "x",
      "x3d",
      "x3db",
      "xgl",
      "xml",
      "zae",
      "zgl",
    ],
  },
  to: {
    object: [
      "3ds",
      "3mf",
      "assbin",
      "assjson",
      "assxml",
      "collada",
      "dae",
      "fbx",
      "fbxa",
      "glb",
      "glb2",
      "gltf",
      "gltf2",
      "json",
      "obj",
      "objnomtl",
      "pbrt",
      "ply",
      "plyb",
      "stl",
      "stlb",
      "stp",
      "x",
    ],
  },
};

export async function convert(
  filePath: string,
  fileType: string,
  convertTo: string,
  targetPath: string,
  options?: unknown,
  execFile: ExecFileFn = execFileOriginal, // to make it mockable
): Promise<string> {
  return new Promise((resolve, reject) => {
    execFile("assimp", ["export", filePath, targetPath], (error, stdout, stderr) => {
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

import { exec } from "node:child_process";

// This could be done dynamically by running `ffmpeg -formats` and parsing the output
export const properties = {
  from: {
    muxer: [
        "3d",
        "3ds",
        "3mf",
        "ac",
        "ac3d",
        "acc",
        "amf",
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
        "hmp",
        "ifc",
        "ifczip",
        "iqm",
        "irr",
        "irrmesh",
        "lwo",
        "lws",
        "lxo",
        "md2",
        "md3",
        "md5anim",
        "md5camera",
        "md5mesh",
        "mdc",
        "mdl",
        "mesh",
        "mesh.xml",
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
    muxer: [
        "collada",
        "x",
        "stp",
        "obj",
        "objnomtl",
        "stl",
        "stlb",
        "ply",
        "plyb",
        "3ds",
        "gltf2",
        "glb2",
        "gltf",
        "glb",
        "assbin",
        "assxml",
        "x3d",
        "fbx",
        "fbxa",
        "m3d",
        "m3da",
        "3mf",
        "pbrt",
        "assjson",
    ],
  },
};

export async function convert(
  filePath: string,
  fileType: string,
  convertTo: string,
  targetPath: string,
  // biome-ignore lint/suspicious/noExplicitAny: <explanation>
  options?: any,
): Promise<string> {
  // let command = "ffmpeg";


  const command = `assimp export "${filePath}" "${targetPath}"`;

  return new Promise((resolve, reject) => {
    exec(command, (error, stdout, stderr) => {
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
    });
  });
}

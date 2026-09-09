import {
  execFile as execFileOriginal,
  type ChildProcess,
  type ExecFileOptions,
} from "node:child_process";

export type ExecFileCallback = (err: Error | null, stdout: string, stderr: string) => void;

export type ExecFileFn = (
  cmd: string,
  args: string[],
  ...argsOrOptions:
    [callback: ExecFileCallback] | [options: ExecFileOptions, callback: ExecFileCallback]
) => ChildProcess | void;

export const defaultExecFile: ExecFileFn = execFileOriginal as unknown as ExecFileFn;

export type ConvertFnWithExecFile = (
  filePath: string,
  fileType: string,
  convertTo: string,
  targetPath: string,
  options: unknown,
  execFileOverride?: ExecFileFn,
) => Promise<string>;

export type ExecFileFn = (
  cmd: string,
  args: string[],
  options: import("child_process").ExecFileOptions | unknown | undefined | null,
  callback: (err: Error | null, stdout: string, stderr: string) => void,
) => void;

export type ConvertFnWithExecFile = (
  filePath: string,
  fileType: string,
  convertTo: string,
  targetPath: string,
  options: unknown,
  execFileOverride?: ExecFileFn,
) => Promise<string>;

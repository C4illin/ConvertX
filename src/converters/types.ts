export type ExecFileFn = (
  cmd: string,
  args: string[],
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

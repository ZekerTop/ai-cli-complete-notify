import { Command } from '@tauri-apps/plugin-shell';

export async function sidecar(args: string[]): Promise<{ stdout: string; stderr: string; code: number }> {
  const cmd = Command.sidecar('binaries/ai-reminder', args);
  const output = await cmd.execute();
  return {
    stdout: output.stdout,
    stderr: output.stderr,
    code: output.code ?? 0,
  };
}

export function spawnSidecar(
  args: string[],
  onStdout?: (line: string) => void,
  onStderr?: (line: string) => void,
) {
  const cmd = Command.sidecar('binaries/ai-reminder', args);
  if (onStdout) cmd.stdout.on('data', onStdout);
  if (onStderr) cmd.stderr.on('data', onStderr);
  return cmd.spawn();
}

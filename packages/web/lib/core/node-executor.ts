export function getNodeExecutor(env: NodeJS.ProcessEnv = process.env): string {
  const configured = env.MINDOS_NODE_BIN?.trim();
  return configured || process.execPath;
}

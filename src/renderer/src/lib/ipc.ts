const api = window.electronAPI;

export function invoke<T = unknown>(channel: string, ...args: unknown[]): Promise<T> {
  return api.invoke(channel, ...args) as Promise<T>;
}

export function send(channel: string, ...args: unknown[]): void {
  api.send(channel, ...args);
}

export function on(channel: string, callback: (...args: unknown[]) => void): () => void {
  return api.on(channel, callback);
}

export function once(channel: string, callback: (...args: unknown[]) => void): void {
  api.once(channel, callback);
}

type Listener = () => void;
const listeners: Record<string, Listener[]> = {};

export function emit(event: string) {
  listeners[event]?.forEach((fn) => fn());
}

export function on(event: string, fn: Listener): () => void {
  if (!listeners[event]) listeners[event] = [];
  listeners[event].push(fn);
  return () => {
    listeners[event] = listeners[event].filter((l) => l !== fn);
  };
}

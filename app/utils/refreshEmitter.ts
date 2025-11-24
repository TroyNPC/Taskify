// app/utils/refreshEmitter.ts
type Handler = (...args: any[]) => void;

const listeners: Record<string, Set<Handler>> = {};

const emitter = {
  on(event: string, fn: Handler) {
    if (!listeners[event]) listeners[event] = new Set();
    listeners[event].add(fn);
    // return unsubscribe function
    return () => listeners[event]?.delete(fn);
  },

  off(event: string, fn: Handler) {
    listeners[event]?.delete(fn);
  },

  emit(event: string, ...args: any[]) {
    const set = listeners[event];
    if (!set) return;
    Array.from(set).forEach((fn) => {
      try {
        fn(...args);
      } catch (e) {
        console.warn('emitter handler error', e);
      }
    });
  }
};

export { emitter }; // named
export default emitter; // default (extra safety)

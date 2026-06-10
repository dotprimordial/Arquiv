const logger = {
  debug: (...args: unknown[]) => {
    if (process.env.NODE_ENV !== 'production') {
      console.debug('[logger]', ...args);
    }
  },
  info: (...args: unknown[]) => console.info('[logger]', ...args),
  warn: (...args: unknown[]) => console.warn('[logger]', ...args),
  error: (...args: unknown[]) => console.error('[logger]', ...args),
};

export default logger;

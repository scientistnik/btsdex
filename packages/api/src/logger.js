var logger = {
  info: null,
  warn: null,
  error: console.error,
  debug: null
};

export const setLogger = (obj = logger) => {
  let { info, warn, error, debug } = obj;
  logger = { info, warn, error, debug };
};

export const info = (...args) => logger.info && logger.info(...args);
export const warn = (...args) => logger.warn && logger.warn(...args);
export const error = (...args) => logger.error && logger.error(...args);
export const debug = (...args) => logger.debug && logger.debug(...args);

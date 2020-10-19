const winston = require("winston");
const { createLogger, format, transports } = require("winston");
const { combine, timestamp, colorize, printf } = format;

const myFormat = printf(({ level, message, timestamp }) => {
  return `${timestamp} [${level}]: ${message}`;
});

const logger = createLogger({
  format: combine(timestamp(), colorize(), myFormat),
  transports: [new transports.Console()],
});

winston.addColors({
  error: "red",
  warn: "yellow",
  info: "cyan",
  debug: "green",
});

module.exports = logger;

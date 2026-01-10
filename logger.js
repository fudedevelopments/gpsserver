/**
 * Winston Logger Configuration
 * Provides structured logging with different levels
 */

const winston = require('winston');
const chalk = require('chalk');

// Custom format for console output with colors
const consoleFormat = winston.format.printf(({ level, message, timestamp, ...meta }) => {
  let coloredLevel;
  
  switch (level) {
    case 'error':
      coloredLevel = chalk.red.bold('ERROR');
      break;
    case 'warn':
      coloredLevel = chalk.yellow.bold('WARN');
      break;
    case 'info':
      coloredLevel = chalk.blue.bold('INFO');
      break;
    case 'debug':
      coloredLevel = chalk.gray.bold('DEBUG');
      break;
    default:
      coloredLevel = level.toUpperCase();
  }

  let metaStr = '';
  if (Object.keys(meta).length > 0) {
    metaStr = '\n' + JSON.stringify(meta, null, 2);
  }

  return `${chalk.gray(timestamp)} [${coloredLevel}] ${message}${metaStr}`;
});

// Create logger instance
const logger = winston.createLogger({
  level: process.env.LOG_LEVEL || 'info',
  format: winston.format.combine(
    winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
    winston.format.errors({ stack: true }),
    winston.format.splat()
  ),
  transports: [
    // Console output with colors
    new winston.transports.Console({
      format: winston.format.combine(
        winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
        consoleFormat
      )
    }),
    // File output for errors
    new winston.transports.File({
      filename: 'logs/error.log',
      level: 'error',
      format: winston.format.combine(
        winston.format.timestamp(),
        winston.format.json()
      )
    }),
    // File output for all logs
    new winston.transports.File({
      filename: 'logs/combined.log',
      format: winston.format.combine(
        winston.format.timestamp(),
        winston.format.json()
      )
    })
  ]
});

module.exports = logger;

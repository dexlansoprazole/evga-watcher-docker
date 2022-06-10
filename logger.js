import dotenv from 'dotenv';
if (process.env.NODE_ENV !== 'production')
  dotenv.config();

import winston from 'winston';
import moment from 'moment-timezone';

export const DATA_PATH = process.env.DATA_PATH || '/data'
const {combine, timestamp, printf} = winston.format;
const logConsoleFormat = printf(({timestamp, level, message}) => {
  return `[${moment(timestamp).format("yyyy-MM-DD HH:mm:ss")}][${level}]: ${message}`;
});
export const logger = winston.createLogger({
  level: 'info',
  format: combine(
    timestamp(),
    winston.format.errors({stack: true}),
    winston.format.json()
  ),
  transports: [
    new winston.transports.File({
      filename: `${DATA_PATH}/error.log`,
      level: 'error',
      maxsize: '10240000',
      maxFiles: '2',
      tailable: 'true'
    }),
    new winston.transports.File({
      filename: `${DATA_PATH}/combined.log`,
      maxsize: '10240000',
      maxFiles: '2',
      tailable: 'true'
    }),
  ],
  // exceptionHandlers: [
  //   new winston.transports.File({filename: `${DATA_PATH}/exceptions.log`})
  // ]
});
if (process.env.NODE_ENV !== 'production') {
  logger.add(new winston.transports.Console({
    level: 'debug',
    format: combine(timestamp(), logConsoleFormat),
  }));
}
logger.info(`NODE_ENV: ${process.env.NODE_ENV}`);

export default logger;
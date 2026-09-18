import { appendFileSync, mkdirSync } from "node:fs";
import { dirname, resolve } from "node:path";

const LOG_FILE = resolve("logs/app.log");

mkdirSync(dirname(LOG_FILE), { recursive: true });

const TZ_FORMAT = new Intl.DateTimeFormat("en-CA", {
  timeZone: "Asia/Bangkok",
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
  hour: "2-digit",
  minute: "2-digit",
  second: "2-digit",
  hour12: false,
});

const timestamp = () => TZ_FORMAT.format(new Date()).replace(", ", " ");

export const logger = {
  info(message: string) {
    appendFileSync(LOG_FILE, `${timestamp()} INFO: ${message}\n`);
  },

  warn(message: string) {
    appendFileSync(LOG_FILE, `${timestamp()} WARN: ${message}\n`);
  },

  error(message: string) {
    appendFileSync(LOG_FILE, `${timestamp()} ERROR: ${message}\n`);
  },
};

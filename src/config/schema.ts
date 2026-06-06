import { PlatformConfig } from 'matterbridge';

export interface ChuangmiPlug212a01Config extends PlatformConfig {
  name: string;
  ip: string;
  token: string;
  pollingInterval: number;
  enablePowerMeasurement: boolean;
  debug: boolean;
}

const DEFAULT_NAME = 'Xiaomi Plug';
const DEFAULT_POLLING_INTERVAL = 10_000;
const TOKEN_PATTERN = /^[0-9a-f]{32}$/i;

/**
 * Validates and normalizes the platform configuration.
 *
 * @param {PlatformConfig} config The raw platform configuration.
 * @returns {ChuangmiPlug212a01Config} The validated and normalized configuration.
 */
export function validateConfig(config: PlatformConfig): ChuangmiPlug212a01Config {
  const ip = readString(config, 'ip');
  const token = readString(config, 'token');

  if (ip.length === 0) {
    throw new Error('Missing required config value: ip');
  }

  if (token.length === 0) {
    throw new Error('Missing required config value: token');
  }

  if (!TOKEN_PATTERN.test(token)) {
    throw new Error('Config value token must be a 32 character hexadecimal Xiaomi token');
  }

  const pollingInterval = readOptionalNumber(config, 'pollingInterval', DEFAULT_POLLING_INTERVAL);
  if (!Number.isInteger(pollingInterval) || pollingInterval < DEFAULT_POLLING_INTERVAL) {
    throw new Error(`Config value pollingInterval must be an integer >= ${DEFAULT_POLLING_INTERVAL}`);
  }

  return {
    ...config,
    name: readString(config, 'name') || DEFAULT_NAME,
    ip,
    token,
    pollingInterval,
    enablePowerMeasurement: readOptionalBoolean(config, 'enablePowerMeasurement', false),
    debug: readOptionalBoolean(config, 'debug', false),
  };
}

/**
 * Reads a string value from the platform configuration.
 *
 * @param {PlatformConfig} config The platform configuration.
 * @param {string} key The configuration key to read.
 * @returns {string} The trimmed string value, or an empty string if not found or not a string.
 */
function readString(config: PlatformConfig, key: string): string {
  const value = config[key];
  return typeof value === 'string' ? value.trim() : '';
}

/**
 * Reads an optional boolean value from the platform configuration, falling back to a default value if not specified.
 *
 * @param {PlatformConfig} config The platform configuration.
 * @param {string} key The configuration key to read.
 * @param {boolean} defaultValue The default value to return if the key is not set.
 * @returns {boolean} The boolean value or the default value.
 */
function readOptionalBoolean(config: PlatformConfig, key: string, defaultValue: boolean): boolean {
  const value = config[key];
  return typeof value === 'boolean' ? value : defaultValue;
}

/**
 * Reads an optional number value from the platform configuration, falling back to a default value if not specified.
 *
 * @param {PlatformConfig} config The platform configuration.
 * @param {string} key The configuration key to read.
 * @param {number} defaultValue The default value to return if the key is not set.
 * @returns {number} The numeric value or the default value.
 */
function readOptionalNumber(config: PlatformConfig, key: string, defaultValue: number): number {
  const value = config[key];
  return typeof value === 'number' ? value : defaultValue;
}

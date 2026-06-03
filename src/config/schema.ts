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

function readString(config: PlatformConfig, key: string): string {
  const value = config[key];
  return typeof value === 'string' ? value.trim() : '';
}

function readOptionalBoolean(config: PlatformConfig, key: string, defaultValue: boolean): boolean {
  const value = config[key];
  return typeof value === 'boolean' ? value : defaultValue;
}

function readOptionalNumber(config: PlatformConfig, key: string, defaultValue: number): number {
  const value = config[key];
  return typeof value === 'number' ? value : defaultValue;
}

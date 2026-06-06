import { describe, expect, it } from 'vitest';

import { validateConfig } from '../src/config/schema.js';

describe('validateConfig', () => {
  it('defaults optional values for the chuangmi plug', () => {
    const config = validateConfig({
      name: '',
      type: 'DynamicPlatform',
      version: '1.0.0',
      ip: '192.168.1.50',
      token: '0123456789abcdef0123456789abcdef',
      debug: false,
      unregisterOnShutdown: false,
    });

    expect(config.name).toBe('Xiaomi Plug');
    expect(config.pollingInterval).toBe(10_000);
    expect(config.enablePowerMeasurement).toBe(false);
  });
});

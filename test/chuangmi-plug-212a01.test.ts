import path from 'node:path';

import { jest } from '@jest/globals';
import { MatterbridgeEndpoint, PlatformConfig, PlatformMatterbridge } from 'matterbridge';
import { AnsiLogger } from 'matterbridge/logger';
import { VendorId } from 'matterbridge/matter';

import { validateConfig } from '../src/config/schema.js';
import { ChuangmiPlug212a01Client, MiioModule, MiotSetPropertyReference } from '../src/miot/ChuangmiPlug212a01Client.js';
import { ChuangmiPlug212a01Platform } from '../src/module.js';

const mockLog = {
  fatal: jest.fn(),
  error: jest.fn(),
  warn: jest.fn(),
  notice: jest.fn(),
  info: jest.fn(),
  debug: jest.fn(),
} as unknown as AnsiLogger;

const mockMatterbridge: PlatformMatterbridge = {
  systemInformation: {
    ipv4Address: '192.168.1.1',
    ipv6Address: 'fd78:cbf8:4939:746:a96:8277:346f:416e',
    osRelease: 'x.y.z',
    nodeVersion: '22.13.0',
  },
  rootDirectory: path.join('.cache', 'jest', 'ChuangmiPlug212a01'),
  homeDirectory: path.join('.cache', 'jest', 'ChuangmiPlug212a01'),
  matterbridgeDirectory: path.join('.cache', 'jest', 'ChuangmiPlug212a01', '.matterbridge'),
  matterbridgePluginDirectory: path.join('.cache', 'jest', 'ChuangmiPlug212a01', 'Matterbridge'),
  matterbridgeCertDirectory: path.join('.cache', 'jest', 'ChuangmiPlug212a01', '.mattercert'),
  globalModulesDirectory: path.join('.cache', 'jest', 'ChuangmiPlug212a01', 'node_modules'),
  matterbridgeVersion: '3.5.0',
  matterbridgeLatestVersion: '3.5.0',
  matterbridgeDevVersion: '3.5.0',
  bridgeMode: 'bridge',
  restartMode: '',
  aggregatorVendorId: VendorId(0xfff1),
  aggregatorVendorName: 'Matterbridge',
  aggregatorProductId: 0x8000,
  aggregatorProductName: 'Matterbridge aggregator',
  registerVirtualDevice: jest.fn(),
  addBridgedEndpoint: jest.fn(),
  removeBridgedEndpoint: jest.fn(),
  removeAllBridgedEndpoints: jest.fn(),
} as unknown as PlatformMatterbridge;

const validConfig: PlatformConfig = {
  name: 'Xiaomi Plug',
  type: 'DynamicPlatform',
  version: '1.0.0',
  ip: '192.168.1.50',
  token: '0123456789abcdef0123456789abcdef',
  pollingInterval: 10_000,
  enablePowerMeasurement: false,
  debug: false,
  unregisterOnShutdown: false,
};

describe('ChuangmiPlug212a01Client', () => {
  it('getPower returns true when MIOT value is true', async () => {
    const client = createClient([{ code: 0, value: true }]);
    await expect(client.getPower()).resolves.toBe(true);
  });

  it('getPower returns false when MIOT value is false', async () => {
    const client = createClient([{ code: 0, value: false }]);
    await expect(client.getPower()).resolves.toBe(false);
  });

  it('setPower(true) sends siid 2 / piid 1 / value true', async () => {
    const calls: MiotSetPropertyReference[][] = [];
    const client = createClient([{ code: 0 }], calls);
    await client.setPower(true);
    expect(calls).toEqual([[{ did: 'power', siid: 2, piid: 1, value: true }]]);
  });

  it('setPower(false) sends siid 2 / piid 1 / value false', async () => {
    const calls: MiotSetPropertyReference[][] = [];
    const client = createClient([{ code: 0 }], calls);
    await client.setPower(false);
    expect(calls).toEqual([[{ did: 'power', siid: 2, piid: 1, value: false }]]);
  });

  it('invalid MIOT responses throw a clear error', async () => {
    const client = createClient([{ code: 0, value: 'on' }]);
    await expect(client.getPower()).rejects.toThrow('Malformed MIOT response for power');
  });
});

describe('config validation', () => {
  it('missing ip fails config validation', () => {
    expect(() => validateConfig({ ...validConfig, ip: '' })).toThrow('Missing required config value: ip');
  });

  it('missing token fails config validation', () => {
    expect(() => validateConfig({ ...validConfig, token: '' })).toThrow('Missing required config value: token');
  });
});

describe('ChuangmiPlug212a01Platform', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('does not register more than one Matter device', async () => {
    const client = {
      getPower: jest.fn(async () => true),
      setPower: jest.fn(async (_value: boolean) => {}),
      getElectricPower: jest.fn(async () => 0),
      close: jest.fn(),
    } as unknown as ChuangmiPlug212a01Client;

    const platform = new ChuangmiPlug212a01Platform(mockMatterbridge, mockLog, validConfig, client);
    setMatterNode(platform);
    const registerDeviceSpy = jest.spyOn(platform, 'registerDevice').mockImplementation(async (_device: MatterbridgeEndpoint) => {});

    await platform.onStart('Jest');
    await platform.onShutdown('Jest');

    expect(registerDeviceSpy).toHaveBeenCalledTimes(1);
    expect(platform.getRegisteredPowerStateForTest()).toBe(true);
  });
});

function createClient(response: { code?: number; value?: unknown }[], setCalls: MiotSetPropertyReference[][] = []): ChuangmiPlug212a01Client {
  const miioModule: MiioModule = {
    device: jest.fn(async () => ({
      miioProtocol: {
        call: jest.fn(async (method: 'get_properties' | 'set_properties', params) => {
          if (method === 'set_properties') {
            setCalls.push(params as MiotSetPropertyReference[]);
          }
          return response;
        }),
      },
    })),
  };

  return new ChuangmiPlug212a01Client({
    ip: '192.168.1.50',
    token: '0123456789abcdef0123456789abcdef',
    miioModule,
  });
}

function setMatterNode(platform: ChuangmiPlug212a01Platform): void {
  (platform as any).setMatterNode(
    (mockMatterbridge as any).addBridgedEndpoint.bind(mockMatterbridge),
    (mockMatterbridge as any).removeBridgedEndpoint.bind(mockMatterbridge),
    (mockMatterbridge as any).removeAllBridgedEndpoints.bind(mockMatterbridge),
    (mockMatterbridge as any).registerVirtualDevice.bind(mockMatterbridge),
  );
}

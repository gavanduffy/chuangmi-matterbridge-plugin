import miio from 'miio';

export interface MiotPropertyReference {
  did: string;
  siid: number;
  piid: number;
}

export interface MiotSetPropertyReference extends MiotPropertyReference {
  value: boolean | number | string;
}

export interface MiotPropertyResponse {
  code?: number;
  value?: unknown;
}

export interface MiotProtocol {
  call(method: 'get_properties', params: MiotPropertyReference[]): Promise<MiotPropertyResponse[]>;
  call(method: 'set_properties', params: MiotSetPropertyReference[]): Promise<MiotPropertyResponse[]>;
}

export interface MiioDevice {
  call?: MiotProtocol['call'];
  destroy?: () => void;
  miioProtocol?: MiotProtocol;
}

export interface MiioModule {
  device(options: { address: string; token: string; timeout: number }): Promise<MiioDevice>;
}

export const CHUANGMI_PLUG_212A01 = {
  model: 'chuangmi.plug.212a01',
  deviceName: 'Mi Smart Power Plug 2',
  manufacturer: 'Xiaomi',
  power: { did: 'power', siid: 2, piid: 1 },
  electricPower: { did: 'electric-power', siid: 5, piid: 6 },
} as const;

export class ChuangmiPlug212a01Client {
  private readonly ip: string;
  private readonly token: string;
  private readonly timeout: number;
  private readonly miioModule: MiioModule;
  private device?: MiioDevice;

  constructor(options: { ip: string; token: string; timeout?: number; miioModule?: MiioModule }) {
    this.ip = options.ip;
    this.token = options.token;
    this.timeout = options.timeout ?? 5_000;
    this.miioModule = options.miioModule ?? (miio as MiioModule);
  }

  async getPower(): Promise<boolean> {
    const value = await this.getProperty(CHUANGMI_PLUG_212A01.power);
    if (typeof value !== 'boolean') {
      throw new Error(`Malformed MIOT response for power: expected boolean, got ${typeof value}`);
    }
    return value;
  }

  async setPower(value: boolean): Promise<void> {
    await this.setProperty({ ...CHUANGMI_PLUG_212A01.power, value });
  }

  async getElectricPower(): Promise<number> {
    const value = await this.getProperty(CHUANGMI_PLUG_212A01.electricPower);
    if (typeof value !== 'number' || !Number.isFinite(value)) {
      throw new Error(`Malformed MIOT response for electric power: expected number, got ${typeof value}`);
    }
    return value;
  }

  close(): void {
    this.device?.destroy?.();
    this.device = undefined;
  }

  private async getProperty(reference: MiotPropertyReference): Promise<unknown> {
    const protocol = await this.getProtocol();
    const response = await this.callMiot(async () => protocol.call('get_properties', [reference]), `read siid ${reference.siid} piid ${reference.piid}`);
    return this.extractSuccessfulValue(response, `read siid ${reference.siid} piid ${reference.piid}`);
  }

  private async setProperty(reference: MiotSetPropertyReference): Promise<void> {
    const protocol = await this.getProtocol();
    const response = await this.callMiot(async () => protocol.call('set_properties', [reference]), `write siid ${reference.siid} piid ${reference.piid}`);
    this.assertSuccessfulResponse(response, `write siid ${reference.siid} piid ${reference.piid}`);
  }

  private async getProtocol(): Promise<MiotProtocol> {
    if (!this.device) {
      this.device = await this.callMiot(async () => this.miioModule.device({ address: this.ip, token: this.token, timeout: this.timeout }), `connect to ${this.ip}`);
    }

    if (this.device.miioProtocol) {
      return this.device.miioProtocol;
    }

    if (this.device.call) {
      return { call: this.device.call.bind(this.device) };
    }

    throw new Error('Connected Xiaomi device does not expose a MIOT protocol');
  }

  private async callMiot<T>(operation: () => Promise<T>, context: string): Promise<T> {
    try {
      return await operation();
    } catch (error) {
      throw new Error(`Failed to ${context}: ${error instanceof Error ? error.message : String(error)}`, { cause: error });
    }
  }

  private extractSuccessfulValue(response: MiotPropertyResponse[], context: string): unknown {
    const entry = this.assertSuccessfulResponse(response, context);
    if (!Object.hasOwn(entry, 'value')) {
      throw new Error(`Malformed MIOT response for ${context}: missing value`);
    }
    return entry.value;
  }

  private assertSuccessfulResponse(response: MiotPropertyResponse[], context: string): MiotPropertyResponse {
    if (!Array.isArray(response) || response.length !== 1) {
      throw new Error(`Malformed MIOT response for ${context}: expected one result`);
    }

    const [entry] = response;
    if (!entry || typeof entry !== 'object') {
      throw new Error(`Malformed MIOT response for ${context}: expected object result`);
    }

    if (typeof entry.code === 'number' && entry.code !== 0) {
      throw new Error(`MIOT error for ${context}: code ${entry.code}`);
    }

    return entry;
  }
}

import { MatterbridgeDynamicPlatform, MatterbridgeEndpoint, onOffOutlet, PlatformConfig, PlatformMatterbridge } from 'matterbridge';
import { AnsiLogger, LogLevel } from 'matterbridge/logger';

import { ChuangmiPlug212a01Config, validateConfig } from './config/schema.js';
import { CHUANGMI_PLUG_212A01, ChuangmiPlug212a01Client } from './miot/ChuangmiPlug212a01Client.js';

/**
 * Initializes the Chuangmi Plug plugin.
 *
 * @param {PlatformMatterbridge} matterbridge The Matterbridge platform instance.
 * @param {AnsiLogger} log The logger.
 * @param {PlatformConfig} config The platform configuration.
 * @returns {ChuangmiPlug212a01Platform} The initialized platform instance.
 */
export default function initializePlugin(matterbridge: PlatformMatterbridge, log: AnsiLogger, config: PlatformConfig): ChuangmiPlug212a01Platform {
  return new ChuangmiPlug212a01Platform(matterbridge, log, config);
}

export class ChuangmiPlug212a01Platform extends MatterbridgeDynamicPlatform {
  private readonly plugConfig: ChuangmiPlug212a01Config;
  private readonly client: ChuangmiPlug212a01Client;
  private pollingTimer?: NodeJS.Timeout;
  private outlet?: MatterbridgeEndpoint;
  private lastPower?: boolean;
  private lastElectricPowerWatts?: number;

  constructor(matterbridge: PlatformMatterbridge, log: AnsiLogger, config: PlatformConfig, client?: ChuangmiPlug212a01Client) {
    super(matterbridge, log, config);

    if (typeof this.verifyMatterbridgeVersion !== 'function' || !this.verifyMatterbridgeVersion('3.4.0')) {
      throw new Error(
        `This plugin requires Matterbridge version >= "3.4.0". Please update Matterbridge from ${this.matterbridge.matterbridgeVersion} to the latest version in the frontend.`,
      );
    }

    this.plugConfig = validateConfig(config);
    this.client = client ?? new ChuangmiPlug212a01Client({ ip: this.plugConfig.ip, token: this.plugConfig.token });
    this.log.info(`Initializing ${CHUANGMI_PLUG_212A01.deviceName} platform`);
  }

  override async onStart(reason?: string): Promise<void> {
    this.log.info(`onStart called with reason: ${reason ?? 'none'}`);
    await this.ready;
    await this.clearSelect();
    await this.registerPlug();
    this.startPolling();
  }

  override async onConfigure(): Promise<void> {
    await super.onConfigure();
  }

  override async onChangeLoggerLevel(logLevel: LogLevel): Promise<void> {
    this.log.info(`onChangeLoggerLevel called with: ${logLevel}`);
    await Promise.resolve();
  }

  override async onShutdown(reason?: string): Promise<void> {
    await super.onShutdown(reason);
    this.log.info(`onShutdown called with reason: ${reason ?? 'none'}`);
    this.stopPolling();
    this.client.close();
    if (this.config.unregisterOnShutdown) {
      await this.unregisterAllDevices();
    }
  }

  private async registerPlug(): Promise<void> {
    const currentPower = await this.readAndPublishPower();
    const outlet = this.createOutletEndpoint(currentPower);

    this.setSelectDevice(CHUANGMI_PLUG_212A01.model, CHUANGMI_PLUG_212A01.deviceName);
    if (this.validateDevice([CHUANGMI_PLUG_212A01.deviceName, CHUANGMI_PLUG_212A01.model])) {
      await this.registerDevice(outlet);
      this.outlet = outlet;
    }
  }

  private createOutletEndpoint(currentPower: boolean): MatterbridgeEndpoint {
    const outlet = new MatterbridgeEndpoint(onOffOutlet, { id: CHUANGMI_PLUG_212A01.model })
      .createDefaultBridgedDeviceBasicInformationClusterServer(
        this.plugConfig.name || CHUANGMI_PLUG_212A01.deviceName,
        CHUANGMI_PLUG_212A01.model,
        this.matterbridge.aggregatorVendorId,
        CHUANGMI_PLUG_212A01.manufacturer,
        CHUANGMI_PLUG_212A01.deviceName,
        21_201,
        '1.0.0',
      )
      .createDefaultPowerSourceWiredClusterServer()
      .createDefaultOnOffClusterServer(currentPower)
      .addRequiredClusterServers()
      .addCommandHandler('on', async () => {
        await this.client.setPower(true);
        this.publishPower(true);
      })
      .addCommandHandler('off', async () => {
        await this.client.setPower(false);
        this.publishPower(false);
      });

    if (this.plugConfig.enablePowerMeasurement) {
      outlet.createDefaultElectricalPowerMeasurementClusterServer(null, null, null, null);
    }

    return outlet;
  }

  private startPolling(): void {
    this.stopPolling();
    this.pollingTimer = setInterval(() => {
      void this.pollPower();
    }, this.plugConfig.pollingInterval);
  }

  private stopPolling(): void {
    if (this.pollingTimer) {
      clearInterval(this.pollingTimer);
      this.pollingTimer = undefined;
    }
  }

  private async pollPower(): Promise<void> {
    try {
      await this.readAndPublishPower();
      if (this.plugConfig.enablePowerMeasurement) {
        const watts = await this.client.getElectricPower();
        this.lastElectricPowerWatts = watts;
        if (this.outlet) {
          void this.outlet.updateAttribute('electricalPowerMeasurement', 'activePower', Math.round(watts * 1000));
        }
        this.log.debug(`Current electric power: ${watts} W`);
      }
    } catch (error) {
      this.log.warn(`Failed to poll ${CHUANGMI_PLUG_212A01.deviceName}: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  private async readAndPublishPower(): Promise<boolean> {
    const power = await this.client.getPower();
    this.publishPower(power);
    return power;
  }

  private publishPower(power: boolean): void {
    this.lastPower = power;
    if (this.outlet) {
      void this.setOnOffAttribute(this.outlet, power);
    }
  }

  private async setOnOffAttribute(outlet: MatterbridgeEndpoint, value: boolean): Promise<void> {
    await outlet.setAttribute('onOff', 'onOff', value);
  }

  getRegisteredPowerStateForTest(): boolean | undefined {
    return this.lastPower;
  }

  getRegisteredElectricPowerWattsForTest(): number | undefined {
    return this.lastElectricPowerWatts;
  }
}

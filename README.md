# Matterbridge Chuangmi Plug 212a01

Dedicated Matterbridge plugin for one Xiaomi device model:

`chuangmi.plug.212a01` / Mi Smart Power Plug 2

The plugin exposes the plug as a single Matter OnOff Outlet. It uses local Xiaomi IP/token MIOT control only. It does not use MiCloud, Homebridge, discovery, or any generic Xiaomi bridge layer.

## Supported Mapping

| Matter feature       | Xiaomi MIOT property                                  | Status                          |
| -------------------- | ----------------------------------------------------- | ------------------------------- |
| Outlet on/off read   | `siid: 2`, `piid: 1`                                  | Supported                       |
| Outlet on/off write  | `siid: 2`, `piid: 1`                                  | Supported                       |
| Basic information    | Xiaomi / Mi Smart Power Plug 2 / chuangmi.plug.212a01 | Supported                       |
| Wired power source   | Matter power source cluster                           | Supported                       |
| Electric power watts | `siid: 5`, `piid: 6`                                  | Polled/logged only when enabled |

LED indicator and timer/countdown MIOT features are intentionally not exposed.

## Configuration

```json
{
  "name": "Xiaomi Plug",
  "type": "DynamicPlatform",
  "ip": "192.168.1.50",
  "token": "YOUR_32_CHARACTER_HEX_TOKEN",
  "pollingInterval": 10000,
  "enablePowerMeasurement": false,
  "debug": false
}
```

Required:

- `ip`: local IP address of the plug.
- `token`: 32 character hexadecimal Xiaomi local token.

Optional:

- `name`: display name. Defaults to `Xiaomi Plug`.
- `pollingInterval`: state polling interval in milliseconds. Defaults to `10000`; lower values are rejected.
- `enablePowerMeasurement`: reads `electric-power` during polling and logs watts. Defaults to `false`.
- `debug`: standard Matterbridge debug flag.

## Limitations

Power measurement is not registered as a Matter electrical measurement cluster in this version because the installed Matterbridge template API does not expose a stable helper for it. Enabling `enablePowerMeasurement` reads MIOT `siid: 5`, `piid: 6` and logs the value, but the core Matter device remains one OnOff Outlet.

## Development

```bash
npm install
npm run build
npm test
npm run lint
```

Runtime smoke test:

```bash
matterbridge -add ./chuangmi-matterbridge-plugin
matterbridge
```

Confirm in your Matter controller that exactly one outlet appears, on/off commands work, and state updates after physical or external changes.

# HCI UART Tool

A small web app that talks to a Bluetooth® evaluation kit (e.g. CYBT-353027-EVAL) over UART using HCI commands:

- **HCI Reset**, waiting for its Command Complete event
- **Read BD_ADDR**
- **Write BD_ADDR** (vendor-specific command `0xFC01`), with input validation

Built with **TypeScript + Angular** and the browser's **Web Serial API**.

## Requirements

| | |
|---|---|
| Node.js | 22.22+ or 24.15+ (LTS) |
| Browser | Desktop **Chrome**, **Edge** or **Opera** (Web Serial is not available in Firefox or Safari) |
| Board | Connected over USB; the app uses **115200 bps**, 8N1, RTS/CTS flow control |

### Platform notes

- **Windows** — the board should appear as a `COMx` port. If it does not, install the FTDI VCP driver ([ftdichip.com/drivers](https://ftdichip.com/drivers/)); Windows Update usually installs it automatically.
- **Ubuntu Linux** — the driver is part of the kernel. Allow your user to access serial ports, then log out and back in:
  ```bash
  sudo usermod -aG dialout $USER
  ```
  Use Google Chrome from the `.deb` package; a sandboxed (snap) browser may not be allowed to open serial ports.
- **macOS** — no driver needed; the board shows up as `/dev/cu.usbmodem…` or `/dev/cu.usbserial…`.

## Getting started

```bash
npm ci
npm start
```

Open http://localhost:4200 in Chrome, then:

1. Click **Connect** and pick the board's port. If the kit exposes two ports, use the one that answers HCI Reset.
2. **HCI Reset** → "Command Complete, status Success".
3. **Read BD_ADDR** → shows the current address, e.g. `20:70:6A:20:5B:E0`.
4. Type a new address (`112233445566`, `11:22:33:44:55:66` or `11-22-33-44-55-66`) and press **Write BD_ADDR**. The app writes it and reads it back to confirm.

## Build and test

```bash
npm run build   # production build in dist/hci-uart-tool/browser
npm test        # unit tests (Vitest)
```

The build is a static site. Serve it from `localhost` or over HTTPS (Web Serial requires a secure context), for example:

```bash
npx http-server dist/hci-uart-tool/browser
```

## How it works

```
App (UI)            src/app/app.ts              buttons, validation, messages, log
  │
HciService          src/app/hci.service.ts      one command at a time, waits for its Command Complete (2 s timeout)
  │
SerialService       src/app/serial.service.ts   Web Serial: open port, write bytes, read loop
  │
hci/ (pure functions, no Angular)
  hci-commands.ts   build command packets            01 03 0C 00
  hci-parser.ts     cut incoming bytes into events   04 0E 04 01 03 0C 00 → { opcode, status, params }
  bd-addr.ts        validate / format BD_ADDR
  hci-log.ts        readable log entries in the same format as the task's example
```

### Design decisions

- **Web Serial instead of Qt.** It keeps the solution to a single small app with no native modules or backend, and it runs the same on Windows, Linux and macOS. Angular CLI is the build system.
- **Non-blocking by design.** Serial I/O in Web Serial is asynchronous (Streams + Promises): the browser reads and writes the port off the UI thread, and the app only `await`s results. No extra threads are needed and the UI stays responsive while waiting. Buttons are disabled while a command is running.
- **UART is a byte stream, not a message stream.** Responses often arrive in pieces (`04 0E 04 01` + `03 0C 00`). The parser buffers bytes and emits an event only when the packet is complete, using the length byte from its header.
- **One command at a time, matched by opcode, with a timeout.** The kit reports `Num_HCI_Command_Packets = 1`. A response counts only if its opcode matches the pending command; a non-zero status or no answer within 2 s is shown as an error.
- **Byte order in one place.** Opcodes and BD_ADDR go over the wire least significant byte first. Only the command builder and the BD_ADDR formatter deal with that.
- **Input is validated before anything is sent.** An invalid BD_ADDR shows an error and nothing goes to the device.

### Tests

44 unit tests. Most expectations are taken directly from the example log in the task: command bytes, responses, the BD_ADDR read back after a write, and the log format. They also cover responses split across chunks, garbage bytes, non-zero status, timeouts and invalid input. `SerialService` is a thin wrapper over the browser API and was checked manually on a real CYBT-353027-EVAL.

## Example session

```
10/23/26 23:43:53.120 UART@115200 c> Write_BD_ADDR
HCI Command
[01 FC 06]: 66 55 44 33 22 11
opcode = 0xFC01 (64513, "Write_BD_ADDR")
BD_ADDR = "112233445566"

10/23/26 23:43:53.124 UART@115200 <c Write_BD_ADDR
HCI Command Complete Event
[0E 04]: 01 01 FC 00
event = 0x0E (14, "Command Complete")
Num_HCI_Command_Packets = 0x1 (1)
Command_Opcode = 0xFC01 (64513, "Write_BD_ADDR")
Status = 0x0 (0, "Success")
```

## Limitations

- Works only in Chromium-based desktop browsers (Web Serial).
- Browsers do not expose port names such as `COM38`, so the log shows `UART@115200`.
- On many controllers the address set by Write BD_ADDR is kept only until power-off.
- The parser resynchronises by skipping bytes until it sees `0x04`; a stray `0x04` in noise could be mistaken for a packet start. Sending HCI Reset after connecting brings the stream back to a clean state.

## References

- Bluetooth Core Specification 6.2, [Vol 4, Part A: UART Transport Layer](https://www.bluetooth.com/wp-content/uploads/Files/Specification/HTML/Core-62/out/en/host-controller-interface/uart-transport-layer.html)
- Vol 4, Part E: [7.3.2 Reset](https://www.bluetooth.com/wp-content/uploads/Files/Specification/HTML/Core-62/out/en/host-controller-interface/host-controller-interface-functional-specification.html#UUID-b0aaafb1-0601-865c-2703-4f4caa4dee2e), [7.4.6 Read BD_ADDR](https://www.bluetooth.com/wp-content/uploads/Files/Specification/HTML/Core-62/out/en/host-controller-interface/host-controller-interface-functional-specification.html#UUID-151a8bec-71be-df54-2043-92d366376c53), [7.7.14 Command Complete event](https://www.bluetooth.com/wp-content/uploads/Files/Specification/HTML/Core-62/out/en/host-controller-interface/host-controller-interface-functional-specification.html#UUID-76d31a33-1a9e-07bc-87c4-8ebffee065fd)

import { Opcode } from './hci-commands';
import { CommandComplete } from './hci-parser';
import { toHex } from './hex';

// Turns HCI packets into readable entries in the same format as the log in the task.

const COMMAND_NAMES: Record<number, string> = {
  [Opcode.Reset]: 'Reset',
  [Opcode.ReadBdAddr]: 'Read_BD_ADDR',
  [Opcode.WriteBdAddr]: 'Write_BD_ADDR',
};

// A few codes from Core Spec Vol 1, Part F; the rest are shown as "Error".
const STATUS_NAMES: Record<number, string> = {
  0x00: 'Success',
  0x01: 'Unknown HCI Command',
  0x12: 'Invalid HCI Command Parameters',
};

export function commandName(opcode: number): string {
  return COMMAND_NAMES[opcode] ?? 'Unknown';
}

// 0x0C03 (3075, "Reset")
function describeOpcode(opcode: number): string {
  return `0x${opcode.toString(16).toUpperCase().padStart(4, '0')} (${opcode}, "${commandName(opcode)}")`;
}

// BD_ADDR goes over the wire least significant byte first; the log shows it most significant first.
function describeBdAddr(bytesFromWire: Uint8Array): string {
  return `BD_ADDR = "${toHex(bytesFromWire.slice().reverse(), '')}"`;
}

// [header]: params, e.g. "[01 FC 06]: 66 55 44 33 22 11"
function describeBytes(header: Uint8Array, params: Uint8Array): string {
  return params.length > 0 ? `[${toHex(header)}]: ${toHex(params)}` : `[${toHex(header)}]`;
}

export function describeCommand(command: Uint8Array): string[] {
  const opcode = command[1] | (command[2] << 8);
  const params = command.slice(4);
  const lines = [
    'HCI Command',
    describeBytes(command.slice(1, 4), params),
    `opcode = ${describeOpcode(opcode)}`,
  ];

  if (opcode === Opcode.WriteBdAddr) lines.push(describeBdAddr(params));
  return lines;
}

export function describeCommandComplete(event: CommandComplete): string[] {
  const params = Uint8Array.of(
    event.numCommandPackets,
    event.opcode & 0xff,
    event.opcode >> 8,
    event.status,
    ...event.params,
  );
  const status = STATUS_NAMES[event.status] ?? 'Error';
  const lines = [
    'HCI Command Complete Event',
    describeBytes(Uint8Array.of(0x0e, params.length), params),
    'event = 0x0E (14, "Command Complete")',
    `Num_HCI_Command_Packets = 0x${event.numCommandPackets.toString(16).toUpperCase()} (${event.numCommandPackets})`,
    `Command_Opcode = ${describeOpcode(event.opcode)}`,
    `Status = 0x${event.status.toString(16).toUpperCase()} (${event.status}, "${status}")`,
  ];

  if (event.opcode === Opcode.ReadBdAddr && event.status === 0x00)
    lines.push(describeBdAddr(event.params));
  return lines;
}

// 03/31/25 17:16:24.702
export function formatTimestamp(date: Date): string {
  const two = (n: number) => String(n).padStart(2, '0');
  const day = `${two(date.getMonth() + 1)}/${two(date.getDate())}/${two(date.getFullYear() % 100)}`;
  const time = `${two(date.getHours())}:${two(date.getMinutes())}:${two(date.getSeconds())}`;
  return `${day} ${time}.${String(date.getMilliseconds()).padStart(3, '0')}`;
}

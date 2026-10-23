const HCI_COMMAND_PACKET = 0x01;

export const Opcode = {
  Reset: 0x0c03,
  ReadBdAddr: 0x1009,
  WriteBdAddr: 0xfc01,
} as const;

function buildCommand(opcode: number, params: readonly number[] = []): Uint8Array {
  return new Uint8Array([HCI_COMMAND_PACKET, opcode & 0xff, opcode >> 8, params.length, ...params]);
}

export const resetCommand = () => buildCommand(Opcode.Reset);

export const readBdAddrCommand = () => buildCommand(Opcode.ReadBdAddr);

// bdAddr is in display order (11:22:33:44:55:66), the device expects it reversed.
export const writeBdAddrCommand = (bdAddr: Uint8Array) =>
  buildCommand(Opcode.WriteBdAddr, [...bdAddr].reverse());

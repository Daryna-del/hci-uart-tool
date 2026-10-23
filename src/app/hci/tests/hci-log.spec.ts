import { describeCommand, describeCommandComplete, formatTimestamp } from '../hci-log';
import { readBdAddrCommand, resetCommand, writeBdAddrCommand } from '../hci-commands';

const bytes = (...values: number[]) => new Uint8Array(values);

describe('HCI log', () => {
  it('formats the timestamp like the task log', () => {
    expect(formatTimestamp(new Date(2025, 2, 31, 17, 16, 24, 702))).toBe('03/31/25 17:16:24.702');
  });

  it('describes HCI Reset like the task log', () => {
    expect(describeCommand(resetCommand())).toEqual([
      'HCI Command',
      '[03 0C 00]',
      'opcode = 0x0C03 (3075, "Reset")',
    ]);
  });

  it('describes Read BD_ADDR like the task log', () => {
    expect(describeCommand(readBdAddrCommand())).toEqual([
      'HCI Command',
      '[09 10 00]',
      'opcode = 0x1009 (4105, "Read_BD_ADDR")',
    ]);
  });

  it('describes Write BD_ADDR with the address being written', () => {
    expect(describeCommand(writeBdAddrCommand(bytes(0x11, 0x22, 0x33, 0x44, 0x55, 0x66)))).toEqual([
      'HCI Command',
      '[01 FC 06]: 66 55 44 33 22 11',
      'opcode = 0xFC01 (64513, "Write_BD_ADDR")',
      'BD_ADDR = "112233445566"',
    ]);
  });

  it('describes the Reset response like the task log', () => {
    expect(
      describeCommandComplete({
        numCommandPackets: 1,
        opcode: 0x0c03,
        status: 0x00,
        params: bytes(),
      }),
    ).toEqual([
      'HCI Command Complete Event',
      '[0E 04]: 01 03 0C 00',
      'event = 0x0E (14, "Command Complete")',
      'Num_HCI_Command_Packets = 0x1 (1)',
      'Command_Opcode = 0x0C03 (3075, "Reset")',
      'Status = 0x0 (0, "Success")',
    ]);
  });

  it('describes the Read BD_ADDR response with the address like the task log', () => {
    const event = {
      numCommandPackets: 1,
      opcode: 0x1009,
      status: 0x00,
      params: bytes(0xe0, 0x5b, 0x20, 0x6a, 0x70, 0x20),
    };

    expect(describeCommandComplete(event)).toEqual([
      'HCI Command Complete Event',
      '[0E 0A]: 01 09 10 00 E0 5B 20 6A 70 20',
      'event = 0x0E (14, "Command Complete")',
      'Num_HCI_Command_Packets = 0x1 (1)',
      'Command_Opcode = 0x1009 (4105, "Read_BD_ADDR")',
      'Status = 0x0 (0, "Success")',
      'BD_ADDR = "20706A205BE0"',
    ]);
  });

  it('names known error statuses', () => {
    const event = { numCommandPackets: 1, opcode: 0x0c03, status: 0x12, params: bytes() };

    expect(describeCommandComplete(event)).toContain(
      'Status = 0x12 (18, "Invalid HCI Command Parameters")',
    );
  });
});

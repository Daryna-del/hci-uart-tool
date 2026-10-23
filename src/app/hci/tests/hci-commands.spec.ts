import { readBdAddrCommand, resetCommand, writeBdAddrCommand } from '../hci-commands';

describe('HCI commands', () => {
    it('builds HCI Reset', () => {
        expect([...resetCommand()]).toEqual([0x01, 0x03, 0x0c, 0x00]);
    });

    it('builds Read BD_ADDR', () => {
        expect([...readBdAddrCommand()]).toEqual([0x01, 0x09, 0x10, 0x00]);
    });

    it('builds Write BD_ADDR with the address least significant byte first', () => {
        const bdAddr = new Uint8Array([0x11, 0x22, 0x33, 0x44, 0x55, 0x66]);

        expect([...writeBdAddrCommand(bdAddr)]).toEqual([
            0x01, 0x01, 0xfc, 0x06, 0x66, 0x55, 0x44, 0x33, 0x22, 0x11,
        ]);
    });
});
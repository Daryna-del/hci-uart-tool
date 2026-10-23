import { formatBdAddr, parseBdAddr } from '../bd-addr';
import { writeBdAddrCommand } from '../hci-commands';

const ADDRESS = new Uint8Array([0x11, 0x22, 0x33, 0x44, 0x55, 0x66]);

describe('parseBdAddr', () => {
    it.each(['112233445566', '11:22:33:44:55:66', '11-22-33-44-55-66', ' 11:22:33:44:55:66 '])(
        'accepts %j',
        (text) => {
            expect(parseBdAddr(text)).toEqual(ADDRESS);
        },
    );

    it('accepts lowercase hex', () => {
        expect(parseBdAddr('aa:bb:cc:dd:ee:ff')).toEqual(new Uint8Array([0xaa, 0xbb, 0xcc, 0xdd, 0xee, 0xff]));
    });

    it.each(['', '1122334455', '11223344556677', 'GG2233445566', '11 22 33 44 55 66', '0x112233445566'])(
        'rejects %j',
        (text) => {
            expect(parseBdAddr(text)).toBeNull();
        },
    );
});

describe('formatBdAddr', () => {
    it('shows the Read BD_ADDR bytes from the task log most significant byte first', () => {
        expect(formatBdAddr(new Uint8Array([0xe0, 0x5b, 0x20, 0x6a, 0x70, 0x20]))).toBe('20:70:6A:20:5B:E0');
    });

    it('reads back what Write BD_ADDR sent', () => {
        const sentAddress = writeBdAddrCommand(parseBdAddr('11:22:33:44:55:66')!).slice(4);

        expect(formatBdAddr(sentAddress)).toBe('11:22:33:44:55:66');
    });
});
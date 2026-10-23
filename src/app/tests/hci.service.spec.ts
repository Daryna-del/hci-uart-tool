import { TestBed } from '@angular/core/testing';
import { HciService } from '../hci.service';
import { SerialService } from '../serial.service';

const bytes = (...values: number[]) => new Uint8Array(values);

// Stands in for the real port: records what was written and replies with a canned answer.
class FakeSerial {
    written: Uint8Array[] = [];
    reply: Uint8Array | null = null;
    private listener: (chunk: Uint8Array) => void = () => { };

    setDataListener(listener: (chunk: Uint8Array) => void): void {
        this.listener = listener;
    }

    async write(command: Uint8Array): Promise<void> {
        this.written.push(command);
        const reply = this.reply;
        if (reply) queueMicrotask(() => this.listener(reply));
    }
}

describe('HciService', () => {
    let serial: FakeSerial;
    let hci: HciService;

    beforeEach(() => {
        serial = new FakeSerial();
        TestBed.configureTestingModule({ providers: [{ provide: SerialService, useValue: serial }] });
        hci = TestBed.inject(HciService);
    });

    afterEach(() => {
        vi.useRealTimers();
    });

    it('sends HCI Reset and resolves on its Command Complete', async () => {
        serial.reply = bytes(0x04, 0x0e, 0x04, 0x01, 0x03, 0x0c, 0x00);

        await hci.reset();

        expect([...serial.written[0]]).toEqual([0x01, 0x03, 0x0c, 0x00]);
    });

    it('returns BD_ADDR from the Read BD_ADDR response in the task log', async () => {
        serial.reply = bytes(0x04, 0x0e, 0x0a, 0x01, 0x09, 0x10, 0x00, 0xe0, 0x5b, 0x20, 0x6a, 0x70, 0x20);

        expect(await hci.readBdAddr()).toBe('20:70:6A:20:5B:E0');
    });

    it('sends Write BD_ADDR with the given address', async () => {
        serial.reply = bytes(0x04, 0x0e, 0x04, 0x01, 0x01, 0xfc, 0x00);

        await hci.writeBdAddr(bytes(0x11, 0x22, 0x33, 0x44, 0x55, 0x66));

        expect([...serial.written[0]]).toEqual([0x01, 0x01, 0xfc, 0x06, 0x66, 0x55, 0x44, 0x33, 0x22, 0x11]);
    });

    it('rejects when the device returns a non-zero status', async () => {
        serial.reply = bytes(0x04, 0x0e, 0x04, 0x01, 0x03, 0x0c, 0x12);

        await expect(hci.reset()).rejects.toThrow('status 0x12');
    });

    it('times out when no matching response arrives', async () => {
        vi.useFakeTimers();
        serial.reply = bytes(0x04, 0x0e, 0x04, 0x01, 0x09, 0x10, 0x00); // Command Complete for another opcode

        const result = expect(hci.reset()).rejects.toThrow('did not respond');
        await vi.advanceTimersByTimeAsync(2000);
        await result;
    });

    it('refuses a second command while the first one is waiting', async () => {
        vi.useFakeTimers();
        const first = hci.reset();

        await expect(hci.readBdAddr()).rejects.toThrow('previous command');

        const firstResult = expect(first).rejects.toThrow('did not respond');
        await vi.advanceTimersByTimeAsync(2000);
        await firstResult;
    });

    it('logs sent and received bytes', async () => {
        serial.reply = bytes(0x04, 0x0e, 0x04, 0x01, 0x03, 0x0c, 0x00);

        await hci.reset();

        expect(hci.log()[0]).toContain('TX  01 03 0C 00');
        expect(hci.log()[1]).toContain('RX  04 0E 04 01 03 0C 00');
    });
});
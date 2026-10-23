import { Injectable, inject, signal } from '@angular/core';
import { formatBdAddr } from './hci/bd-addr';
import { readBdAddrCommand, resetCommand, writeBdAddrCommand } from './hci/hci-commands';
import { CommandComplete, HciEventParser } from './hci/hci-parser';
import { toHex } from './hci/hex';
import { SerialService } from './serial.service';

const RESPONSE_TIMEOUT_MS = 2000;
const STATUS_SUCCESS = 0x00;

// Sends one HCI command at a time and waits for its Command Complete event.
@Injectable({ providedIn: 'root' })
export class HciService {
    readonly busy = signal(false);
    readonly log = signal<string[]>([]);

    private readonly serial = inject(SerialService);
    private readonly parser = new HciEventParser();
    private pending: { opcode: number; resolve: (event: CommandComplete) => void } | null = null;

    constructor() {
        this.serial.setDataListener((chunk) => this.onData(chunk));
    }

    async reset(): Promise<void> {
        await this.send(resetCommand());
    }

    async readBdAddr(): Promise<string> {
        const event = await this.send(readBdAddrCommand());
        return formatBdAddr(event.params);
    }

    async writeBdAddr(bdAddr: Uint8Array): Promise<void> {
        await this.send(writeBdAddrCommand(bdAddr));
    }

    private async send(command: Uint8Array): Promise<CommandComplete> {
        if (this.busy()) throw new Error('Wait for the previous command to finish');

        const opcode = command[1] | (command[2] << 8); // bytes 1-2 of a command are its opcode
        let timer: ReturnType<typeof setTimeout> | undefined;
        this.busy.set(true);
        try {
            const response = new Promise<CommandComplete>((resolve, reject) => {
                this.pending = { opcode, resolve };
                timer = setTimeout(() => reject(new Error('Device did not respond in time')), RESPONSE_TIMEOUT_MS);
            });
            this.addLog('TX', command);
            const [, event] = await Promise.all([this.serial.write(command), response]);

            if (event.status !== STATUS_SUCCESS) {
                throw new Error(`Device rejected the command, status 0x${toHex(Uint8Array.of(event.status))}`);
            }
            return event;
        } finally {
            clearTimeout(timer);
            this.pending = null;
            this.busy.set(false);
        }
    }

    private onData(chunk: Uint8Array): void {
        this.addLog('RX', chunk);
        for (const event of this.parser.push(chunk)) {
            if (event.opcode === this.pending?.opcode) this.pending.resolve(event);
        }
    }

    private addLog(direction: 'TX' | 'RX', bytes: Uint8Array): void {
        const time = new Date().toLocaleTimeString();
        this.log.update((lines) => [...lines, `${time}  ${direction}  ${toHex(bytes)}`]);
    }
}
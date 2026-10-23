import { Component, inject, signal } from '@angular/core';
import { resetCommand } from './hci/hci-commands';
import { toHex } from './hci/hex';
import { SerialService } from './serial.service';

@Component({
  selector: 'app-root',
  templateUrl: './app.html',
  styleUrl: './app.css',
})
export class App {
  protected readonly serial = inject(SerialService);
  protected readonly log = signal<string[]>([]);
  protected readonly error = signal('');

  constructor() {
    this.serial.setDataListener((chunk) => this.addLog('RX', chunk));
  }

  protected async connect(): Promise<void> {
    this.error.set('');
    try {
      await this.serial.connect();
    } catch (e) {
      this.error.set(e instanceof Error ? e.message : String(e));
    }
  }

  protected async disconnect(): Promise<void> {
    await this.serial.disconnect();
  }

  protected async sendReset(): Promise<void> {
    const command = resetCommand();
    this.addLog('TX', command);
    await this.serial.write(command);
  }

  private addLog(direction: 'TX' | 'RX', bytes: Uint8Array): void {
    const time = new Date().toLocaleTimeString();
    this.log.update((lines) => [...lines, `${time}  ${direction}  ${toHex(bytes)}`]);
  }
}

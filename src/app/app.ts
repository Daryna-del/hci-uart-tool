import { Component, inject, signal } from '@angular/core';
import { HciService } from './hci.service';
import { SerialService } from './serial.service';

@Component({
  selector: 'app-root',
  templateUrl: './app.html',
  styleUrl: './app.css',
})
export class App {
  protected readonly serial = inject(SerialService);
  protected readonly hci = inject(HciService);
  protected readonly error = signal('');

  protected async connect(): Promise<void> {
    await this.run(() => this.serial.connect());
  }

  protected async disconnect(): Promise<void> {
    await this.run(() => this.serial.disconnect());
  }

  protected async sendReset(): Promise<void> {
    await this.run(() => this.hci.reset());
  }

  // Runs an action and shows its error message instead of letting it fail silently.
  private async run(action: () => Promise<unknown>): Promise<void> {
    this.error.set('');
    try {
      await action();
    } catch (e) {
      this.error.set(e instanceof Error ? e.message : String(e));
    }
  }
}
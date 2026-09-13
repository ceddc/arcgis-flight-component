interface DisposalEntry {
  readonly label: string;
  readonly order: number;
  readonly sequence: number;
  readonly dispose: () => void;
}

/**
 * Stop callbacks before restoring the host, then release graphics and their backing data.
 * Entries within one phase unwind in reverse creation order, including partial startup.
 */
export class Disposer {
  private entries: DisposalEntry[] = [];
  private disposed = false;
  private sequence = 0;

  add(label: string, order: number, dispose: () => void): void {
    const entry = { label, order, sequence: this.sequence++, dispose };
    // A load may finish after cancellation; its newly returned resource still needs disposal.
    if (this.disposed) {
      this.run(entry);
      return;
    }
    this.entries.push(entry);
  }

  dispose(): void {
    if (this.disposed) return;
    this.disposed = true;
    const entries = this.entries.sort((left, right) => (
      left.order - right.order || right.sequence - left.sequence
    ));
    this.entries = [];
    for (const entry of entries) this.run(entry);
  }

  private run(entry: DisposalEntry): void {
    try {
      entry.dispose();
    } catch (error) {
      console.warn(`ArcGIS flight cleanup failed for ${entry.label}.`, error);
    }
  }
}

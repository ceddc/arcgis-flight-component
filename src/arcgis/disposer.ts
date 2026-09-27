/**
 * Run cleanup for resources acquired by an ArcGIS flight session in phases.
 * Earlier phases stop work before host state is restored and owned graphics
 * are released; reverse order within a phase supports partial startup.
 */
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

  /**
   * Register one cleanup operation in an ownership phase.
   *
   * Entries in lower-numbered phases run first; within a phase, the newest
   * acquisition is released first. Adding after disposal runs the cleanup
   * immediately, which covers resources returned by late asynchronous loads.
   *
   * @param label Human-readable resource name included in cleanup warnings.
   * @param order Cleanup phase used to order dependencies.
   * @param dispose Synchronous operation that releases the acquired resource.
   */
  add(label: string, order: number, dispose: () => void): void {
    const entry = { label, order, sequence: this.sequence++, dispose };
    // A load may finish after cancellation; its newly returned resource still needs disposal.
    if (this.disposed) {
      this.run(entry);
      return;
    }
    this.entries.push(entry);
  }

  /** Release every registered resource once, in dependency-safe order. */
  dispose(): void {
    if (this.disposed) return;
    this.disposed = true;
    const entries = this.entries.sort((left, right) => (
      left.order - right.order || right.sequence - left.sequence
    ));
    this.entries = [];
    for (const entry of entries) this.run(entry);
  }

  /** Run one cleanup independently so a failure cannot prevent later releases. */
  private run(entry: DisposalEntry): void {
    try {
      entry.dispose();
    } catch (error) {
      console.warn(`ArcGIS flight cleanup failed for ${entry.label}.`, error);
    }
  }
}

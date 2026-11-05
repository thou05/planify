type Save = { key: string; run: () => Promise<unknown> };

/** Preserve dependent move order; only consecutive unsent moves may be replaced. */
export class DragSaveQueue {
  private jobs: Save[] = [];
  private running = false;
  private paused = false;

  constructor(private callbacks: {
    changed: (pending: number) => void;
    failed: (error: unknown) => void;
    idle: () => void;
  }) {}

  enqueue(key: string, run: Save['run']) {
    const last = this.jobs[this.jobs.length - 1];
    if (!this.paused && last?.key === key) last.run = run;
    else this.jobs.push({ key, run });
    this.report();
    // Batch moves in the same tick, without delaying interaction.
    queueMicrotask(() => void this.drain());
  }

  retry() { this.paused = false; void this.drain(); }

  private report() { this.callbacks.changed(this.jobs.length + Number(this.running)); }

  private async drain() {
    if (this.running || this.paused || !this.jobs.length) return;
    this.running = true;
    while (this.jobs.length) {
      const job = this.jobs.shift()!;
      this.report();
      try { await job.run(); }
      catch (error) {
        this.jobs.unshift(job);
        this.paused = true;
        this.running = false;
        this.report();
        this.callbacks.failed(error);
        return;
      }
    }
    this.running = false;
    this.report();
    this.callbacks.idle();
  }
}

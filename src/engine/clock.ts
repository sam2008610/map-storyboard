/**
 * TimelineClock：只負責產出 currentTime（秒）。
 * 畫面更新一律走外部的純函式 onTick(currentTime)，不在此處碰地圖。
 * 播放由 requestAnimationFrame 的 real delta 驅動；seek/匯出只是設定時間再 onTick。
 * 這個分工讓未來 v2 逐幀匯出（固定步進）不必重寫核心。
 */
export class TimelineClock {
  private _time = 0;
  private _playing = false;
  private _raf = 0;
  private _last = 0;

  totalDuration: number;
  loop: boolean;
  onTick: (time: number) => void;
  onStateChange?: () => void;

  constructor(opts: {
    totalDuration: number;
    onTick: (time: number) => void;
    onStateChange?: () => void;
    loop?: boolean;
  }) {
    this.totalDuration = opts.totalDuration;
    this.onTick = opts.onTick;
    this.onStateChange = opts.onStateChange;
    this.loop = opts.loop ?? false;
  }

  get time() {
    return this._time;
  }
  get playing() {
    return this._playing;
  }

  seek(t: number, emit = true) {
    this._time = Math.max(0, Math.min(t, this.totalDuration));
    if (emit) this.onTick(this._time);
  }

  play() {
    if (this._playing) return;
    if (this._time >= this.totalDuration) this._time = 0;
    this._playing = true;
    this._last = performance.now();
    this.onStateChange?.();
    const step = (now: number) => {
      if (!this._playing) return;
      const dt = (now - this._last) / 1000;
      this._last = now;
      this._time += dt;
      if (this._time >= this.totalDuration) {
        if (this.loop) {
          this._time = this._time % this.totalDuration;
        } else {
          this._time = this.totalDuration;
          this.onTick(this._time);
          this.pause();
          return;
        }
      }
      this.onTick(this._time);
      this._raf = requestAnimationFrame(step);
    };
    this._raf = requestAnimationFrame(step);
  }

  pause() {
    if (!this._playing) return;
    this._playing = false;
    cancelAnimationFrame(this._raf);
    this.onStateChange?.();
  }

  toggle() {
    this._playing ? this.pause() : this.play();
  }

  dispose() {
    this._playing = false;
    cancelAnimationFrame(this._raf);
  }
}

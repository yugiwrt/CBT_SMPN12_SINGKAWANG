import { callGasApi } from './api.js';

export class ExamAntiCheat {
  constructor({ idUjian, nisn, maxViolations = 3, onWarn, onLock }) {
    this.idUjian = idUjian;
    this.nisn = nisn;
    this.maxViolations = maxViolations;
    this.count = Number(localStorage.getItem(`viol_${idUjian}_${nisn}`) || 0);
    this.onWarn = onWarn;
    this.onLock = onLock;
    this.active = false;
    this.lastHit = 0;
    this._onVis = () => document.hidden && this._hit('Berpindah tab atau aplikasi');
    this._onBlur = () => this._hit('Keluar dari fokus jendela ujian');
    this._block = (e) => this.active && e.preventDefault();
  }
  start() {
    this.active = true;
    document.addEventListener('visibilitychange', this._onVis);
    window.addEventListener('blur', this._onBlur);
    ['contextmenu', 'copy', 'cut', 'paste'].forEach(ev => document.addEventListener(ev, this._block));
  }
  stop() {
    this.active = false;
    document.removeEventListener('visibilitychange', this._onVis);
    window.removeEventListener('blur', this._onBlur);
    ['contextmenu', 'copy', 'cut', 'paste'].forEach(ev => document.removeEventListener(ev, this._block));
  }
  _hit(jenis) {
    if (!this.active || Date.now() - this.lastHit < 2000) return;
    this.lastHit = Date.now();
    this.count += 1;
    localStorage.setItem(`viol_${this.idUjian}_${this.nisn}`, String(this.count));
    callGasApi('logViolation', { idUjian: this.idUjian, jenis, count: this.count }).catch(() => {});
    if (this.count >= this.maxViolations) { this.stop(); this.onLock(this.count); }
    else { this.onWarn(this.count, this.maxViolations); }
  }
}
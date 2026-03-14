/**
 * notifications.js — Toast 通知系統（SRP）
 * 右上角固定容器，支援 info / success / warning / error
 * 滑入動畫 + 自動消失（4秒）+ 點擊關閉
 */
class Notifications {
  static DURATION = 4000;

  constructor() {
    this.container = document.createElement('div');
    this.container.className = 'toast-container';
    document.body.appendChild(this.container);
  }

  show(text, type) {
    type = type || 'info'; // info | success | warning | error
    const toast = document.createElement('div');
    toast.className = 'toast toast-' + type;
    toast.textContent = text;
    toast.addEventListener('click', () => this._remove(toast));
    this.container.appendChild(toast);

    // Trigger slide-in animation
    requestAnimationFrame(() => toast.classList.add('show'));

    // Auto dismiss
    setTimeout(() => this._remove(toast), Notifications.DURATION);
  }

  info(text) { this.show(text, 'info'); }
  success(text) { this.show(text, 'success'); }
  warning(text) { this.show(text, 'warning'); }
  error(text) { this.show(text, 'error'); }

  _remove(toast) {
    toast.classList.remove('show');
    toast.classList.add('hide');
    toast.addEventListener('transitionend', () => toast.remove(), { once: true });
    // Fallback removal in case transitionend doesn't fire
    setTimeout(() => { if (toast.parentNode) toast.remove(); }, 500);
  }
}

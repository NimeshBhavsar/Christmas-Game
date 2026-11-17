// Santas iPhone: Story-Uhr, heller/dunkler Systembalken und das Mail-Symbol.

let start = performance.now();

/** Die Geschichte beginnt um 18:00 Uhr; alle 20 Sekunden vergeht eine Minute. */
export function storyTime(): string {
  const t = 18 * 60 + Math.floor((performance.now() - start) / 20_000);
  return `${String(Math.floor(t / 60) % 24).padStart(2, '0')}:${String(t % 60).padStart(2, '0')}`;
}

export function resetStoryTime() { start = performance.now(); }

/** Dunkles Thema = weiße Systemsymbole (z. B. auf dem Sperrbildschirm). */
export function setPhoneTheme(dark: boolean) {
  const screen = document.querySelector<HTMLElement>('.phone-screen');
  if (screen) screen.dataset.theme = dark ? 'dark' : 'light';
}

export const MAIL_ICON = `
<svg viewBox="0 0 24 24" aria-hidden="true">
  <rect x="3" y="6" width="18" height="12" rx="2.600" fill="#fff" />
  <path d="M4.200 8.200l7.800 5.800 7.800-5.800" fill="none" stroke="#1a7cf2" stroke-width="1.700" stroke-linecap="round" stroke-linejoin="round" />
</svg>`;

import './styles.css';
import './phone.css';
import { LEARN } from './content.de';
import { computeAudit, ledger, LevelId, resetLedger } from './state';
import { $ } from './ui/dom';
import { createDialog, Speaker } from './ui/dialog';
import { showLearnCard } from './ui/learnCard';
import { resetStoryTime, setPhoneTheme, storyTime } from './ui/phone';
import { isMuted, setMuted, sfx, unlockAudio } from './ui/sfx';
import { Pt, World } from './world/world';
import { intro } from './scenes/intro';
import { inbox } from './scenes/inbox';
import { inventory } from './scenes/inventory';
import { translate } from './scenes/translate';
import { drive } from './scenes/drive';
import { decision } from './scenes/decision';
import { audit } from './scenes/audit';
import { donate } from './scenes/donate';

export interface SceneCtx {
  /** Bildschirm von Santas Handy */
  root: HTMLElement;
  /** Overlay über dem Handy (Lernkarten, Toasts) */
  overlay: HTMLElement;
  /** Die Pixel-Spielwelt */
  world: World;
  /** Retro-Dialogbox */
  talk: (who: Speaker, text: string) => Promise<void>;
  /** Level abschließen: Lernkarte zeigen, dann weiter. */
  finish: (learnKey?: keyof typeof LEARN) => Promise<void>;
  /** Punktestand aktualisieren und den Zuwachs als „+10“ in der Welt zeigen. */
  award: (at?: string | Pt) => void;
  restart: () => void;
  isActive: () => boolean;
}

type SceneId = 'intro' | LevelId | 'donate';
type Scene = { id: SceneId; label: string; title?: string; run: (ctx: SceneCtx) => void };

const SCENES: Scene[] = [
  { id: 'intro', label: 'Start', run: intro },
  { id: 'inbox', label: 'Postfach', title: 'Santas Postfach', run: inbox },
  { id: 'inventory', label: 'Lager', title: 'Reicht der Vorrat?', run: inventory },
  { id: 'translate', label: 'Übersetzung', title: 'Post aus aller Welt', run: translate },
  { id: 'drive', label: 'Drive', title: 'Der verlorene Wunsch', run: drive },
  { id: 'decision', label: 'Entscheidung', title: 'Du entscheidest', run: decision },
  { id: 'audit', label: 'Prüfbericht', title: 'Die große Prüfung', run: audit },
  { id: 'donate', label: 'Spende', run: donate },
];
const LEVELS = SCENES.filter(s => s.title);

const sceneRoot = $(document, '#scene');
const overlay = $(document, '#overlay');
const progress = $(document, '#progress');
const skipBtn = $<HTMLButtonElement>(document, '#skip');
const muteBtn = $<HTMLButtonElement>(document, '#mute');
const scoreEl = $(document, '#score');
const world = new World($<HTMLCanvasElement>(document, '#world'), $(document, '#stage-ui'));
const talk = createDialog($(document, '#dialog'));

let current = 0;
let token = 0;
let shownScore = 0;

function renderProgress() {
  const id = SCENES[current].id;
  const idx = LEVELS.findIndex(l => l.id === id);
  const end = id === 'donate';
  progress.innerHTML = LEVELS.map((l, i) => {
    const state = i < idx || end ? `done${i === idx - 1 ? ' just' : ''}` : i === idx ? 'now' : '';
    return `<li class="${state}" title="${l.label}"><span class="sr-only">${l.label}${state.startsWith('done') ? ' (erledigt)' : state === 'now' ? ' (aktuell)' : ''}</span></li>`;
  }).join('');
}

function setScore(n: number) {
  if (n === shownScore) return;
  const from = shownScore;
  shownScore = n;
  const start = performance.now();
  const step = (t: number) => {
    const p = Math.min(1, (t - start) / 700);
    scoreEl.textContent = String(Math.round(from + (n - from) * p)).padStart(4, '0');
    if (p < 1) requestAnimationFrame(step);
  };
  requestAnimationFrame(step);
  if (n > from) sfx.coin();
  scoreEl.parentElement!.classList.remove('bump');
  void scoreEl.offsetWidth;
  scoreEl.parentElement!.classList.add('bump');
}

function go(index: number) {
  current = index;
  const scene = SCENES[current];
  const my = ++token;
  overlay.innerHTML = '';
  skipBtn.hidden = !scene.title;
  document.body.dataset.scene = scene.id;
  renderProgress();
  sceneRoot.innerHTML = '';
  sceneRoot.scrollTop = 0;
  sceneRoot.className = `scene-${scene.id}`;
  setPhoneTheme(false);
  world.clearBubbles();
  world.ui.querySelectorAll('.scoreboard, .drop-zone, .end-banner, .title-screen, .floater').forEach(n => n.remove());
  world.prepare(scene.id);
  const ctx: SceneCtx = {
    root: sceneRoot,
    overlay,
    world,
    talk,
    isActive: () => my === token,
    award: (at = 'santa') => {
      if (my !== token) return;
      const total = computeAudit().total;
      if (total > shownScore) world.float(at, `+${total - shownScore}`);
      setScore(total);
    },
    finish: async learnKey => {
      if (my !== token) return;
      if (scene.title) setScore(computeAudit().total);
      if (learnKey) await showLearnCard(overlay, LEARN[learnKey]);
      if (my === token) go(current + 1);
    },
    restart: () => {
      resetLedger();
      resetStoryTime();
      world.reset();
      shownScore = 0;
      scoreEl.textContent = '0000';
      go(0);
    },
  };
  if (scene.title) {
    const n = LEVELS.indexOf(scene) + 1;
    void world.banner(`LEVEL ${n}`, scene.title);
  }
  scene.run(ctx);
}

skipBtn.addEventListener('click', () => {
  const id = SCENES[current].id as LevelId;
  ledger.skipped.add(id);
  sfx.back();
  setScore(computeAudit().total);
  go(current + 1);
});

const paintMute = () => {
  muteBtn.textContent = isMuted() ? '♪̸' : '♪';
  muteBtn.setAttribute('aria-label', isMuted() ? 'Ton an' : 'Ton aus');
  muteBtn.classList.toggle('off', isMuted());
};
muteBtn.addEventListener('click', () => { unlockAudio(); setMuted(!isMuted()); paintMute(); });
paintMute();

const clock = $(document, '#clock');
const tickClock = () => {
  const t = storyTime();
  clock.textContent = t;
  const big = document.querySelector('.lock-time');
  if (big) big.textContent = t;
};
tickClock();
setInterval(tickClock, 5_000);

// Entwickler-Abkürzung: ?scene=audit springt direkt zu einer Szene.
const start = new URLSearchParams(location.search).get('scene');
const startIdx = SCENES.findIndex(s => s.id === start);
go(startIdx > 0 ? startIdx : 0);

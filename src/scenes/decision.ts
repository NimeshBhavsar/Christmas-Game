import type { SceneCtx } from '../main';
import { JONAS_RECS } from '../content.de';
import { ledger } from '../state';
import { agentMsg, createThread, dockButton, OM_AVATAR } from '../ui/chat';
import { esc, wait } from '../ui/dom';
import { sfx } from '../ui/sfx';
import { dataUrl, icon } from '../world/pixels';

export const REC_ICON: Record<string, string> = { ball: 'ball', jacke: 'jacke', buch: 'buch', pluesch: 'pluesch' };

export async function decision(ctx: SceneCtx) {
  const { world } = ctx;
  void world.shot('mid');
  const jonas = world.kids.get('jonas') ?? world.addKid('jonas', 63);
  jonas.visible = true;
  jonas.shiver = true;

  const t = createThread(ctx.root, {
    eyebrow: 'Du entscheidest',
    title: 'Was bekommt Jonas?',
    intro: 'OneMachine schlägt vor – mit Begründung und Quelle. Annehmen oder ablehnen liegt ganz bei dir.',
  });

  const found = ledger.driveFound;
  await wait(300);
  if (!ctx.isActive()) return;
  world.fx.buzz = 500;
  world.ring(world.phonePt(), '#ffd34d', 22);

  const card = agentMsg(t, `
    ${found ? '' : '<p class="muted" style="font-size:14.5px">Hinweis: Das Drive-Dokument wurde übersprungen – die Vorschläge stützen sich auf weniger Informationen.</p>'}
    <div class="approval">
      <div class="approval-head">${OM_AVATAR} BRAUCHT DICH <span class="badge">${JONAS_RECS.length}</span></div>
      <div class="approval-body">
        <p class="muted" style="font-size:14.5px;padding:10px 0 2px">Jonas, 9 · würde sich freuen über:</p>
        ${JONAS_RECS.map(r => `
          <div class="rec" data-id="${r.id}">
            <span class="big"><img src="${dataUrl(icon(REC_ICON[r.id]), 4)}" alt="" /></span>
            <div class="info">
              <b>${esc(r.name)}</b>
              <p>${esc(r.reason)}</p>
              <div class="meta">
                <span class="cite">${esc(r.source)}</span>
                <span class="conf-bar" aria-hidden="true"><i style="width:${r.confidence}%"></i></span>
                <span class="conf">${r.confidence} % passend</span>
              </div>
            </div>
            <div class="rec-actions" role="group" aria-label="${esc(r.name)}">
              <button type="button" class="rej" aria-pressed="false">✕ Ablehnen</button>
              <button type="button" class="acc" aria-pressed="false">✓ Annehmen</button>
            </div>
          </div>`).join('')}
      </div>
    </div>`);

  const btnDone = dockButton(t, 'Entscheidung bestätigen');
  const doneBtn = t.dock.querySelector('button')!;
  const refresh = () => {
    const open = JONAS_RECS.length - Object.keys(ledger.jonas).length;
    doneBtn.disabled = open > 0;
    doneBtn.textContent = open > 0 ? `Noch ${open} offen` : 'Entscheidung bestätigen ▶';
  };
  refresh();

  const onSleigh = new Map<string, HTMLCanvasElement>();
  card.querySelectorAll<HTMLElement>('.rec').forEach(rec => {
    const id = rec.dataset.id!;
    const acc = rec.querySelector<HTMLButtonElement>('.acc')!;
    const rej = rec.querySelector<HTMLButtonElement>('.rej')!;
    const set = (v: 'accept' | 'reject') => {
      if (ledger.jonas[id] === v) return;
      ledger.jonas[id] = v;
      acc.setAttribute('aria-pressed', String(v === 'accept'));
      rej.setAttribute('aria-pressed', String(v === 'reject'));
      rec.classList.toggle('decided-reject', v === 'reject');
      rec.classList.toggle('decided-accept', v === 'accept');
      if (v === 'accept') {
        sfx.select();
        const img = icon(REC_ICON[id]);
        onSleigh.set(id, img);
        void world.giftToSleigh(img).then(() => {
          if (!ctx.isActive()) return;
          world.hopKid('jonas');
          world.emote('jonas', '♥', 1100);
          ctx.award('jonas');
        });
      } else {
        sfx.back();
        const img = onSleigh.get(id);
        if (img) {
          world.sleighGifts = world.sleighGifts.filter(g => g !== img);
          onSleigh.delete(id);
          world.poof({ x: world.sleigh.x + 30, y: world.sleigh.y - 26 });
        }
        ctx.award('jonas');
      }
      refresh();
    };
    acc.addEventListener('click', () => set('accept'));
    rej.addEventListener('click', () => set('reject'));
  });

  await btnDone;
  if (!ctx.isActive()) return;
  card.querySelectorAll('button').forEach(b => (b.disabled = true));
  const accepted = JONAS_RECS.filter(r => ledger.jonas[r.id] === 'accept');
  agentMsg(t, accepted.length
    ? `<p>Erledigt. ${accepted.length} ${accepted.length === 1 ? 'Geschenk liegt' : 'Geschenke liegen'} für Jonas auf dem Schlitten – genau wie du entschieden hast.</p>`
    : '<p>Verstanden, du hast alle Vorschläge abgelehnt. Ich ändere nichts ohne deine Freigabe.</p>');
  if (accepted.length) world.hoho();
  world.say('santa', accepted.length ? 'Jonas wird staunen!' : 'Hmm, vielleicht nächstes Jahr …', 2400);
  await wait(1700);
  if (!ctx.isActive()) return;
  void world.goHome('jonas');
  await wait(700);
  ctx.finish('decision');
}

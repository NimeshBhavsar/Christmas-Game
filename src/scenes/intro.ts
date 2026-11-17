import type { SceneCtx } from '../main';
import { DONATION, EMAILS } from '../content.de';
import { OM_AVATAR } from '../ui/chat';
import { SPEAKERS } from '../ui/dialog';
import { el, esc, wait } from '../ui/dom';
import { MAIL_ICON, setPhoneTheme, storyTime } from '../ui/phone';
import { sfx, unlockAudio } from '../ui/sfx';
import { MAIN_KIDS } from '../world/world';

const CONNECTORS = [
  { id: 'mail', ico: '✉️', name: 'E-Mail', desc: 'Santas Postfach am Nordpol', on: `Verbunden · ${EMAILS.length} neue E-Mails` },
  { id: 'db', ico: '🗄️', name: 'Werkstatt-Datenbank', desc: 'Lagerbestand aller Geschenke', on: 'Verbunden · 6 Artikelgruppen' },
  { id: 'drive', ico: '📄', name: 'Google Drive', desc: 'Dokumente und Notizen', on: 'Verbunden · 1.204 Dateien' },
];

/** Jeder Buchstabe bekommt eine eigene Verzögerung, damit der Titel einzeln hereinfällt. */
export const letters = (s: string, off = 0) => [...s].map((ch, i) => `<span style="--i:${i + off}">${ch}</span>`).join('');

export async function intro(ctx: SceneCtx) {
  const { world, root } = ctx;
  world.setMode('title');

  // ---------- Titelbild ----------
  const title = el(`
    <div class="title-screen">
      <div class="title-badge">MINDSMACHINES PRÄSENTIERT</div>
      <h1 class="title-main" aria-label="Santas Postfach">
        <span class="tl" aria-hidden="true">${letters('SANTAS')}</span>
        <span class="tl" aria-hidden="true">${letters('POSTFACH', 6)}</span>
      </h1>
      <p class="title-sub">Ein Weihnachtsabenteuer mit OneMachine</p>
      <button class="press-start" type="button">▶ START</button>
      <p class="title-don">💚 ${esc(DONATION.line)}</p>
    </div>`);
  world.ui.appendChild(title);
  lockScreen(root, []);

  await new Promise<void>(res => title.querySelector('button')!.addEventListener('click', () => res(), { once: true }));
  if (!ctx.isActive()) return;
  unlockAudio();
  sfx.unlock();
  title.remove();

  // ---------- Zwischensequenz: Der eingeschneite Briefkasten ----------
  await world.wipe(() => {
    world.setMode('north');
    MAIN_KIDS.forEach(id => { const k = world.addKid(id); k.letter = true; });
  });
  if (!ctx.isActive()) return;
  await ctx.talk(SPEAKERS.narrator(), '1. Dezember am Nordpol. Überall schreiben Kinder ihre Wunschzettel an den Weihnachtsmann …');
  if (!ctx.isActive()) return;

  void world.shot('village', 1500);
  world.say('lena', 'Ab zum Briefkasten!', 2000);
  await Promise.all(MAIN_KIDS.map((id, i) => world.walk(id, 34 + i * 12, 26)));
  if (!ctx.isActive()) return;
  MAIN_KIDS.forEach(id => (world.kid(id).facing = 1));

  world.say('santa', 'Hohoho … was für ein Sturm!', 2400);
  await world.buryMailbox();
  if (!ctx.isActive()) return;
  world.emote('ben', '!');
  world.emote('paul', '!');
  await ctx.talk(SPEAKERS.narrator(), 'Doch dieses Jahr schneit es so heftig wie nie. Der Briefkasten ist komplett eingeschneit!');
  if (!ctx.isActive()) return;

  for (const [i, id] of MAIN_KIDS.entries()) {
    setTimeout(() => { if (ctx.isActive()) void world.throwLetter(id); }, i * 280);
  }
  await wait(1600);
  if (!ctx.isActive()) return;
  world.say('ben', 'Oh nein! Er geht nicht rein!', 2400);
  world.emote('emma', '?');
  await wait(1500);
  if (!ctx.isActive()) return;

  world.hopKid('lena');
  await ctx.talk(SPEAKERS.kid('lena'), 'Kein Problem – dann schicken wir dem Weihnachtsmann eben eine E-Mail!');
  if (!ctx.isActive()) return;

  // ---------- E-Mail-Flut ----------
  MAIN_KIDS.forEach(id => (world.kid(id).pose = 'type'));
  world.santa.phone = true;
  const notifs: Notif[] = [];
  const flights: Promise<void>[] = [];
  for (let i = 0; i < EMAILS.length; i++) {
    if (!ctx.isActive()) return;
    const k = world.kid(MAIN_KIDS[i % MAIN_KIDS.length]);
    const fromKid = EMAILS[i].child || i % 3 === 0;
    const from = fromKid ? { x: k.x + 5, y: k.base - 12 } : { x: 335, y: 84 + ((i * 17) % 50) };
    flights.push(world.sendEmail(from).then(() => {
      if (!ctx.isActive()) return;
      notifs.unshift({ from: EMAILS[i].from, subject: EMAILS[i].subject });
      lockScreen(root, notifs);
    }));
    await wait(190);
  }
  await Promise.all(flights);
  if (!ctx.isActive()) return;
  MAIN_KIDS.forEach(id => (world.kid(id).pose = 'stand'));
  world.santa.sweat = true;
  world.shake(350);
  world.emote('santa', '!');
  await wait(500);
  world.say('santa', `${EMAILS.length} E-Mails?!`, 2400);
  await wait(900);
  if (!ctx.isActive()) return;
  await ctx.talk(SPEAKERS.santa(), 'Hohoho … so viele E-Mails! Und das Lager muss ich auch noch prüfen. Ich brauche Hilfe!');
  if (!ctx.isActive()) return;

  // ---------- OneMachine öffnen & Tools verbinden ----------
  sfx.power();
  world.flash();
  world.ring(world.phonePt(), '#ffd34d', 28);
  world.sparkle(world.phonePt());
  setPhoneTheme(false);
  root.innerHTML = `
    <section class="home">
      <div class="app-bar" style="margin:-14px -16px 0">${OM_AVATAR}<span class="app-name">OneMachine</span></div>
      <h2>Hallo, Weihnachtsmann! Woran arbeiten wir heute?</h2>
      <p class="lede" style="margin:0">Verbinde deine Tools. Alles, was Daten verändert, wartet auf deine Freigabe.</p>
      <div class="connectors">
        ${CONNECTORS.map(c => `
          <div class="connector" data-id="${c.id}">
            <span class="ico" aria-hidden="true">${c.ico}</span>
            <span class="txt"><b>${esc(c.name)}</b><span>${esc(c.desc)}</span></span>
            <button class="toggle" type="button" role="switch" aria-checked="false" aria-label="${esc(c.name)} verbinden" data-id="${c.id}"></button>
          </div>`).join('')}
      </div>
      <button class="btn btn-accent btn-block" id="start" type="button">Alle verbinden</button>
      <div class="donation-note"><span aria-hidden="true">💚</span><span>${esc(DONATION.line)}</span></div>
    </section>`;
  await ctx.talk(SPEAKERS.onemachine(), 'Hallo, Weihnachtsmann! Ich bin OneMachine. Verbinde dein Postfach, dein Lager und deine Dokumente – dann legen wir los.');
  if (!ctx.isActive()) return;

  const toggles = [...root.querySelectorAll<HTMLButtonElement>('.toggle')];
  const start = root.querySelector<HTMLButtonElement>('#start')!;
  const allOn = () => toggles.every(x => x.getAttribute('aria-checked') === 'true');
  const connect = (t: HTMLButtonElement) => {
    if (t.getAttribute('aria-checked') === 'true') return;
    t.setAttribute('aria-checked', 'true');
    const def = CONNECTORS.find(c => c.id === t.dataset.id)!;
    const row = t.closest('.connector')!;
    row.classList.add('on');
    row.querySelector('.txt span')!.textContent = def.on;
    sfx.coin();
    // Die Kamera zeigt, was gerade verbunden wurde
    if (def.id === 'mail') {
      void world.shot('village', 800);
      world.ring(world.phonePt());
      world.say('santa', 'Postfach verbunden!', 1800, 'say-om');
    }
    if (def.id === 'db') {
      void world.shot('workshop', 800);
      world.shelfOn = true;
      world.elf.jump = 500;
      world.say('elf', 'Lager ist online!', 1800);
      world.sparkle({ x: 278, y: 96 });
    }
    if (def.id === 'drive') {
      void world.shot('cloud', 800);
      world.cloud.visible = true;
      world.tag('cloud', 'cloud', 'DRIVE', 'tag-small');
      world.sparkle(world.anchor('cloud')(), ['#ffffff', '#9fe0ff'], 18);
    }
    start.textContent = allOn() ? 'Los geht’s ▶' : 'Alle verbinden';
  };
  toggles.forEach(t => t.addEventListener('click', () => connect(t)));
  let starting = false;
  start.addEventListener('click', async () => {
    if (starting) return;
    starting = true;
    for (const t of toggles.filter(x => x.getAttribute('aria-checked') !== 'true')) {
      connect(t);
      await wait(1000);
      if (!ctx.isActive()) return;
    }
    await wait(400);
    world.santa.sweat = false;
    world.hoho();
    void world.shot('wide', 900);
    ctx.finish('connect');
  });
}

interface Notif { from: string; subject: string }

/** iOS-Sperrbildschirm: Datum, große Uhr und ein Stapel Mitteilungen. */
function lockScreen(root: HTMLElement, notifs: Notif[]) {
  setPhoneTheme(true);
  // So viele Mitteilungen zeigen, wie auf den Bildschirm passen – nie scrollen
  for (let max = Math.min(5, Math.max(1, notifs.length)); max >= 1; max--) {
    const shown = notifs.slice(0, max);
    const rest = notifs.length - shown.length;
    root.innerHTML = `
      <section class="lock">
        <div class="lock-date">Dienstag, 1. Dezember</div>
        <div class="lock-time">${storyTime()}</div>
        <div class="notifs" role="log" aria-label="Mitteilungen">
          ${shown.map(n => `
            <div class="notif">
              <span class="notif-ico">${MAIL_ICON}</span>
              <div class="notif-body">
                <div class="notif-top"><b>${esc(n.from)}</b><time>jetzt</time></div>
                <div class="notif-sub">${esc(n.subject)}</div>
              </div>
            </div>`).join('')}
          ${rest > 0 ? `<div class="notif-more">+${rest} weitere E-Mails</div>` : ''}
        </div>
        <div class="lock-foot">
          <span class="lock-btn" aria-hidden="true">🔦</span>
          <span class="lock-hint">${notifs.length ? `${notifs.length} neue E-Mails` : 'Santas iPhone'}</span>
          <span class="lock-btn" aria-hidden="true">📷</span>
        </div>
      </section>`;
    if (root.scrollHeight <= root.clientHeight + 1) break;
  }
}

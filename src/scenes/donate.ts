import type { SceneCtx } from '../main';
import { CTA, DONATION, JONAS_RECS } from '../content.de';
import { computeAudit, ledger } from '../state';
import { OM_AVATAR } from '../ui/chat';
import { SPEAKERS } from '../ui/dialog';
import { el, esc, wait } from '../ui/dom';
import { enableDrag } from '../ui/drag';
import { toast } from '../ui/learnCard';
import { sfx } from '../ui/sfx';
import { dataUrl, giftBox, icon } from '../world/pixels';
import { KIDS } from '../world/world';
import { REC_ICON } from './decision';
import { letters } from './intro';

export async function donate(ctx: SceneCtx) {
  const { world } = ctx;
  const { gifts, total, title } = computeAudit();
  ledger.donated = 0;

  ctx.root.innerHTML = `
    <section class="donate">
      <div class="app-bar" style="margin:-14px -14px 0">${OM_AVATAR}<span class="app-name">OneMachine</span><span class="app-agent">Finale</span></div>
      <h1>Auf nach Düsseldorf!</h1>
      <p class="lede" style="margin:0">Santa fliegt zur ${esc(DONATION.ngo)} <span class="dots" style="margin-left:4px"><i></i><i></i><i></i></span></p>
    </section>`;

  // Abflug vom Nordpol, Ankunft am Rhein
  world.santa.sweat = false;
  void world.shot('wide', 700);
  world.say('santa', 'Hohoho! Auf nach Düsseldorf!', 2000);
  await wait(1000);
  if (!ctx.isActive()) return;
  await world.takeOff();
  if (!ctx.isActive()) return;
  await world.wipe(() => {
    world.setMode('duesseldorf');
    world.basket.count = 0;
  });
  if (!ctx.isActive()) return;
  world.tag('ngo', { x: 271, y: 136 }, 'SUPPENKÜCHE', 'tag-sign tag-small');
  world.tag('rheinturm', { x: 78, y: 32 }, 'RHEINTURM', 'tag-small');
  await world.flyIn(178, 98);
  if (!ctx.isActive()) return;
  await ctx.talk(SPEAKERS.narrator(), `Düsseldorf, am Rhein. Als „${title}“ hast du ${total} Punkte und ${gifts} Geschenke verdient. Leg sie in den Spendenkorb!`);
  if (!ctx.isActive()) return;
  await world.shot('basket', 1100);
  if (!ctx.isActive()) return;
  world.tag('basket', 'basket', `SPENDENKORB 0/${gifts}`, 'tag-ok');

  ctx.root.innerHTML = `
    <section class="donate">
      <div class="app-bar" style="margin:-14px -14px 0">${OM_AVATAR}<span class="app-name">OneMachine</span><span class="app-agent">Spendenkorb</span></div>
      <h1>Geschenke für Düsseldorf</h1>
      <p class="hint"><span aria-hidden="true">👆</span><span>Zieh jedes Geschenk in den Korb – oder tippe es einfach an.</span></p>
      <div class="gift-shelf" aria-label="Deine Geschenke">
        ${Array.from({ length: gifts }, (_, i) => `<button class="gift" type="button" aria-label="Geschenk ${i + 1} spenden" data-i="${i}" style="--i:${i}"><img src="${dataUrl(giftBox(i), 4)}" alt="" /></button>`).join('')}
      </div>
      <div class="donate-count" aria-live="polite">0 / ${gifts} IM KORB</div>
      <button class="btn btn-ghost btn-block" type="button" id="all">Alle in den Korb</button>
      <button class="btn btn-accent btn-block" type="button" id="finish" disabled>Spende abschließen</button>
    </section>`;

  // Großzügige Trefferzone rund um den Korb
  const r = world.screenRect(168, 112, 96, 88);
  const zone = el(`<div class="drop-zone" aria-hidden="true" style="left:${r.left};top:${r.top};width:${r.width};height:${r.height}"></div>`);
  world.ui.appendChild(zone);

  const counter = ctx.root.querySelector<HTMLElement>('.donate-count')!;
  const finish = ctx.root.querySelector<HTMLButtonElement>('#finish')!;
  const allBtn = ctx.root.querySelector<HTMLButtonElement>('#all')!;
  const items = [...ctx.root.querySelectorAll<HTMLElement>('.gift')];

  const add = async (item: HTMLElement) => {
    if (item.dataset.done) return;
    item.dataset.done = '1';
    item.setAttribute('aria-disabled', 'true');
    ledger.donated++;
    finish.disabled = false;
    counter.textContent = `${ledger.donated} / ${gifts} IM KORB`;
    counter.classList.remove('bump');
    void counter.offsetWidth;
    counter.classList.add('bump');
    if (ledger.donated === gifts) allBtn.hidden = true;
    await world.dropGift(giftBox(Number(item.dataset.i)));
    if (!ctx.isActive()) return;
    world.tag('basket', 'basket', `SPENDENKORB ${world.basket.count}/${gifts}`, 'tag-ok');
    if (world.basket.count === gifts) {
      toast(ctx.overlay, 'Der Korb ist voll!');
      zone.remove();
      world.hoho();
      world.say('santa', 'Frohe Weihnachten, Düsseldorf!', 2600);
    }
  };
  enableDrag({ items, target: zone, onDrop: add });

  allBtn.addEventListener('click', async () => {
    allBtn.disabled = true;
    for (const i of items) { if (!ctx.isActive()) return; void add(i); await wait(240); }
  });

  await new Promise<void>(res => finish.addEventListener('click', () => res(), { once: true }));
  if (!ctx.isActive()) return;
  sfx.select();
  zone.remove();
  await endScene(ctx);
}

async function endScene(ctx: SceneCtx) {
  const { world } = ctx;
  const a = computeAudit();
  const okByName = new Map(a.children.map(c => [c.name, c.ok]));
  const jacket = ledger.jonas.jacke === 'accept';
  const jonasGift = JONAS_RECS.find(r => ledger.jonas[r.id] === 'accept');
  const GIFT: Record<string, string> = { lena: 'malset', ben: 'fussball', emma: 'bausteine', paul: 'auto', mateo: 'teleskop' };
  const happy: string[] = [];

  await world.wipe(() => {
    world.setMode('xmas');
    world.kids.clear();
    world.fx.snowLevel = 0.6;
    world.santa.phone = false;
    world.cloud.visible = false;
    ['lena', 'ben', 'mateo', 'jonas', 'emma', 'paul'].forEach((id, i) => {
      const k = world.addKid(id, 28 + i * 18, 160);
      const ok = id === 'jonas' ? !!jonasGift && ledger.driveFound : okByName.get(KIDS[id].name) ?? false;
      if (ok) {
        k.pose = 'cheer';
        k.gift = icon(id === 'jonas' ? REC_ICON[jacket ? 'jacke' : jonasGift!.id] : GIFT[id]);
        happy.push(id);
      } else k.sad = true;
      if (id === 'jonas' && jacket && ledger.driveFound) k.pal = { ...k.pal, t: '#d62f3a', T: '#8f1d2c' };
    });
    world.sleigh.flying = 1;
    world.sleigh.x = -100;
    world.sleigh.y = 60;
    world.santa.wave = true;
    world.fireworks = true;
    void world.shot('village', 0);
  });
  if (!ctx.isActive()) return;
  setTimeout(() => { if (ctx.isActive()) void world.shot('wide', 3200); }, 5200);
  const banner = el(`<div class="end-banner" role="img" aria-label="Frohe Weihnachten!">${letters('FROHE WEIHNACHTEN!')}</div>`);
  world.ui.appendChild(banner);
  sfx.fanfare();
  if (jacket && ledger.driveFound) setTimeout(() => { if (ctx.isActive()) world.say('jonas', 'Eine warme Jacke! Danke!', 3200); }, 1300);
  happy.forEach((id, i) => setTimeout(() => { if (ctx.isActive()) world.emote(id, '♥', 1500); }, 2600 + i * 500));

  ctx.overlay.innerHTML = '';
  ctx.root.innerHTML = `
    <section class="endcard">
      <div class="app-bar">${OM_AVATAR}<span class="app-name">OneMachine</span></div>
      <h1>Frohe Weihnachten!</h1>
      <p class="thanks">Danke fürs Mitspielen! Du hast ${ledger.donated} ${ledger.donated === 1 ? 'Geschenk' : 'Geschenke'} in den Spendenkorb gelegt.</p>
      <p class="thanks">Für jeden Besuch spenden wir an die <span class="ngo">${esc(DONATION.ngo)}</span> in ${esc(DONATION.city)}.</p>
      <div class="automate">${OM_AVATAR}<span><b>Tipp:</b> Mit „Automatisieren“ sortiert OneMachine Santas Postfach ab jetzt jeden Morgen um 7 Uhr – ganz von allein.</span></div>
      <div class="end-actions">
        <a class="btn btn-accent btn-block" href="${esc(CTA.url)}" target="_blank" rel="noopener">${esc(CTA.label)}</a>
        <button class="btn btn-ghost btn-block" type="button" id="share">Spiel teilen</button>
        <button class="btn btn-ghost btn-block" type="button" id="again">Nochmal spielen</button>
      </div>
      <p class="muted" style="font-size:14.5px">Herzliche Grüße von MindsMachines</p>
    </section>`;

  ctx.root.querySelector('#again')!.addEventListener('click', () => { banner.remove(); ctx.restart(); });
  ctx.root.querySelector('#share')!.addEventListener('click', async () => {
    const data = { title: 'Santas Postfach · OneMachine', text: 'Hilf dem Weihnachtsmann – für jeden Besuch wird an die Suppenküche der Franziskaner in Düsseldorf gespendet.', url: location.origin + location.pathname };
    try {
      if (navigator.share) await navigator.share(data);
      else { await navigator.clipboard.writeText(data.url); toast(ctx.overlay, 'Link kopiert'); }
    } catch { /* abgebrochen */ }
  });
}

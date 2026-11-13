'use strict';
const DATA_VERSION = '20261113-art1';

const classes = [
  ['druid', 'Друид', '#ffae67'], ['shaman', 'Шаман', '#77b7ff'],
  ['priest', 'Жрец', '#e9e6dd'], ['warrior', 'Воин', '#d7b18a'],
  ['paladin', 'Паладин', '#efabd1'], ['rogue', 'Разбойник', '#f1dc88'],
  ['warlock', 'Чернокнижник', '#b9a7ee'], ['mage', 'Маг', '#92d8ed'],
  ['hunter', 'Охотник', '#b8d989']
];
const titles = {
  'feral-druid': 'ферала-кота', 'feral-tank-druid': 'медведя',
  'restoration-druid': 'друида-хила', 'balance-druid': 'совы',
  'restoration-shaman': 'шамана-хила', 'enhancement-shaman': 'энх-шамана',
  'elemental-shaman': 'элем-шамана', 'shadow-priest': 'ШП',
  'holy-priest': 'холи-приста', 'discipline-priest': 'дисц-приста',
  'fury-warrior': 'фури-воина', 'arms-warrior': 'армс-воина',
  'protection-warrior': 'воина-танка', 'holy-paladin': 'холи-паладина',
  'protection-paladin': 'паладина-танка', 'retribution-paladin': 'ретри-паладина',
  'assassination-rogue': 'мути-роги', 'combat-rogue': 'комбат-роги',
  'subtlety-rogue': 'саб-роги', 'affliction-warlock': 'аффли-варлока',
  'demonology-warlock': 'демонолога', 'destruction-warlock': 'дестро-варлока',
  'fire-mage': 'фаер-мага', 'frost-mage': 'фрост-мага', 'arcane-mage': 'аркан-мага',
  'beast-mastery-hunter': 'БМ-охотника', 'marksmanship-hunter': 'ММ-охотника',
  'survival-hunter': 'сурв-охотника'
};
const list = document.querySelector('#slots');
const dialog = document.querySelector('#item-dialog');
const tooltip = document.querySelector('#item-tooltip');
let tooltipAnchor = null;
let specs = [];
let selectedSpec;
let dungeons = [];
let artwork = {};
let artworkRequest = 0;

function renderArtwork(spec) {
  const entry = artwork[spec.id];
  const media = document.querySelector('#hero-media');
  const credit = document.querySelector('#art-credit');
  const request = ++artworkRequest;
  media.classList.remove('is-ready');
  credit.hidden = true;
  if (!entry) { media.replaceChildren(); return; }
  const img = new Image();
  img.id = 'hero-image';
  img.alt = classes.find(([id]) => id === spec.classId)[1] + ' — ' + spec.label;
  img.width = 960;
  img.height = 480;
  img.decoding = 'async';
  img.fetchPriority = 'high';
  img.style.objectPosition = entry.position || '50% 50%';
  img.onload = () => {
    if (request !== artworkRequest) return;
    media.replaceChildren(img);
    media.dataset.spec = spec.id;
    requestAnimationFrame(() => media.classList.add('is-ready'));
    credit.href = entry.source;
    credit.hidden = false;
  };
  img.onerror = () => {
    if (request === artworkRequest) media.replaceChildren();
  };
  img.src = entry.src;
}

function element(tag, className, text) {
  const node = document.createElement(tag);
  if (className) node.className = className;
  if (text !== undefined) node.textContent = text;
  return node;
}

function externalLink(title, href) {
  const node = element('a', '', title + ' ↗');
  if (!/^https:\/\//.test(href)) return node;
  node.href = href;
  node.target = '_blank';
  node.rel = 'noopener noreferrer';
  return node;
}

function itemIcon(item) {
  if (!item.icon) return element('span', 'item-gem', '◆');
  const img = element('img', 'icon');
  img.src = item.icon;
  img.alt = '';
  img.width = 48;
  img.height = 48;
  img.loading = 'lazy';
  img.addEventListener('error', () => img.replaceWith(element('span', 'item-gem', '◆')), {once:true});
  return img;
}

function facts(item) {
  const ul = element('ul', 'facts');
  for (const stat of item.stats || []) ul.append(element('li', '', stat));
  return ul;
}

function hideTooltip() {
  tooltipAnchor?.removeAttribute('aria-describedby');
  tooltipAnchor = null;
  tooltip.hidden = true;
}

function showTooltip(anchor, item) {
  if (dialog.open) return;
  hideTooltip();
  tooltipAnchor = anchor;
  anchor.setAttribute('aria-describedby', 'item-tooltip');
  tooltip.replaceChildren(element('strong', 'quality-' + (item.quality || 3), item.name), facts(item));
  tooltip.hidden = false;
  const bounds = anchor.getBoundingClientRect();
  const popup = tooltip.getBoundingClientRect();
  tooltip.style.left = Math.max(8, Math.min(bounds.left, innerWidth - popup.width - 8)) + 'px';
  tooltip.style.top = Math.max(8, Math.min(bounds.bottom + 8, innerHeight - popup.height - 8)) + 'px';
}

function openItem(slot, item) {
  const heading = element('h2', 'quality-' + (item.quality || 3), item.name);
  heading.id = 'dialog-title';
  const header = element('div', 'dialog-heading');
  header.append(itemIcon(item), heading);
  const body = document.querySelector('#dialog-content');
  body.replaceChildren(element('p', 'eyebrow', slot.label + ' / ' + selectedSpec.label), header);
  if (item.nameEn && item.nameEn !== item.name) body.append(element('p', 'original-name', item.nameEn));
  const layout = element('div', 'dialog-layout');
  const summary = element('section', 'item-summary');
  summary.append(element('h3', '', 'Характеристики'), facts(item));
  const guide = element('section', 'item-guide');
  guide.append(element('h3', '', 'Как получить'), element('p', 'place', [item.source, item.location].filter(Boolean).join(' · ')));
  layout.append(summary, guide);
  body.append(layout);
  if (item.steps?.length) {
    const route = element('ol', 'route');
    item.steps.filter(step => !item.materialList?.length || !/^(?:Материалы|Реагенты)(?:[:\s]|$)/i.test(step)).forEach(step => route.append(element('li', '', step)));
    guide.append(route);
  }
  if (item.materialList?.length) {
    const materials = element('section', 'materials');
    materials.append(element('h3', '', 'Материалы'));
    if (item.recipeEquipment) materials.append(element('p', '', item.recipeEquipment));
    const rows = element('ul', 'materials-list');
    for (const material of item.materialList) {
      const row = element('li');
      row.append(element('span', 'quantity', '×' + material.quantity), externalLink(material.name, material.url));
      rows.append(row);
    }
    materials.append(rows);
    if (item.recipeSourceUrl) materials.append(externalLink('Состав рецепта', item.recipeSourceUrl));
    guide.append(materials);
  }
  const locationText = [item.location, item.source].filter(Boolean).join(' ');
  const dungeon = dungeons.find(entry => new RegExp(entry.match, 'i').test(locationText));
  if (dungeon) {
    const section = element('section', 'dungeon-route');
    section.append(element('h3', '', 'Как добраться'));
    const route = element('ol', 'route');
    for (const step of dungeon.steps) route.append(element('li', '', step));
    for (const boss of dungeon.bossSteps || []) {
      if (new RegExp(boss.match, 'i').test(locationText)) route.append(element('li', '', boss.text));
    }
    section.append(route, externalLink('Маршрут и боссы', dungeon.source));
    guide.append(section);
  }
  const links = element('div', 'source-links');
  for (const entry of item.links || []) {
    const [title, url] = Array.isArray(entry) ? entry : [entry.label || entry.title, entry.url];
    if (title && url) links.append(externalLink(title, url));
  }
  if (!links.childElementCount && selectedSpec.sourceUrl) links.append(externalLink('Источник', selectedSpec.sourceUrl));
  guide.append(links);
  const note = item.note || item.acquisition?.guideNote || item.acquisition?.note;
  if (note) guide.append(element('p', 'item-note', note));
  hideTooltip();
  dialog.showModal();
}

function itemCard(slot, item) {
  const card = element('article', 'gear-card');
  const preview = element('button', 'item-preview');
  preview.type = 'button';
  preview.append(itemIcon(item), element('strong', 'quality-' + (item.quality || 3), item.name));
  preview.addEventListener('pointerenter', e => { if (e.pointerType !== 'touch') showTooltip(preview, item); });
  preview.addEventListener('pointerleave', hideTooltip);
  preview.addEventListener('focus', () => showTooltip(preview, item));
  preview.addEventListener('blur', hideTooltip);
  preview.addEventListener('click', () => openItem(slot, item));
  const more = element('button', 'more', 'Подробнее ↗');
  more.type = 'button';
  more.setAttribute('aria-label', 'Подробнее о ' + item.name);
  more.addEventListener('click', () => openItem(slot, item));
  card.append(preview, element('p', 'origin', [item.source, item.location].filter(Boolean).join(' · ')), more);
  return card;
}

function renderSpec() {
  const id = location.hash.slice(1);
  selectedSpec = specs.find(spec => spec.id === id) || specs[0];
  const currentClass = classes.find(([key]) => key === selectedSpec.classId);
  document.documentElement.style.setProperty('--accent', currentClass[2]);
  renderArtwork(selectedSpec);
  document.querySelector('#spec-title').textContent = titles[selectedSpec.id] || selectedSpec.label.toLowerCase();
  const roleName = {heal:'ЛЕЧЕНИЕ',healer:'ЛЕЧЕНИЕ',tank:'ТАНК',dps:'УРОН',ranged:'ДАЛЬНИЙ БОЙ'}[selectedSpec.role.toLowerCase()] || selectedSpec.role.toUpperCase();
  document.querySelector('#role').textContent = 'ОРДА / ' + currentClass[1].toUpperCase() + ' / ' + roleName;
  document.title = selectedSpec.label + ' · Экипировка WoW Forever';
  document.querySelector('#classes').replaceChildren(...classes.map(([classId, name, color]) => {
    const button = element('button', 'class-button', name);
    button.type = 'button';
    button.style.setProperty('--class-color', color);
    button.setAttribute('aria-pressed', String(classId === selectedSpec.classId));
    button.addEventListener('click', () => {
      const first = specs.find(spec => spec.classId === classId);
      if (first) location.hash = first.id;
    });
    return button;
  }));
  document.querySelector('#specs').replaceChildren(...specs.filter(spec => spec.classId === selectedSpec.classId).map(spec => {
    const button = element('button', 'spec-button', spec.label);
    button.type = 'button';
    button.setAttribute('aria-pressed', String(spec.id === selectedSpec.id));
    button.addEventListener('click', () => { location.hash = spec.id; });
    return button;
  }));
  hideTooltip();
  if (dialog.open) dialog.close();
  list.replaceChildren(...selectedSpec.slots.map((slot, index) => {
    const details = element('details', 'slot');
    details.open = index === 0;
    const summary = element('summary', 'slot-summary');
    summary.append(element('strong', 'slot-name', slot.label), element('span', 'top-name', slot.items.length + ' варианта'), element('span', 'chevron'));
    const cards = element('div', 'gear-cards');
    cards.append(...slot.items.map(item => itemCard(slot, item)));
    details.append(summary, cards);
    return details;
  }));
  document.querySelector('#count').textContent = selectedSpec.slots.length + ' слотов · ' + selectedSpec.slots.reduce((sum, slot) => sum + slot.items.length, 0) + ' вариантов';
  const scope = document.querySelector('#scope');
  scope.replaceChildren(element('h3', '', 'О подборке'));
  scope.append(element('p', '', selectedSpec.note || 'Варианты экипировки 60-го уровня перед первыми рейдами. Список источника не ранжирован. Характеристики и добыча — по сторонней базе Forever, номер билда не указан.'));
  if (selectedSpec.id === 'holy-priest') scope.append(element('p', '', 'Holy выбран для рейдового лечения группы. Discipline доступен отдельной подборкой.'));
  const source = element('p', 'snapshot', (selectedSpec.checkedAt === '2026-11-12' ? '12' : '13') + ' ноября 2026 · ');
  if (selectedSpec.sourceUrl) source.append(externalLink('Источник подборки', selectedSpec.sourceUrl));
  scope.append(source);
}

document.querySelector('#close-dialog').addEventListener('click', () => dialog.close());
dialog.addEventListener('click', event => { if (event.target === dialog) dialog.close(); });
window.addEventListener('scroll', hideTooltip, {passive:true});
window.addEventListener('resize', hideTooltip);
window.addEventListener('hashchange', () => { if (specs.length) renderSpec(); });
document.addEventListener('keydown', event => { if (event.key === 'Escape') hideTooltip(); });

async function loadData() {
  try {
    const response = await fetch('art.json?v=' + DATA_VERSION);
    if (response.ok) artwork = await response.json();
  } catch { /* Equipment stays usable when artwork is unavailable. */ }
  try {
    const response = await fetch('dungeons.json?v=' + DATA_VERSION);
    if (response.ok) dungeons = await response.json();
  } catch { /* Item sources remain available if the route file cannot load. */ }
  const files = ['feral', 'bear', 'healers', 'melee', 'casters', 'hunter'];
  const results = await Promise.allSettled(files.map(async name => {
    const response = await fetch(name + '.json?v=' + DATA_VERSION);
    if (!response.ok) throw new Error(name);
    const data = await response.json();
    if (!Array.isArray(data.specs)) throw new Error(name);
    return data.specs;
  }));
  specs = results.flatMap(result => result.status === 'fulfilled' ? result.value : []);
  const status = document.querySelector('#status');
  if (!specs.length) { status.textContent = 'Не удалось загрузить экипировку. Обнови страницу.'; return; }
  const missing = results.some(result => result.status === 'rejected');
  status.hidden = !missing;
  status.textContent = missing ? 'Часть подборок не загрузилась. Обнови страницу.' : '';
  renderSpec();
}
loadData();

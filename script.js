// 熱門遊戲頁籤切換：切換對應的遊戲清單；上方分類導覽也能切到同一分類
const selectTab = (tab, { scroll = true } = {}) => {
  const tabs = tab.closest('.tabs');
  tabs.querySelectorAll('.tab').forEach((t) => {
    const on = t === tab;
    t.classList.toggle('is-active', on);
    t.setAttribute('aria-selected', on);
    const panel = document.getElementById(t.getAttribute('aria-controls'));
    if (!panel) return;
    panel.hidden = !on;
    if (on) { panel.classList.remove('is-entering'); void panel.offsetWidth; panel.classList.add('is-entering'); }
  });
  if (scroll) tab.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'center' });
};
document.querySelectorAll('.tabs').forEach((tabs) => {
  tabs.addEventListener('click', (e) => {
    const tab = e.target.closest('.tab');
    if (tab) selectTab(tab);
  });
});

// 最新公告：複製一組內容，讓跑馬燈無縫循環（動畫移動 -50%）
document.querySelectorAll('.notice__track').forEach((track) => {
  const group = track.querySelector('.notice__group');
  if (!group) return;
  const clone = group.cloneNode(true);
  clone.setAttribute('aria-hidden', 'true');
  track.appendChild(clone);
  // 固定捲動速度（每秒 120px），公告長短改變時速度不變
  const SPEED = 120;
  const setDuration = () => track.style.setProperty('--marquee-duration', (group.offsetWidth / SPEED) + 's');
  setDuration();
  window.addEventListener('resize', setDuration);
  document.fonts?.ready.then(setDuration);
});

// 高效服務：捲動到畫面時，圓弧畫出、數字從 0 遞增；滑鼠移上可重播
(() => {
  const stats = document.querySelector('.stats');
  if (!stats || !('IntersectionObserver' in window)) return;
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;

  const DURATION = 1600;
  const ease = (t) => 1 - Math.pow(1 - t, 3);
  const items = [...stats.querySelectorAll('.stat')];

  const play = (stat) => {
    const num = stat.querySelector('.ring__num');
    const target = +num.dataset.count;
    const delay = parseFloat(stat.style.getPropertyValue('--delay')) * 1000 || 0;
    stat.classList.remove('is-in');
    void stat.offsetWidth;                // 重新觸發 transition
    stat.classList.add('is-in');
    num.textContent = '0';
    const start = performance.now() + delay;
    const tick = (now) => {
      const t = Math.min(Math.max((now - start) / DURATION, 0), 1);
      num.textContent = Math.round(ease(t) * target);
      if (t < 1) requestAnimationFrame(tick);
    };
    requestAnimationFrame(tick);
  };

  items.forEach((s, i) => {
    s.style.setProperty('--delay', (i * 0.15) + 's');
    s.querySelector('.ring__num').textContent = '0';
  });
  stats.classList.add('is-armed');

  const io = new IntersectionObserver((entries) => {
    if (entries.some((e) => e.isIntersecting)) {
      items.forEach(play);
      io.disconnect();
    }
  }, { threshold: 0.4 });
  io.observe(stats);

  items.forEach((s) => s.addEventListener('mouseenter', () => {
    if (!s.classList.contains('is-in')) return;
    s.style.setProperty('--delay', '0s');
    play(s);
  }));
})();

// Banner 輪播：每 3 秒自動切換，滑鼠移入暫停，可點指示點或左右滑動
(() => {
  const banner = document.querySelector('.banner');
  if (!banner) return;
  const track = banner.querySelector('.banner__track');
  const slides = [...track.children];
  const dots = [...banner.querySelectorAll('.banner__dot')];
  const INTERVAL = 3000;
  const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  let index = 0, timer = null;

  const go = (i) => {
    index = (i + slides.length) % slides.length;
    track.style.transform = `translateX(${-index * 100}%)`;
    slides.forEach((s, n) => s.toggleAttribute('aria-hidden', n !== index));
    dots.forEach((d, n) => {
      d.classList.toggle('is-active', n === index);
      if (n === index) d.setAttribute('aria-current', 'true'); else d.removeAttribute('aria-current');
    });
  };
  const stop = () => { clearInterval(timer); timer = null; };
  const start = () => { if (reduce || timer) return; timer = setInterval(() => go(index + 1), INTERVAL); };
  const restart = () => { stop(); start(); };

  dots.forEach((d, n) => d.addEventListener('click', () => { go(n); restart(); }));
  banner.addEventListener('mouseenter', stop);
  banner.addEventListener('mouseleave', start);
  banner.addEventListener('focusin', stop);
  banner.addEventListener('focusout', start);
  document.addEventListener('visibilitychange', () => (document.hidden ? stop() : start()));

  // 拖曳 / 手指滑動
  let startX = 0, dx = 0, dragging = false;
  banner.addEventListener('pointerdown', (e) => {
    if (e.target.closest('.banner__dot')) return;
    dragging = true; startX = e.clientX; dx = 0;
    banner.classList.add('is-dragging'); banner.setPointerCapture(e.pointerId); stop();
  });
  banner.addEventListener('pointermove', (e) => {
    if (!dragging) return;
    dx = e.clientX - startX;
    track.style.transform = `translateX(calc(${-index * 100}% + ${dx}px))`;
  });
  const end = () => {
    if (!dragging) return;
    dragging = false; banner.classList.remove('is-dragging');
    const limit = banner.clientWidth * 0.15;
    go(dx < -limit ? index + 1 : dx > limit ? index - 1 : index);
    if (!banner.matches(':hover')) start();
  };
  banner.addEventListener('pointerup', end);
  banner.addEventListener('pointercancel', end);

  go(0);
  start();
})();

// 娛樂城常見問題：點題目展開／收合答案
document.querySelectorAll('.faq__item').forEach((item) => {
  const btn = item.querySelector('.faq__toggle');
  btn?.addEventListener('click', () => {
    const open = !item.classList.contains('is-open');
    item.classList.toggle('is-open', open);
    btn.setAttribute('aria-expanded', open);
  });
});

// 分類頁頁尾的平台輪播：平台多到放不下時自動循環捲動，放得下時置中顯示
document.querySelectorAll('.platform-strip').forEach((strip) => {
  const viewport = strip.querySelector('.platform-strip__viewport');
  const track = strip.querySelector('.platform-strip__track');
  const originals = [...track.children];
  const SPEED = 50;   // 每秒移動 px
  let clones = [];

  const layout = () => {
    clones.forEach((c) => c.remove()); clones = [];
    strip.classList.remove('is-scrolling');
    const needed = track.scrollWidth > viewport.clientWidth;
    if (!needed) return;
    originals.forEach((li) => {
      const c = li.cloneNode(true);
      c.setAttribute('aria-hidden', 'true');
      c.querySelector('a')?.setAttribute('tabindex', '-1');
      track.appendChild(c); clones.push(c);
    });
    strip.style.setProperty('--strip-duration', (track.scrollWidth / 2 / SPEED) + 's');
    strip.classList.add('is-scrolling');
  };
  let t;
  window.addEventListener('resize', () => { clearTimeout(t); t = setTimeout(layout, 150); });
  layout();
});

// 手機／平板頁首：選單按鈕展開分類，點外面、按 Esc 或點連結後收起
(() => {
  const btn = document.querySelector('.menu-toggle');
  const nav = document.getElementById('mainnav');
  if (!btn || !nav) return;
  const set = (open) => {
    nav.classList.toggle('is-open', open);
    btn.setAttribute('aria-expanded', open);
    btn.setAttribute('aria-label', open ? '關閉選單' : '開啟選單');
  };
  btn.addEventListener('click', () => set(btn.getAttribute('aria-expanded') !== 'true'));
  document.addEventListener('click', (e) => { if (!e.target.closest('.topbar')) set(false); });
  document.addEventListener('keydown', (e) => { if (e.key === 'Escape') set(false); });
  window.matchMedia('(min-width: 1101px)').addEventListener('change', (e) => { if (e.matches) set(false); });
})();

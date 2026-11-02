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

// 上方導覽列：點擊分類展開對應的平台視窗，再點一次、點外面或按 Esc 關閉
(() => {
  const items = [...document.querySelectorAll('.catnav__item[data-menu]')];
  const wrap = document.querySelector('.platform-menus');
  if (!items.length || !wrap) return;
  const menuOf = (b) => document.getElementById(b.getAttribute('aria-controls'));
  const close = () => {
    wrap.classList.remove('is-open');
    wrap.setAttribute('aria-hidden', 'true');
    items.forEach((b) => b.setAttribute('aria-expanded', 'false'));
  };
  items.forEach((btn) => btn.addEventListener('click', () => {
    const wasOpen = btn.getAttribute('aria-expanded') === 'true';
    if (wasOpen) { close(); return; }
    items.forEach((b) => {
      const on = b === btn;
      b.setAttribute('aria-expanded', on);
      menuOf(b).classList.toggle('is-active', on);
    });
    menuOf(btn).querySelector('.platform-menu__row').scrollLeft = 0;
    wrap.classList.add('is-open');
    wrap.setAttribute('aria-hidden', 'false');
  }));
  document.addEventListener('click', (e) => {
    if (!e.target.closest('.catnav, .platform-menus')) close();
  });
  document.addEventListener('keydown', (e) => { if (e.key === 'Escape') close(); });

  // 平台列橫向滑卡：手指滑動、滑鼠拖曳、滾輪與左右箭頭都能切換
  document.querySelectorAll('.platform-menu').forEach((menu) => {
    const row = menu.querySelector('.platform-menu__row');
    const prev = menu.querySelector('.platform-menu__arrow--prev');
    const next = menu.querySelector('.platform-menu__arrow--next');
    const step = () => {
      const card = row.querySelector('li');
      const gap = parseFloat(getComputedStyle(row).columnGap) || 0;
      const per = card ? card.offsetWidth + gap : 300;
      return Math.max(per, Math.floor(row.clientWidth / per) * per);   // 一次捲過一整頁的卡片
    };
    const update = () => {
      const max = row.scrollWidth - row.clientWidth;
      if (prev) prev.hidden = row.scrollLeft <= 2;
      if (next) next.hidden = row.scrollLeft >= max - 2;
    };
    prev?.addEventListener('click', () => row.scrollBy({ left: -step(), behavior: 'smooth' }));
    next?.addEventListener('click', () => row.scrollBy({ left: step(), behavior: 'smooth' }));
    row.addEventListener('scroll', update, { passive: true });
    window.addEventListener('resize', update);
    new MutationObserver(update).observe(menu, { attributes: true, attributeFilter: ['class'] });
    update();

    // 滑鼠滾輪上下滾動 → 左右捲動
    row.addEventListener('wheel', (e) => {
      if (row.scrollWidth <= row.clientWidth || Math.abs(e.deltaX) > Math.abs(e.deltaY)) return;
      e.preventDefault();
      row.scrollBy({ left: e.deltaY });
    }, { passive: false });

    // 滑鼠拖曳（觸控裝置用原生滑動）
    let startX = 0, startLeft = 0, moved = false, down = false;
    row.addEventListener('pointerdown', (e) => {
      if (e.pointerType !== 'mouse' || e.button !== 0) return;
      down = true; moved = false; startX = e.clientX; startLeft = row.scrollLeft;
    });
    window.addEventListener('pointermove', (e) => {
      if (!down) return;
      const dx = e.clientX - startX;
      if (!moved && Math.abs(dx) > 5) { moved = true; row.classList.add('is-dragging'); }
      if (moved) row.scrollLeft = startLeft - dx;
    });
    window.addEventListener('pointerup', () => {
      if (!down) return;
      down = false;
      if (moved) {
        row.classList.remove('is-dragging');
        // 放開後對齊最近的一張卡片
        const per = (row.querySelector('li')?.offsetWidth || 1) + (parseFloat(getComputedStyle(row).columnGap) || 0);
        row.scrollTo({ left: Math.round(row.scrollLeft / per) * per, behavior: 'smooth' });
      }
    });
    // 拖曳後放開不觸發卡片連結
    row.addEventListener('click', (e) => { if (moved) { e.preventDefault(); e.stopPropagation(); moved = false; } }, true);
  });

})();

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

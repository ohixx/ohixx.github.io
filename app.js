(() => {
  const $ = (s) => document.querySelector(s);
  const viewport = $('#viewport'), world = $('#world'), grid = $('#grid'), wires = $('#wires');
  const coords = $('#coords'), hint = $('#hint'), toastEl = $('#toast'), video = $('#bg');
  const islands = { bio: $('#bio'), links: $('#links'), orders: $('#orders') };
  const reduceMotion = matchMedia('(prefers-reduced-motion: reduce)').matches;

  const Z_MIN = 0.2, Z_MAX = 2.5, GAP = 72;

  const esc = (s) => s.replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

  function renderFunpay() {
    const url = (typeof FUNPAY === 'string' ? FUNPAY : '').trim();
    if (!/^https?:\/\//i.test(url)) return;
    const a = $('#funpay');
    a.href = url;
    a.classList.remove('soon');
    a.querySelector('small').textContent = url.replace(/^https?:\/\/(www\.)?/i, '').replace(/\/$/, '');
  }

  const languageIcons = {
    C: 'c', 'C++': 'cplusplus', 'C#': 'csharp', Python: 'python', HTML: 'html5'
  };

  function orderCard({ nickname: who = '', lang = '', order: what = '', rate = 5 }) {
      const stars = '★'.repeat(Math.min(5, Math.max(0, Number(rate) || 0)));
      const icon = languageIcons[lang];
      const iconSrc = icon === 'csharp'
        ? 'https://cdn.jsdelivr.net/gh/devicons/devicon@latest/icons/csharp/csharp-original.svg'
        : 'https://cdn.simpleicons.org/' + icon;
      return '<article class="order">' +
        '<div class="order-top"><span class="who">' + esc(who || 'аноним') + '</span>' +
        '<span class="status done">выполнен</span></div>' +
        (what ? '<p class="what">' + esc(what) + '</p>' : '') +
        '<div class="order-bot">' +
        (lang ? '<span class="lang"><img src="' + iconSrc + '" alt="">' + esc(lang) + '</span>' : '') +
        '<span class="rating" aria-label="оценка ' + esc(String(rate)) + ' из 5">' + stars + '</span></div>' +
        '</article>';
  }

  function extraOrderIsland(index, count) {
    const id = `orders-${index + 1}`;
    const section = document.createElement('section');
    section.className = 'island orders-page'; section.id = id; section.setAttribute('aria-label', `заказы клиентов, страница ${index + 1}`);
    section.innerHTML = `<header class="bar"><span class="path">~/orders/${String(index + 1).padStart(2, '0')}</span><span class="count">${count}</span><i class="stripes"></i></header><div class="orders-list"></div>`;
    world.insertBefore(section, wires.nextSibling);
    islands[id] = section;
    return section.querySelector('.orders-list');
  }

  function renderOrders(rows) {
    Object.keys(islands).filter((key) => key.startsWith('orders-')).forEach((key) => {
      islands[key].remove(); delete islands[key]; delete rects[key];
    });
    $('#orders-count').textContent = rows.length;
    const pages = [];
    for (let index = 0; index < rows.length; index += 12) pages.push(rows.slice(index, index + 12));
    const firstList = $('#orders-list');

    if (!pages.length) {
      firstList.innerHTML = '<div class="empty"><pre> /\\_/\\\n( o.o )\n &gt; ^ &lt;</pre><b>заказов пока нет</b>тут появятся выполненные заказы<br><button data-go="links">стать первым →</button></div>';
      return;
    }

    pages.forEach((page, index) => {
      const list = index === 0 ? firstList : extraOrderIsland(index, page.length);
      list.innerHTML = page.map(orderCard).join('');
    });

    requestAnimationFrame(() => {
      layout();
      render();
    });
  }

  fetch('orders.json')
    .then((response) => response.ok ? response.json() : Promise.reject())
    .then((orders) => {
      const allowed = Array.isArray(orders)
        ? orders.filter((order) => order && Object.prototype.hasOwnProperty.call(languageIcons, order.lang))
        : [];
      renderOrders(allowed);
    })
    .catch(() => renderOrders([]));

  const rects = {};
  let narrow = null;

  function layout() {
    narrow = innerWidth < 900;
    document.body.classList.toggle('narrow', narrow);

    const size = (el) => ({ w: el.offsetWidth, h: el.offsetHeight });
    const b = size(islands.bio), l = size(islands.links), o = size(islands.orders);

    rects.bio = { x: -b.w / 2, y: -b.h / 2, ...b };
    rects.links = narrow
      ? { x: -l.w / 2, y: rects.bio.y + b.h + GAP, ...l }
      : { x: rects.bio.x - GAP - l.w, y: rects.bio.y + 40, ...l };
    rects.orders = { x: rects.bio.x + b.w + GAP, y: rects.bio.y - 40, ...o };

    const orderKeys = Object.keys(islands).filter((key) => key === 'orders' || key.startsWith('orders-'));
    orderKeys.slice(1).forEach((key, index) => {
      const previous = rects[orderKeys[index]], current = size(islands[key]);
      rects[key] = {
        x: previous.x + previous.w + GAP,
        y: previous.y + (index % 2 === 0 ? -current.h - GAP : previous.h + GAP),
        ...current
      };
    });

    for (const k in islands) {
      islands[k].style.left = rects[k].x + 'px';
      islands[k].style.top = rects[k].y + 'px';
    }
    drawWires();
  }

  function drawWires() {
    const wire = (a, b) => {
      const ac = { x: a.x + a.w / 2, y: a.y + a.h / 2 }, bc = { x: b.x + b.w / 2, y: b.y + b.h / 2 };
      const IN = 14;
      let p, q, c1, c2;
      if (Math.abs(bc.x - ac.x) > Math.abs(bc.y - ac.y)) {
        const dir = Math.sign(bc.x - ac.x);
        p = { x: ac.x + dir * (a.w / 2 - IN), y: ac.y };
        q = { x: bc.x - dir * (b.w / 2 - IN), y: Math.min(bc.y, b.y + 120) };
        const k = Math.abs(q.x - p.x) / 2;
        c1 = { x: p.x + dir * k, y: p.y }; c2 = { x: q.x - dir * k, y: q.y };
      } else {
        const dir = Math.sign(bc.y - ac.y);
        p = { x: ac.x, y: ac.y + dir * (a.h / 2 - IN) };
        q = { x: bc.x, y: bc.y - dir * (b.h / 2 - IN) };
        const k = Math.abs(q.y - p.y) / 2;
        c1 = { x: p.x, y: p.y + dir * k }; c2 = { x: q.x, y: q.y - dir * k };
      }
      return `<path d="M${p.x} ${p.y} C${c1.x} ${c1.y} ${c2.x} ${c2.y} ${q.x} ${q.y}"/>`;
    };
    const orderKeys = Object.keys(rects).filter((key) => key === 'orders' || key.startsWith('orders-'));
    wires.innerHTML = wire(rects.bio, rects.links) + wire(rects.bio, rects.orders) + orderKeys.slice(1).map((key, index) => wire(rects[orderKeys[index]], rects[key])).join('');
  }

  const cam = { x: 0, y: 0, z: 1 };
  let raf = 0, anim = 0, glide = 0;

  const clampZ = (z) => Math.min(Z_MAX, Math.max(Z_MIN, z));

  function apply() {
    raf = 0;
    const ox = innerWidth / 2 - cam.x * cam.z, oy = innerHeight / 2 - cam.y * cam.z;
    world.style.transform = `translate(${ox}px, ${oy}px) scale(${cam.z})`;
    let g = 40 * cam.z;
    while (g < 22) g *= 2;
    grid.style.backgroundSize = `${g}px ${g}px`;
    grid.style.backgroundPosition = `${ox - g / 2}px ${oy - g / 2}px`;
    coords.textContent = `x ${Math.round(cam.x)} · y ${Math.round(-cam.y)} · ${Math.round(cam.z * 100)}%`;
  }
  const render = () => { if (!raf) raf = requestAnimationFrame(apply); };

  function stopMotion() {
    cancelAnimationFrame(anim); cancelAnimationFrame(glide);
    anim = glide = 0;
  }

  function flyTo(target, ms = 850) {
    stopMotion();
    if (reduceMotion || ms <= 0) { Object.assign(cam, target); return render(); }
    const from = { ...cam }, t0 = performance.now();
    const ease = (t) => t * t * (3 - 2 * t);
    const step = (now) => {
      const t = Math.min(1, (now - t0) / ms), e = ease(t);
      cam.x = from.x + (target.x - from.x) * e;
      cam.y = from.y + (target.y - from.y) * e;
      cam.z = Math.exp(Math.log(from.z) + (Math.log(target.z) - Math.log(from.z)) * e);
      apply();
      anim = t < 1 ? requestAnimationFrame(step) : 0;
    };
    anim = requestAnimationFrame(step);
  }

  function zoomAt(sx, sy, factor) {
    const z = clampZ(cam.z * factor);
    const dx = sx - innerWidth / 2, dy = sy - innerHeight / 2;
    cam.x += dx / cam.z - dx / z;
    cam.y += dy / cam.z - dy / z;
    cam.z = z;
    render();
  }

  function viewOf(keys, { maxZ = 1, anchorY = 0.5 } = {}) {
    const rs = keys.map((k) => rects[k]);
    const x0 = Math.min(...rs.map((r) => r.x)), y0 = Math.min(...rs.map((r) => r.y));
    const x1 = Math.max(...rs.map((r) => r.x + r.w)), y1 = Math.max(...rs.map((r) => r.y + r.h));
    const padX = innerWidth < 640 ? 16 : 48, padTop = 24, padBottom = 84;
    const z = Math.min(maxZ, (innerWidth - padX * 2) / (x1 - x0), (innerHeight - padTop - padBottom) / (y1 - y0));
    let sy = innerHeight * anchorY;
    const half = (y1 - y0) * z / 2;
    sy = Math.max(padTop + half, Math.min(innerHeight - padBottom - half, sy));
    return { x: (x0 + x1) / 2, y: (y0 + y1) / 2 + (innerHeight / 2 - sy) / z, z: clampZ(z) };
  }

  function homeView() {
    const all = viewOf(['bio', 'links', 'orders'], { anchorY: 0.4 });
    if (all.z >= 0.72) return all;
    const two = viewOf(['bio', 'links'], { anchorY: 0.42 });
    if (two.z >= 0.6) return two;
    return viewOf(['bio'], { anchorY: 0.42 });
  }

  function go(name) {
    hideHint();
    flyTo(name === 'home' ? homeView() : viewOf([name], { anchorY: name === 'bio' ? 0.42 : 0.47 }));
  }


  const physicsButton = $('#physics-toggle');
  const iceButton = $('#ice-toggle');
  const physics = { active:false, ice:true, engine:null, bodies:{}, walls:[], frame:0, last:0, grab:null };

  function physicsPoint(e) {
    return { x: cam.x + (e.clientX - innerWidth / 2) / cam.z, y: cam.y + (e.clientY - innerHeight / 2) / cam.z };
  }

  function makePhysicsBounds() {
    const { Bodies, Body, World } = Matter;
    const pad = Math.max(300, Math.min(560, Math.min(innerWidth, innerHeight) * .55));
    const left = cam.x - innerWidth / (2 * cam.z) - pad, right = cam.x + innerWidth / (2 * cam.z) + pad;
    const top = cam.y - innerHeight / (2 * cam.z) - pad, bottom = cam.y + innerHeight / (2 * cam.z) + pad;
    const t = 240;
    physics.bounds = { left, right, top, bottom };
    physics.walls = [
      Bodies.rectangle((left + right) / 2, top - t / 2, right - left + t * 2, t, { isStatic:true }),
      Bodies.rectangle((left + right) / 2, bottom + t / 2, right - left + t * 2, t, { isStatic:true }),
      Bodies.rectangle(left - t / 2, (top + bottom) / 2, t, bottom - top + t * 2, { isStatic:true }),
      Bodies.rectangle(right + t / 2, (top + bottom) / 2, t, bottom - top + t * 2, { isStatic:true })
    ];
    World.add(physics.engine.world, physics.walls);
  }

  function enablePhysics() {
    if (physics.active || !window.Matter || reduceMotion) return;
    stopMotion();
    pointers.clear();
    dragged = false;
    viewport.classList.remove('dragging');
    const { Engine, Bodies, World } = Matter;
    physics.active = true;
    physics.engine = Engine.create({ gravity:{ x:0, y:0, scale:0 } });
    for (const [key, r] of Object.entries(rects)) {
      const body = Bodies.rectangle(r.x + r.w / 2, r.y + r.h / 2, r.w, r.h, {
        restitution:.985, friction:0, frictionAir:.00035, chamfer:{ radius:16 }, label:key
      });
      physics.bodies[key] = body;
      World.add(physics.engine.world, body);
    }
    makePhysicsBounds();
    document.body.classList.add('physics-on');
    physicsButton.classList.add('show');
    iceButton.classList.add('show');
    physics.last = performance.now();
    physicsTick(physics.last);
    toast('physics mode');
  }

  function physicsTick(now) {
    if (!physics.active) return;
    const delta = Math.min(33, now - physics.last || 16.67);
    physics.last = now;
    Matter.Engine.update(physics.engine, delta);
    for (const [key, body] of Object.entries(physics.bodies)) {
      const r = rects[key];
      const { left, right, top, bottom } = physics.bounds;
      if (body.position.x < left - 300 || body.position.x > right + 300 || body.position.y < top - 300 || body.position.y > bottom + 300) {
        Matter.Body.setPosition(body, { x:cam.x, y:cam.y });
        Matter.Body.setVelocity(body, { x:0, y:0 });
      }
      r.x = body.position.x - r.w / 2; r.y = body.position.y - r.h / 2;
      islands[key].style.left = r.x + 'px'; islands[key].style.top = r.y + 'px';
    }
    drawWires();
    physics.frame = requestAnimationFrame(physicsTick);
  }

  function grabIsland(e, key) {
    const body = physics.bodies[key], point = physicsPoint(e);
    const constraint = Matter.Constraint.create({
      pointA:point, bodyB:body, length:0, stiffness:.24, damping:.07
    });
    physics.grab = { id:e.pointerId, body, constraint };
    Matter.World.add(physics.engine.world, constraint);
    viewport.setPointerCapture(e.pointerId);
  }

  function moveGrab(e) {
    if (!physics.grab || physics.grab.id !== e.pointerId) return false;
    physics.grab.constraint.pointA = physicsPoint(e);
    return true;
  }

  function releaseGrab(e) {
    if (!physics.grab || physics.grab.id !== e.pointerId) return false;
    Matter.World.remove(physics.engine.world, physics.grab.constraint);
    physics.grab = null;
    return true;
  }

  function setIce(enabled) {
    physics.ice = enabled;
    Object.values(physics.bodies).forEach((body) => {
      body.frictionAir = enabled ? .00035 : .012;
      body.restitution = enabled ? .985 : .72;
    });
    iceButton.textContent = enabled ? 'ice on' : 'ice off';
    iceButton.classList.toggle('off', !enabled);
  }


  const pointers = new Map();
  let dragged = false, downAt = null, pinch = null, vel = { x: 0, y: 0 }, lastMove = 0;
  let shakeEnergy = 0, shakeAt = 0, shakeDirection = 0, shakeTurns = 0, shakeStarted = 0;

  function hideHint() { hint.classList.add('gone'); }

  viewport.addEventListener('pointerdown', (e) => {
    if (e.pointerType === 'mouse' && e.button > 1) return;
    if (physics.active) {
      const island = e.target.closest('.island');
      if (island) { grabIsland(e, island.id); return; }
    }
    stopMotion();
    pointers.set(e.pointerId, { x: e.clientX, y: e.clientY });
    if (pointers.size === 1) {
      dragged = false; downAt = { x: e.clientX, y: e.clientY }; vel = { x: 0, y: 0 };
      shakeEnergy = 0; shakeAt = performance.now(); shakeStarted = shakeAt; shakeDirection = 0; shakeTurns = 0;
    }
    if (pointers.size === 2) { pinch = pinchState(); startDrag(e); }
    if (e.button === 1) e.preventDefault();
  });

  function startDrag(e) {
    if (dragged) return;
    dragged = true;
    viewport.classList.add('dragging');
    for (const id of pointers.keys()) { try { viewport.setPointerCapture(id); } catch {} }
    hideHint();
  }

  function pinchState() {
    const [a, b] = [...pointers.values()];
    return { d: Math.hypot(a.x - b.x, a.y - b.y) || 1, mx: (a.x + b.x) / 2, my: (a.y + b.y) / 2 };
  }

  viewport.addEventListener('pointermove', (e) => {
    if (moveGrab(e)) return;
    const p = pointers.get(e.pointerId);
    if (!p) return;
    const dx = e.clientX - p.x, dy = e.clientY - p.y;

    if (pointers.size === 1) {
      const now = performance.now();
      const distance = Math.hypot(dx, dy);
      if (now - shakeAt > 180) { shakeEnergy = 0; shakeTurns = 0; shakeDirection = 0; shakeStarted = now; }
      if (distance > 9) {
        const direction = Math.abs(dx) >= Math.abs(dy) ? Math.sign(dx) : Math.sign(dy) * 2;
        if (shakeDirection && direction !== shakeDirection) shakeTurns += 1;
        shakeDirection = direction;
        shakeEnergy += distance;
      }
      shakeAt = now;
      if (shakeTurns >= 16 && shakeEnergy >= 1800 && now - shakeStarted >= 2800 && now - shakeStarted < 3800) { enablePhysics(); return; }
      if (!dragged) {
        if (Math.hypot(e.clientX - downAt.x, e.clientY - downAt.y) < 5) return;
        startDrag(e);
      }
      p.x = e.clientX; p.y = e.clientY;
      cam.x -= dx / cam.z; cam.y -= dy / cam.z;
      const dt = Math.max(8, now - lastMove);
      lastMove = now;
      vel.x = vel.x * 0.6 + (dx / dt) * 0.4;
      vel.y = vel.y * 0.6 + (dy / dt) * 0.4;
      render();
    } else if (pointers.size === 2 && pinch) {
      p.x = e.clientX; p.y = e.clientY;
      const s = pinchState();
      cam.x -= (s.mx - pinch.mx) / cam.z; cam.y -= (s.my - pinch.my) / cam.z;
      zoomAt(s.mx, s.my, s.d / pinch.d);
      pinch = s;
    }
  });

  function release(e) {
    if (releaseGrab(e)) return;
    if (!pointers.delete(e.pointerId)) return;
    if (pointers.size === 1) { pinch = null; vel = { x: 0, y: 0 }; lastMove = performance.now(); return; }
    if (pointers.size) return;
    pinch = null;
    viewport.classList.remove('dragging');
    if (dragged && !reduceMotion && performance.now() - lastMove < 60 && Math.hypot(vel.x, vel.y) > 0.15) inertia();
  }
  viewport.addEventListener('pointerup', release);
  viewport.addEventListener('pointercancel', release);

  function inertia() {
    const speed = Math.hypot(vel.x, vel.y), MAX = 2.5; // px/мс
    if (speed > MAX) { vel.x *= MAX / speed; vel.y *= MAX / speed; }
    let last = performance.now();
    const step = (now) => {
      const dt = Math.min(34, now - last); last = now;
      cam.x -= vel.x * dt / cam.z; cam.y -= vel.y * dt / cam.z;
      const k = Math.pow(0.994, dt);
      vel.x *= k; vel.y *= k;
      apply();
      glide = Math.hypot(vel.x, vel.y) > 0.02 ? requestAnimationFrame(step) : 0;
    };
    glide = requestAnimationFrame(step);
  }

  viewport.addEventListener('click', (e) => {
    if (dragged) { e.preventDefault(); e.stopPropagation(); dragged = false; }
  }, true);
  viewport.addEventListener('dragstart', (e) => e.preventDefault());

  viewport.addEventListener('wheel', (e) => {
    if (e.target.closest('#orders-list, .orders-list')) return;
    e.preventDefault();
    stopMotion(); hideHint();
    const unit = e.deltaMode === 1 ? 33 : e.deltaMode === 2 ? innerHeight : 1;
    const dy = Math.max(-240, Math.min(240, e.deltaY * unit));
    zoomAt(e.clientX, e.clientY, Math.exp(-dy * (e.ctrlKey ? 0.01 : 0.0016)));
  }, { passive: false });

  addEventListener('keydown', (e) => {
    if (e.ctrlKey || e.metaKey || e.altKey) return;
    const step = 140 / cam.z;
    const moves = {
      ArrowLeft: [-step, 0], ArrowRight: [step, 0], ArrowUp: [0, -step], ArrowDown: [0, step],
      KeyA: [-step, 0], KeyD: [step, 0], KeyW: [0, -step], KeyS: [0, step],
    };
    if (moves[e.code]) {
      if (e.code.startsWith('Arrow')) e.preventDefault();
      hideHint();
      flyTo({ x: cam.x + moves[e.code][0], y: cam.y + moves[e.code][1], z: cam.z }, 260);
    } else if (e.key === '+' || e.key === '=') zoomStep(1.3);
    else if (e.key === '-' || e.key === '_') zoomStep(1 / 1.3);
    else if (e.key === '0' || e.key === 'Home') go('home');
  });

  function zoomStep(f) {
    flyTo({ x: cam.x, y: cam.y, z: clampZ(cam.z * f) }, 260);
  }

  world.addEventListener('focusin', (e) => {
    if (!e.target.matches(':focus-visible')) return;
    const isl = e.target.closest('.island');
    if (isl) flyTo(viewOf([isl.id], { anchorY: 0.45 }), 500);
  });
  viewport.addEventListener('scroll', () => { viewport.scrollTop = viewport.scrollLeft = 0; });


  let audioContext;
  function clickTone(frequency = 360) {
    if (reduceMotion) return;
    try {
      audioContext ||= new AudioContext();
      const oscillator = audioContext.createOscillator();
      const gain = audioContext.createGain();
      oscillator.type = 'sine'; oscillator.frequency.value = frequency;
      gain.gain.setValueAtTime(.018, audioContext.currentTime);
      gain.gain.exponentialRampToValueAtTime(.001, audioContext.currentTime + .07);
      oscillator.connect(gain).connect(audioContext.destination);
      oscillator.start(); oscillator.stop(audioContext.currentTime + .08);
    } catch {}
  }

  document.addEventListener('click', (e) => {
    const goBtn = e.target.closest('[data-go]');
    if (goBtn) { clickTone(330); return go(goBtn.dataset.go); }

    const copyBtn = e.target.closest('[data-copy]');
    if (copyBtn) {
      clickTone(520);
      const text = copyBtn.dataset.copy;
      (navigator.clipboard ? navigator.clipboard.writeText(text) : Promise.reject())
        .then(() => toast('скопировано: ' + text))
        .catch(() => toast(text));
    }
  });

  $('#zoom-in').addEventListener('click', () => { clickTone(460); zoomStep(1.3); });
  $('#zoom-out').addEventListener('click', () => { clickTone(280); zoomStep(1 / 1.3); });
  physicsButton.addEventListener('click', () => {
    if (!physics.active) enablePhysics();
    if (!physics.active) return;
    clickTone(610);
    Object.values(physics.bodies).forEach((body, index) => {
      const speed = 10 + index * .8;
      Matter.Body.setVelocity(body, { x:(index % 2 ? -1 : 1) * speed, y:(index % 3 - 1) * 5.4 });
    });
  });
  iceButton.addEventListener('click', () => {
    if (!physics.active) return;
    setIce(!physics.ice);
    clickTone(physics.ice ? 560 : 240);
  });

  const soundBtn = $('#sound');
  soundBtn.addEventListener('click', () => {
    clickTone(400);
    video.muted = !video.muted;
    if (!video.muted) video.volume = 0.5;
    video.play().catch(() => {});
    soundBtn.textContent = video.muted ? '♪ off' : '♪ on';
    soundBtn.classList.toggle('on', !video.muted);
  });

  let toastTimer = 0;
  function toast(msg) {
    toastEl.textContent = msg;
    toastEl.classList.add('show');
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => toastEl.classList.remove('show'), 1600);
  }


  if (matchMedia('(pointer: coarse)').matches) hint.textContent = 'тяни холст, чтобы двигаться · щипок — зум';

  renderFunpay();
  layout();
  Object.assign(cam, homeView());
  apply();

  let moved = false;
  viewport.addEventListener('pointerdown', () => { moved = true; }, { once: true });
  viewport.addEventListener('wheel', () => { moved = true; }, { once: true, passive: true });

  if (document.fonts && document.fonts.ready) {
    document.fonts.ready.then(() => { layout(); if (!moved) Object.assign(cam, homeView()); render(); });
  }

  addEventListener('resize', () => {
    const wasNarrow = narrow;
    layout();
    if (wasNarrow !== narrow || !moved) { stopMotion(); Object.assign(cam, homeView()); }
    render();
  });

  video.play().catch(() => {
    addEventListener('pointerdown', () => video.play().catch(() => {}), { once: true });
  });

  setTimeout(hideHint, 9000);
})();

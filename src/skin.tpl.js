    /* ---------------------------------------------------------------
     * 主界面底图（动态）：
     *   底图 —— 游戏主菜单 gui/main_menu.png 去掉左边纸那条街景，铺在
     *           主栏那块"黑"上。主栏内部还压着一层同尺寸的底色 div
     *           （pointer-events:none，所以点不到），要一起剥掉才看得见。
     *   雪   —— fixed canvas，只画在主栏那块矩形里，一直往下走。
     * 不覆盖主题 token、不加全局背景：侧栏 / 浮层 / 按钮保持原样。
     * 关掉：?skin=0 或 localStorage['dsh.skin.scene']='0'。
     * --------------------------------------------------------------- */
    const SKIN_CSS_ID = 'dshb-scene-css';
    const SKIN_SNOW_ID = 'dshb-snow';
    const SKIN_CLASS = 'dshb-art';
    /** 右侧栏（上下文 / 文件那一列）用的类名，跟主栏同一套贴图、不带的左白边。 */
    const SKIN_BAR_CLASS = 'dshb-art-r';
    const SURFACE = '[class*="_centerCol"]';
    const RIGHTBAR = '[class*="_rightbarCol"]';

    /** S.T.A.R.S 星标（从插件 icon.svg 里抠出来的 PNG）。 */

    /** 侧栏右边沿的撕纸白边贴图（48×1024，白色 + alpha）。 */
    /** gui/main_menu.png 裁掉左边纸 + 压暗（1600×1271，JPEG q87）。 */
    const SCENE_SRC = '__SCENE_SRC__';
    /** 游戏主界面那段循环动画（images/m3.webm 裁纸+压暗到同一帧位，10s 无缝循环）。 */
    const SCENE_MOTION = '__SCENE_WEBM__';
    /** 侧栏正文用的像素字（Fusion Pixel 12px 的 GB2312 子集，194KB woff2）。 */
    const TEXT_FONT = '__TEXT_FONT__';
    /** 胶囊用的像素字：Fusion Pixel 10px 的 GB2312 子集（20px = 2×10 才锐）。 */
    const CAPS_FONT = '__CAPS_FONT__';
    /** 侧栏落款：游戏标题字（蓝色像素版，来自《饲养染的 30 DAYS》）。 */
    const TITLE_SIDE = '__TITLE_SIDE__';
    /** 静态 / 动态底图的开关（插件设置面板里切，也认 ?motion=0|1）。 */
    const MOTION_KEY = 'dsh.skin.motion';
    /** 雪片数量。 */
    const SNOW_COUNT = 80;

    function cardElement() {
      try {
        const el = document.querySelector(SURFACE);
        if (el === null) return null;
        const r = el.getBoundingClientRect();
        return r.width > 240 && r.height > 240 ? el : null;
      } catch (e) { return null; }
    }

    /**
     * 窗口外壳：从主栏往上爬，最外层那个类名带 _frame 且盖满整窗的祖先。
     * （不能直接 querySelectorAll 挑面积最大的：聊天流里也有 _frame 尾巴的元素，
     *  内容滚动时高度能到视口的 160%，会把它当成外壳刷上去。）
     */
    function frameEl() {
      try {
        const vw = window.innerWidth * window.innerHeight;
        let el = cardElement(), best = null;
        while (el && el !== document.body && el !== document.documentElement) {
          const cls = el.getAttribute('class') || '';
          if (cls.indexOf('_frame') >= 0) {
            const r = el.getBoundingClientRect();
            if (r.width * r.height >= vw * 0.92) best = el;
          }
          el = el.parentElement;
        }
        return best;
      } catch (e) { return null; }
    }

    function surfaceRect() {
      const el = cardElement();
      return el === null ? null : el.getBoundingClientRect();
    }

    let cardCached = null;
    let artKey = '';
    let sceneVideo = null;

    function liveCard() {
      if (cardCached === null || !cardCached.isConnected) cardCached = cardElement();
      return cardCached;
    }

    /** 参考图那种「字母 + 文字」的胶囊：按标签给按钮挂 data-dshb-key，CSS 用 ::before 画字母。 */
    const KEY_LABELS = [
      ['新会话', 'N'], ['插件', 'P'], ['自动化任务', 'A'],
      ['上下文洞察', 'C'], ['演示文稿', 'D'], ['更多', 'M'],
    ];
    function paintKeys() {
      try {
        const col = document.querySelector('[class*="_sidebarCol"]');
        if (col === null) return;
        const btns = col.querySelectorAll('button');
        const used = {};
        for (let i = 0; i < btns.length; i += 1) {
          const b = btns[i];
          const t = (b.textContent || '').trim();
          let key = null;
          // 底部那个「… 更多」也是「更多」，同一个字母只挂第一次出现的那颗
          if (t.indexOf('…') < 0) {
            for (let j = 0; j < KEY_LABELS.length; j += 1) {
              if (t.indexOf(KEY_LABELS[j][0]) >= 0) { key = KEY_LABELS[j][1]; break; }
            }
          }
          if (key !== null && used[key]) key = null;
          if (key !== null) used[key] = true;
          if (key === null) {
            if (b.hasAttribute('data-dshb-key')) b.removeAttribute('data-dshb-key');
          } else if (b.getAttribute('data-dshb-key') !== key) {
            b.setAttribute('data-dshb-key', key);
          }
        }
      } catch (e) { /* 忽略 */ }
    }

    /** 底图要动态还是静帧：URL 参数 > localStorage > 系统"减少动态效果"。 */
    function motionWanted() {
      try {
        const q = new URLSearchParams(location.search).get('motion');
        if (q === '0') return false;
        if (q === '1') return true;
        const v = window.localStorage && localStorage.getItem(MOTION_KEY);
        if (v === '0') return false;
        if (v === '1') return true;
      } catch (e) { /* 读不到就按系统偏好 */ }
      try {
        return !window.matchMedia('(prefers-reduced-motion: reduce)').matches;
      } catch (e) { return true; }
    }

    /** 动态底图：铺在整窗外壳上（和静帧同一个几何），不然视频和静帧的边界会露出来。 */
    function showVideo() {
      const fr = frameEl();
      if (fr === null) return;
      if (sceneVideo !== null && sceneVideo.isConnected) return;
      const v = document.createElement('video');
      v.id = 'dshb-scene';
      v.loop = true;
      v.muted = true;
      v.defaultMuted = true;
      v.autoplay = true;
      v.setAttribute('playsinline', '');
      v.setAttribute('muted', '');
      v.setAttribute('aria-hidden', 'true');
      // z-index:-1：夹在 #dshb-bg（-2）和所有内容之间 —— 负层永远在普通内容下面，
      // 不会像 z-index:0 那样把一个 position:static 的整页界面盖掉。
      v.style.cssText = 'position:absolute;pointer-events:none;z-index:-1;object-fit:fill;' +
        'filter:brightness(.62);opacity:0;transition:opacity .9s ease';
      v.addEventListener('canplay', function () {
        v.style.opacity = '1';
        try { const p = v.play(); if (p && p.catch) p.catch(function () {}); } catch (e) { /* 自动播放被挡就算了 */ }
      });
      v.addEventListener('error', function () { dropVideo(); });
      v.src = SCENE_MOTION;
      fr.insertBefore(v, fr.firstChild);
      sceneVideo = v;
      const fit0 = sceneFit(window.innerWidth, window.innerHeight);
      v.style.left = fit0.x + 'px';
      v.style.top = fit0.y + 'px';
      v.style.width = fit0.w + 'px';
      v.style.height = fit0.h + 'px';
      syncArt(true);
    }

    function dropVideo() {
      const glow = document.getElementById('dshb-glow');
      if (glow) glow.remove();
      if (sceneVideo !== null) {
        try { sceneVideo.pause(); } catch (e) { /* 忽略 */ }
        try { sceneVideo.remove(); } catch (e) { /* 忽略 */ }
        sceneVideo = null;
      }
    }

    /**
     * 只跟着主栏重算底图的 size / position，别的都不碰（给每帧用）。
     * 侧栏收起/展开时 grid-template-columns 在动，主栏左边缘每帧都在变；
     * background-position 是按主栏左边缘反算的，不跟着改就变成"图跟着列走、动画结束再跳回去"。
     * 返回主栏当前 rect，雪那边顺便拿它当裁剪框。
     */
    function syncArt(force) {
      const card = liveCard();
      if (card === null) return null;
      const r = card.getBoundingClientRect();
      const key = Math.round(r.left) + ':' + Math.round(r.width) + ':' + window.innerWidth;
      if (force || key !== artKey) {
        artKey = key;
        const fit = sceneFit(window.innerWidth, window.innerHeight);
        if (sceneVideo !== null && sceneVideo.isConnected) {
          sceneVideo.style.left = fit.x + 'px';
          sceneVideo.style.top = fit.y + 'px';
          sceneVideo.style.width = fit.w + 'px';
          sceneVideo.style.height = fit.h + 'px';
        }
      }
      return r;
    }

    const peeled = [];
    const peeledSet = new Set();

    /** 外壳（整窗那层）上被我们改过的 inline，换主题时要还原。 */
    let framePainted = null;

    /** 顶部标题条的目标色：和 Electron 标题栏覆盖层（─ □ ✕ 那块）同一个深蓝黑。 */
    const TITLEBAR = '#0a0f1c';

    /**
     * 顶部 40px 那条是"外壳自己的背景"：Windows 下 .mP3x-q_frame 有
     * padding-top: 40px，背景取 --dsw-specific-sidebar-fill，外面再压一层同色的
     * ::before 当拖拽区。类名压不过 → 直接改 inline，再把 ::before 让出来
     * （CSS 里 [data-dshb-frame]:before{background:transparent}）。
     * 右边 ─□✕ 那块是 Electron 的 titleBarOverlay，由 client.base.js 的
     * setCaption() 管，两边同色才看不出接缝。
     */
    function paintFrame() {
      const el = frameEl();
      if (el === null) return;
      if (framePainted === null || framePainted.el !== el) {
        unframe();
        framePainted = {
          el: el,
          color: el.style.getPropertyValue('background-color'),
          image: el.style.getPropertyValue('background-image'),
          size: el.style.getPropertyValue('background-size'),
          pos: el.style.getPropertyValue('background-position'),
        };
        el.setAttribute('data-dshb-frame', '1');
      }
      el.style.setProperty('background-color', TITLEBAR, 'important');
      // 底图不再画在外壳自己的背景上，而是单独一层 #dshb-bg（z-index:-2，负层），
      // 这样动态的视频层（z-index:-1）能夹在"底图"和"内容"中间，又不会盖住任何界面。
      el.style.removeProperty('background-image');
      el.style.removeProperty('background-size');
      el.style.removeProperty('background-position');
      let bg = document.getElementById('dshb-bg');
      if (bg === null || bg.parentNode !== el) {
        if (bg !== null) bg.remove();
        bg = document.createElement('div');
        bg.id = 'dshb-bg';
        bg.setAttribute('aria-hidden', 'true');
        bg.style.cssText = 'position:absolute;inset:0;pointer-events:none;z-index:-2;' +
          'background-repeat:no-repeat;background-size:cover;background-position:50% 46%;' +
          'box-shadow:inset 0 0 0 4000px rgba(6,10,19,.42);';
        el.insertBefore(bg, el.firstChild);
      }
      bg.style.backgroundImage = 'url("' + SCENE_SRC + '")';
      // 顶部那 40px 必须是深蓝黑：外壳自带的 ::before 不一定还在（拿到的 _frame
      // 可能是内层那一圈），所以自己压一条，高度取外壳的 padding-top。
      let bar = document.getElementById('dshb-topbar');
      if (bar === null || bar.parentNode !== el) {
        if (bar !== null) bar.remove();
        bar = document.createElement('div');
        bar.id = 'dshb-topbar';
        bar.setAttribute('aria-hidden', 'true');
        bar.style.cssText = 'position:absolute;left:0;right:0;top:0;pointer-events:none;z-index:3;';
        el.appendChild(bar);
      }
      const pad = getComputedStyle(el).paddingTop;
      bar.style.height = (pad && pad !== '0px') ? pad : '40px';
      bar.style.background = TITLEBAR;
    }

    function unframe() {
      if (framePainted === null) return;
      const p = framePainted;
      framePainted = null;
      try {
        const bar = document.getElementById('dshb-topbar');
        if (bar !== null) bar.remove();
        const bg = document.getElementById('dshb-bg');
        if (bg !== null) bg.remove();
        p.el.removeAttribute('data-dshb-frame');
        if (p.color === '') p.el.style.removeProperty('background-color');
        else p.el.style.setProperty('background-color', p.color);
        if (p.image === '') p.el.style.removeProperty('background-image');
        else p.el.style.setProperty('background-image', p.image);
        if (p.size === '') p.el.style.removeProperty('background-size');
        else p.el.style.setProperty('background-size', p.size);
        if (p.pos === '') p.el.style.removeProperty('background-position');
        else p.el.style.setProperty('background-position', p.pos);
      } catch (e) { /* 还原不了就别管，下次热更会重来 */ }
    }

    function unpeel() {
      for (let i = 0; i < peeled.length; i += 1) {
        const p = peeled[i];
        try {
          if (p.color === null) p.el.style.removeProperty('background-color');
          else p.el.style.setProperty('background-color', p.color);
          if (p.image === null) p.el.style.removeProperty('background-image');
          else p.el.style.setProperty('background-image', p.image);
        } catch (e) { /* 忽略 */ }
      }
      peeled.length = 0;
      peeledSet.clear();
    }

    /** 主栏里跟它同尺寸的那几层底色（覆盖层）剥成透明，底图才露得出来。 */
    function paintSurface() {
      try {
        const card = cardElement();
        const dark = document.body !== null && document.body.hasAttribute('data-ds-dark-theme');
        if (card === null || !dark) {
          if (card !== null) card.classList.remove(SKIN_CLASS);
          unpeel();
          unframe();
          try { dropVideo(); } catch (e) { /* 忽略 */ }
          return;
        }
        // 侧栏落款（S.T.A.R.S / ©2026）：直接挂到侧栏最外层，跟启动幕那块同位置
        try {
          const col = document.querySelector('[class*="_sidebarCol"]');
          if (col) {
            if (getComputedStyle(col).position === 'static') col.style.setProperty('position', 'relative');
            let credit = document.getElementById('dshb-credit');
            if (!credit) {
              credit = document.createElement('div');
              credit.id = 'dshb-credit';
              credit.setAttribute('aria-hidden', 'true');
              col.appendChild(credit);
            }
            const creditHtml = '<img src="' + TITLE_SIDE + '" alt="饲养染的 30 DAYS">'
              + '<em>使用素材来自画师【赤橙chio】哇</em>';
            if (credit.innerHTML !== creditHtml) credit.innerHTML = creditHtml;
            // 直接比像素：列表内容的底边碰上落款的顶边才收起
            const area = col.querySelector('[class*="_scrollArea"]');
            let wouldOverlap = col.clientWidth < 220;
            if (!wouldOverlap && area !== null) {
              const kid = area.lastElementChild;
              const contentBottom = kid === null
                ? area.getBoundingClientRect().top
                : kid.getBoundingClientRect().bottom;
              wouldOverlap = contentBottom > credit.getBoundingClientRect().top - 16;
            }
            credit.classList.toggle('dshb-credit-off', wouldOverlap);
            // 品牌行 HARNESS 那个徽章是 SVG 里画死的深蓝块，字也是深蓝 → 用一层米色字盖回去
            const name = col.querySelector('[class*="_brandName"]');
            const svg = name === null ? null : name.querySelector('svg');
            // 侧栏收起时品牌行整块被拆掉/挪出窗口，徽章盖片会孤零零浮在聊天区标题上
            if (svg === null) {
              const stale = document.getElementById('dshb-chip');
              if (stale) stale.style.display = 'none';
            } else {
              {
                const r = svg.getBoundingClientRect();
                const chip = document.getElementById('dshb-chip');
                const el = chip || document.createElement('span');
                if (!chip) {
                  el.id = 'dshb-chip';
                  el.setAttribute('aria-hidden', 'true');
                  el.textContent = 'HARNESS';
                  el.style.cssText = 'position:fixed;display:flex;align-items:center;justify-content:center;' +
                    'font:700 9px/1 "Segoe UI",Arial,sans-serif;letter-spacing:.9px;color:#f4f1e8;' +
                    'pointer-events:none;z-index:2147482000';
                  document.body.appendChild(el);
                }
                el.style.left = Math.round(r.left + r.width * 0.665) + 'px';
                el.style.top = Math.round(r.top) + 'px';
                el.style.width = Math.round(r.width * 0.335) + 'px';
                el.style.height = Math.round(r.height) + 'px';
                el.style.display = (r.width < 8 || r.right < 40) ? 'none' : 'flex';
              }
            }
          }
        } catch (e) { /* 落款画不出来不影响主界面 */ }
        card.classList.add(SKIN_CLASS);
        cardCached = card;
        try { paintKeys(); } catch (e) { /* 字母挂不上不影响别的 */ }
        // 底图：动态（循环动画）/ 静帧，随时可切
        try {
          if (motionWanted()) showVideo();
          else if (sceneVideo !== null || card.classList.contains('dshb-motion')) dropVideo();
        } catch (e) { /* 视频起不来就退回静帧 */ }
        try {
          const stray = document.querySelectorAll('.' + SKIN_CLASS);
          for (let i = 0; i < stray.length; i += 1) {
            if (stray[i] !== card) {
              stray[i].classList.remove(SKIN_CLASS);
              stray[i].style.removeProperty('background-size');
              stray[i].style.removeProperty('background-position');
            }
          }
        } catch (e) { /* 忽略 */ }

        const cr = card.getBoundingClientRect();

        try {
          artKey = Math.round(cr.left) + ':' + Math.round(cr.width) + ':' + window.innerWidth;
          // 顶部 40px 标题条 + 整窗底图（主栏/右栏/留白共用这一份），外壳那层一次刷好。
          paintFrame();
          // 窗口尺寸一变（最大化/还原/拖边框）就得把视频层重新摆一次：
          // 视频是按像素写的，光靠雪那边的 rAF 跟，雪停了就露黑边。
          syncArt(true);
        } catch (e) { /* 拿不到尺寸就退回默认 */ }
        const all = card.querySelectorAll('*');
        // 现在是不是停在"整页视图"（插件 / 自动化任务 / 演示文稿…）上？
        // 那种页面文字偏白，底图得压一层半透明深色才看得清；会话页不要压，
        // 否则主栏比右侧栏暗一截，看着像把底图贴了两份。
        let onPage = false;
        try {
          onPage = card.querySelector('[class*="pageBar"],[data-plugin-panel],[data-global-panel]') !== null ||
            card.hasAttribute('data-global-panel');
        } catch (e) { onPage = false; }
        const shellBg = onPage ? 'rgba(6,10,19,.55)' : 'transparent';
        for (let i = 0; i < all.length; i += 1) {
          const el = all[i];
          const r = el.getBoundingClientRect();
          const same = Math.abs(r.left - cr.left) <= 3 && Math.abs(r.top - cr.top) <= 3 &&
            Math.abs(r.width - cr.width) <= 3 && Math.abs(r.height - cr.height) <= 3;
          // 页面级"壳"（插件 / 自动化任务 / 演示文稿这些整页视图）常常不是严丝合缝
          // 盖满主栏，而是顶边留 48px 页头 —— 只认严丝合缝的话，那种壳会挡着底图，
          // 整页就变成一块死板深灰。所以盖住九成以上也算，一起剥掉。
          if (!same) {
            if (cr.width < 10 || cr.height < 10) continue;
            const cover = (Math.min(r.width, cr.width) / cr.width) *
              (Math.min(r.height, cr.height) / cr.height);
            // 整页视图的"页头条"（插件页那种「标题 + 刷新/添加插件」的深色横条）：
            // 横着几乎满宽、贴在主栏顶部、又不高 —— 也算页面底色的同类，一起剥。
            const topBand = r.width >= cr.width * 0.85 && (r.top - cr.top) <= 40 &&
              r.height <= cr.height * 0.4;
            if (cover < 0.9 && !topBand) continue;
          }
          const cs = getComputedStyle(el);
          if (cs.backgroundColor === 'rgba(0, 0, 0, 0)' && cs.backgroundImage === 'none') continue;
          if (peeledSet.has(el)) continue;
          peeledSet.add(el);
          peeled.push({ el: el, color: el.style.getPropertyValue('background-color') || null,
            image: el.style.getPropertyValue('background-image') || null });
          // 主栏里"严丝合缝"的盖底（会话用的那层）→ 全透明，底图原样透出来。
          // 页面级的壳 / 页头条（插件、自动化任务这些整页视图）→ 换一层半透明深色：
          // 底图还能看见，但页面上那些白字不至于糊在亮雪景上（自动化任务整页曾因此"看起来没了"）。
          el.style.setProperty('background-color', same ? 'transparent' : shellBg, 'important');
          el.style.setProperty('background-image', 'none', 'important');
        }
      } catch (e) { /* 剥不动就只留底图 */ }
    }

    function startSnow(canvas) {
      const ctx = canvas.getContext('2d');
      if (ctx === null) return;
      let reduce = false;
      try { reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches; } catch (e) { /* 忽略 */ }

      const sprite = document.createElement('canvas');
      sprite.width = 64; sprite.height = 64;
      const sg = sprite.getContext('2d');
      const grad = sg.createRadialGradient(32, 32, 0, 32, 32, 32);
      grad.addColorStop(0, 'rgba(255,255,255,1)');
      grad.addColorStop(0.38, 'rgba(255,255,255,0.82)');
      grad.addColorStop(1, 'rgba(255,255,255,0)');
      sg.fillStyle = grad;
      sg.fillRect(0, 0, 64, 64);

      let w = 0, h = 0, dpr = 1, flakes = [], raf = 0, last = 0, running = false, rect = null;

      function spawn(f, initial) {
        /* 对齐游戏里的写法（screens.rpyc）：
         * SnowBlossom("images/snow_large.png", count=100, border=10,
         *             xspeed=(-2,50), yspeed=(20,30), fast=True)
         * 1920 宽的虚拟分辨率缩到实际窗口，所以速度乘 0.7 左右。 */
        f.depth = 0.3 + Math.random() * 0.7;
        f.r = (0.9 + f.depth * 2.4) * (0.8 + Math.random() * 0.45);
        f.x = Math.random() * (w + 100) - 50;
        f.y = initial ? Math.random() * h : -30 - Math.random() * 140;
        f.vy = (14 + Math.random() * 7) * (0.55 + f.depth * 0.75);
        f.drift = (-2 + Math.random() * 52) * 0.6;
        f.phase = Math.random() * Math.PI * 2;
        f.swing = 0.3 + Math.random() * 1.1;
        f.a = (0.12 + f.depth * 0.42) * 0.9;
        return f;
      }

      function resize() {
        dpr = Math.min(window.devicePixelRatio || 1, 2);
        w = window.innerWidth;
        h = window.innerHeight;
        canvas.width = Math.round(w * dpr);
        canvas.height = Math.round(h * dpr);
        ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
        rect = surfaceRect();
      }

      function build() {
        flakes = [];
        for (let i = 0; i < SNOW_COUNT; i += 1) flakes.push(spawn({}, true));
      }

      function draw() {
        ctx.clearRect(0, 0, w, h);
        if (rect === null) return;
        ctx.save();
        ctx.beginPath();
        ctx.rect(rect.left, rect.top, rect.width, rect.height);
        ctx.clip();
        for (let i = 0; i < flakes.length; i += 1) {
          const f = flakes[i];
          const d = f.r * 2;
          ctx.globalAlpha = f.a;
          ctx.drawImage(sprite, f.x, f.y, d, d * 1.3);
        }
        ctx.restore();
        ctx.globalAlpha = 1;
      }

      function step(now) {
        if (!running) return;
        const dt = Math.min((now - last) / 1000, 0.05);
        last = now;
        for (let i = 0; i < flakes.length; i += 1) {
          const f = flakes[i];
          f.phase += dt * f.swing;
          f.y += f.vy * dt;
          f.x += (f.drift + Math.sin(f.phase) * 5) * dt;
          if (f.y > h + 40 || f.x < -70 || f.x > w + 70) spawn(f, false);
        }
        // 侧栏动画/拖分界线时主栏每帧都在变：底图钉回视口、雪的裁剪框跟上
        const live = syncArt();
        if (live !== null) rect = live;
        draw();
        raf = window.requestAnimationFrame(step);
      }

      resize();
      build();
      draw();
      if (!reduce) {
        running = true;
        last = performance.now();
        raf = window.requestAnimationFrame(step);
      }
      const rectTimer = window.setInterval(function () {
        const next = surfaceRect();
        if (next !== null && (rect === null ||
          Math.abs(next.left - rect.left) > 1 || Math.abs(next.top - rect.top) > 1 ||
          Math.abs(next.width - rect.width) > 1 || Math.abs(next.height - rect.height) > 1)) {
          rect = next;
          if (!running) draw();
        }
      }, 1200);
      const onResize = function () { resize(); draw(); };
      const onVisible = function () {
        if (document.hidden) {
          running = false;
          if (raf) window.cancelAnimationFrame(raf);
          raf = 0;
        } else if (!reduce && !running) {
          running = true;
          last = performance.now();
          raf = window.requestAnimationFrame(step);
        }
      };
      window.addEventListener('resize', onResize);
      document.addEventListener('visibilitychange', onVisible);
      // 热更会重新 install，旧的雪必须能停下来——不然每热更一次就多一条 60fps 的
      // drawImage 循环，叠十几次就是"卡"。
      return function stopSnow() {
        running = false;
        if (raf) window.cancelAnimationFrame(raf);
        raf = 0;
        window.clearInterval(rectTimer);
        window.removeEventListener('resize', onResize);
        document.removeEventListener('visibilitychange', onVisible);
      };
    }

    function installShellSkin() {
      try {
        if (typeof document === 'undefined' || typeof location === 'undefined') return;
        try {
          if (new URLSearchParams(location.search).get('skin') === '0') return;
          if (window.localStorage && localStorage.getItem('dsh.skin.scene') === '0') return;
        } catch (e) { /* 读不到存储就按默认开着 */ }

        // 热更=同一个页面里重新 apply：先把上一份的 observer / 轮询 / 雪停掉，
        // 否则每改一次就多一套（叠到十几套时整个界面都在抖）。
        try {
          if (typeof window.__dshbSkinStop === 'function') window.__dshbSkinStop();
        } catch (e) { /* 上一份没留清理函数就算了 */ }
        // 热更是同一个页面里重新 apply，上一份挂的 DOM 不会自己走：
        // 特别是视频层（#dshb-scene）—— 旧的那块留在主栏里、还按旧尺寸铺，
        // 叠在新的一层下面就是"画面错开一截/看着像重了一份"。
        try {
          const stale = document.querySelectorAll('#dshb-scene,#dshb-bg,#dshb-topbar,#dshb-glow');
          for (let i = 0; i < stale.length; i += 1) stale[i].remove();
        } catch (e) { /* 清不掉就算了，后面还会重挂 */ }
        const stops = [];
        window.__dshbSkinStop = function () {
          while (stops.length > 0) {
            try { stops.pop()(); } catch (e) { /* 单个清理失败不影响其它 */ }
          }
        };
        // 设置面板里切「动态 / 静态」时直接调它，不刷新页面
        window.__dshbMotion = function (on) {
          try { window.localStorage.setItem(MOTION_KEY, on ? '1' : '0'); } catch (e) { /* 忽略 */ }
          try {
            if (on) showVideo();
            else dropVideo();
          } catch (e) { /* 忽略 */ }
        };

        const css = [
          '@font-face{font-family:"dshb-text";src:url("' + TEXT_FONT + '") format("woff2");font-display:swap}',
          '@font-face{font-family:"dshb-caps";src:url("' + CAPS_FONT + '") format("woff2");font-display:swap}',
          'body[data-ds-dark-theme] .' + SKIN_CLASS + '{',
          'background-color:transparent!important;',
          'background-image:none!important;',
          'box-shadow:inset 30px 0 26px -14px rgba(255,255,255,.98)!important}',
          /* 底图只有一份，铺在整窗外壳上（见 paintFrameArt）：主栏、右侧栏、
             各处留白全透同一张图，接缝天然就是对上的。 */
          'body[data-ds-dark-theme] [data-dshb-frame]{',
          'isolation:isolate;',
          'background-color:#0a0f1c!important;',
          'box-shadow:none!important}',
          /* 顶部标题条：外壳那层的 ::before 正好是那 40px 的拖拽区，刷成深蓝黑盖住底图 */
          '[data-dshb-frame]:before{background:#0a0f1c!important}',
          /* 底部状态栏：composerSeat 那条 gradient 到 bg-base 就变成黑边了，
             去掉之后露出主栏底图；它的 z-index 和 sticky 不动，气泡不会被压。 */
          'body[data-ds-dark-theme] [class*="_composerSeat"]{background:transparent!important}',
          /* 插件页那种整页视图的"页头条"，底色不是画在元素上，而是画在
             .pageBar[data-natural]::before 这个伪元素里（高度跟着滚动收起），
             inline 改不到伪元素，只能按类名尾巴压掉（类名被 CSS modules 加了哈希）。 */
          '[class*="pageBar"]::before{background:transparent!important}',
          '[class*="pageBar"]::after{background:transparent!important}',
          '[class*="pageBar"]{background:transparent!important}',
          /* 右侧栏（上下文 / 文件那一列）自己的 bg-base 让开，露出外壳那层整窗底图
             —— 和"底栏"同一个套路：它盖着什么，就把什么压成透明。 */
          'body[data-ds-dark-theme] [class*="_rightbarCol"]{background:transparent!important}',
          /* ---------- 侧栏：米色纸 + 藏青描边胶囊（照游戏主菜单那张的"风格"） ---------- */
          '[class*="_sidebarCol"]{position:relative!important;',
          'background-color:transparent!important;',

          'box-shadow:6px 0 18px rgba(72,96,136,.16),inset -16px 0 22px -18px rgba(120,100,70,.22)!important;',
          'font-family:"dshb-text","Noto Sans SC",sans-serif!important;',
          '--dsw-alias-label-primary:#2c3f8f;',
          '--dsw-alias-label-secondary:#4a5f9e;',
          '--dsw-alias-label-tertiary:#6b7aa8;',
          '--dsw-specific-sidebar-fill:#efece4;',
          '--dsw-alias-border-l1:rgba(62,81,157,.22);',
          '--dsw-alias-border-l2:rgba(62,81,157,.42);',
          '--dsw-alias-brand-primary:#3e519d}',
          /* 侧栏正文：DSH 在具体元素上写了 font-family，父级继承压不住，所以子树逐个覆盖。
             正文用像素字（Fusion Pixel 12px 子集）；字号钉死 12px——像素字只有整数倍才锐，
             13px / 22px 这种非整数倍会被抗锯齿糊掉。 */
          '[class*="_sidebarCol"] *{font-family:"dshb-text","Noto Sans SC",sans-serif!important;',
          'font-size:12px!important;letter-spacing:.45px!important;font-weight:400!important}',
          /* 胶囊里的标签被应用设成 flex:1 + 居中，长短不一就“阶梯”——强制左对齐 */
          '[class*="_sidebarCol"] button[class*="_panelRow"] *,',
          '[class*="_sidebarCol"] button[class*="_newSession"] *,',
          '[class*="_sidebarCol"] button[class*="_pill_"] *{',
          'text-align:left!important;justify-content:flex-start!important}',
          /* 像素胶囊（按钮本身 + 里面的文字）优先级抬高，别被上面那条吃掉 */
          '[class*="_sidebarCol"] button[class*="_panelRow"] *,',
          '[class*="_sidebarCol"] button[class*="_newSession"] *,',
          '[class*="_sidebarCol"] button[class*="_brand"] *{font-family:"dshb-caps","dshb-text","Noto Sans SC",sans-serif!important;',
          'font-size:inherit!important;letter-spacing:inherit!important}',
          /* 落款 S.T.A.R.S 保持无衬线，别跟着变宋体 */
          '#dshb-credit b{font-family:"Microsoft YaHei UI","Segoe UI",Arial,sans-serif!important;font-size:13px!important;letter-spacing:.2px!important}',
          '#dshb-credit span{font-family:"Segoe UI",Arial,sans-serif!important;font-size:8.5px!important;letter-spacing:0!important}',
          '[class*="_sidebarCol"] [class*="_quiet"]{background:transparent!important}',
          /* 侧栏开关 / 收起态「新会话」方块：应用把它们 position:fixed 钉在深色标题条上，
             我们原来的深藏青 token 在近黑底上等于隐形 → 换成标题条上的浅蓝 */
          '[class*="_sidebarCol"] [class*="toggle"]{color:#9db9ff!important;opacity:1!important}',
          '[data-sidebar-collapsed] button[class*="_newSession"],',
          '[class*="_collapsed"] button[class*="_newSession"]{',
          'background-color:transparent!important;border:0!important;color:#9db9ff!important}',
          /* 纸纹画在 ::before 上：伪元素属于元素本身，React 重渲染子节点时不会丢 */
          '[class*="_sidebarCol"]::before{content:""!important;display:block!important;',
          /* 尺寸锁死在视口宽（不随侧栏宽度动画变），并提到合成层：
             侧栏展开只是裁剪变化，纹理不再逐帧重新栅格化 */
          'position:absolute!important;top:0!important;left:0!important;width:100vw!important;height:100%!important;',
          'z-index:-1!important;will-change:transform!important;transform:translateZ(0)!important;',
          'pointer-events:none!important;',
          'background-color:#eee9e1!important;',
          'background-image:radial-gradient(150% 110% at 26% -14%,#F4F2EE 0%,#F0EBE3 45%,#EBE6DC 100%)!important;',
          'background-size:auto!important;background-repeat:no-repeat!important}',
          '[class*="_sidebarCol"]::after{display:none!important}',
          '#dshb-credit{position:absolute;left:30px;bottom:44px;display:flex;flex-direction:column;align-items:flex-start;gap:4px;',
          'pointer-events:none;z-index:4;color:#15171c;transition:opacity .18s ease}',
          '#dshb-credit.dshb-credit-off{opacity:0!important;visibility:hidden!important}',
          '#dshb-credit img{display:block;width:104px;height:auto;opacity:.92}',
          '#dshb-credit em{display:block;font:400 8px/1.2 "Microsoft YaHei UI",sans-serif;',
          'letter-spacing:.4px;color:#6b7aa8;margin-top:2px;font-style:normal}',
          '#dshb-credit b{display:block;color:#111;',
          'font:800 13px/1.1 "Microsoft YaHei UI","Segoe UI",Arial,sans-serif;letter-spacing:.2px}',
          '#dshb-credit span{display:block;font:400 8.5px/1.1 "Segoe UI",Arial,sans-serif;',
          'margin-top:3px;color:#2a2d33}',
          /* 窗口一矮，落款就压到会话列表上（它 absolute 在底边，列表在它下面滚）。
             600px 高的窗口里会直接叠在「继续任务」那行上，矮到一定程度干脆收掉。 */
          '@media (max-height:720px){#dshb-credit{display:none!important}}',
          '[class*="_sidebarCol"] button[class*="_panelRow"],',
          '[class*="_sidebarCol"] button[class*="_newSession"],',
          '[class*="_sidebarCol"] button[class*="_pill_"],',
          '[class*="_sidebarCol"] button[class*="_brand"]{',
          'background-color:rgba(251,249,244,.62)!important;',
          'border:2.5px solid #3e519d!important;',
          'border-radius:999px!important;',
          'color:#2c3f8f!important;',
          'font-family:"dshb-caps","dshb-text","Noto Sans SC",sans-serif!important;',
          'font-weight:400!important;',
          'font-size:20px!important;line-height:1.15!important;',
          'letter-spacing:.6px!important;',
          'justify-content:flex-start!important;',
          'gap:0!important;',
          'padding-left:18px!important;',
          'padding-right:16px!important;',
          'box-shadow:0 2px 0 rgba(62,81,157,.10),0 6px 14px rgba(148,172,232,.45),',
          'inset 0 2px 0 rgba(255,255,255,.9),inset 0 -10px 14px -9px rgba(150,178,235,.55)!important}',
          /* 参考图那种「字母 + 文字」的胶囊：图标收掉，字母用 ::before 贴上去 */
          '[class*="_sidebarCol"] button[class*="_panelRow"] svg,',
          '[class*="_sidebarCol"] button[class*="_newSession"] svg,',
          '[class*="_sidebarCol"] button[class*="_pill_"] svg{display:none!important}',
          /* 兜底：侧栏里那些「纯图标按钮」（侧栏开关、收起态的新会话方块等）不能把 svg 收掉，
             否则按钮还在、图标没了，看着就是"消失了"。胶囊那几个仍然按上面的规则隐藏。 */
          '[class*="_sidebarCol"] button:has(> svg):not([class*="_panelRow"]):not([class*="_newSession"]):not([class*="_pill_"]):not([class*="_brand"]) svg{',
          'display:block!important;width:auto!important;height:auto!important}',
          '[class*="_sidebarCol"] button:has(> svg):not([class*="_panelRow"]):not([class*="_newSession"]):not([class*="_pill_"]):not([class*="_brand"]){',
          'min-width:28px!important;min-height:28px!important;display:inline-flex!important;',
          'align-items:center!important;justify-content:center!important}',
          /* 侧栏收起时「新会话」只剩一颗 28×28 小方块，图标收掉就成了空蓝框 → 放回来，
             字母前缀也撤掉（那颗方块没地方放字母） */
          '[data-sidebar-collapsed] button[class*="_newSession"] svg,',
          '[class*="_collapsed"] button[class*="_newSession"] svg{display:block!important;flex:none!important}',
          '[data-sidebar-collapsed] button[class*="_newSession"]::before,',
          '[class*="_collapsed"] button[class*="_newSession"]::before{display:none!important}',
          '[data-sidebar-collapsed] button[class*="_newSession"] *,',
          '[class*="_collapsed"] button[class*="_newSession"] *{justify-content:center!important}',
          /* 收起态那颗方块：文字 / Ctrl+N 快捷键虽然看不见，但还占着宽度，会把图标顶到左边，
             高度也被上面胶囊那套 min-height:36 撑成竖条 → 这里把盒子和内容都归位。 */
          '[data-sidebar-collapsed] button[class*="_newSession"],',
          '[class*="_collapsed"] button[class*="_newSession"]{width:28px!important;height:28px!important;',
          'min-height:28px!important;max-height:28px!important;margin:0!important;padding:0!important}',
          '[data-sidebar-collapsed] button[class*="_newSession"] [class*="_newSessionShortcut"],',
          '[class*="_collapsed"] button[class*="_newSession"] [class*="_newSessionShortcut"]{display:none!important}',
          /* 标签遮罩是 flex:1，在 28px 的方块里会把图标顶到左边；让它不参与伸缩即可
             （不能改成 0 宽/隐藏：图标跟它在同一个容器里，会一起没） */
          '[data-sidebar-collapsed] button[class*="_newSession"] [class*="_newSessionLabelMask"],',
          '[class*="_collapsed"] button[class*="_newSession"] [class*="_newSessionLabelMask"]{',
          'flex:none!important}',
          '[data-sidebar-collapsed] button[class*="_newSession"] [class*="_newSessionContent"],',
          '[class*="_collapsed"] button[class*="_newSession"] [class*="_newSessionContent"]{width:auto!important;gap:0!important}',
          /* 「新会话」那颗的文字被内层容器居中，跟别的左对齐不一致，掰回来 */
          '[class*="_sidebarCol"] button[class*="_newSession"] *{justify-content:flex-start!important}',
          '[class*="_sidebarCol"] button[class*="_newSession"]{justify-content:flex-start!important}',
          /* 新会话自己带 height:38px / padding:8px / 下边距 10px，跟列表里那些
             min-height:36px / padding:7px / gap:2px 的胶囊差一点 → 全部按同一套写死，
             高度和内边距完全一致，靠 min-height 撑出同一颗胶囊。 */
          '[class*="_sidebarCol"] button[class*="_newSession"]{height:auto!important;min-height:36px!important;',
          'box-sizing:border-box!important;margin-bottom:-9px!important;',
          'padding-top:7px!important;padding-bottom:7px!important}',
          '[class*="_sidebarCol"] button[class*="_panelRow"],',
          '[class*="_sidebarCol"] button[class*="_pill_"]{box-sizing:border-box!important;padding-left:18px!important;',
          'padding-top:7px!important;padding-bottom:7px!important}',
          '[class*="_sidebarCol"] [data-dshb-key]::before{',
          'content:attr(data-dshb-key);display:inline-block;width:18px;min-width:18px;margin-right:12px;',
          'text-align:left;flex:none;',
          'font:400 20px/1 "dshb-caps","dshb-text","Segoe UI",sans-serif;color:#4a63b8;letter-spacing:0}',
          '[class*="_sidebarCol"] button[class*="_panelRow"]:hover,',
          '[class*="_sidebarCol"] button[class*="_newSession"]:hover,',
          '[class*="_sidebarCol"] button[class*="_pill_"]:hover,',
          '[class*="_sidebarCol"] button[class*="_brand"]:hover{',
          'background-color:rgba(62,81,157,.06)!important}',
          /* 选中的会话行：原来是一圈白 + 一圈蓝的双环、圆角还是方角，
             跟上面那排胶囊不是一套 → 直接套胶囊：藏青描边、全圆、同款淡蓝投影 */
          '[class*="_sidebarCol"] [aria-selected="true"],',
          '[class*="_sidebarCol"] [aria-current="page"],',
          '[class*="_sidebarCol"] [data-state="active"],',
          '[class*="_sidebarCol"] [class*="_active"]{',
          'border:2.5px solid #3e519d!important;',
          'border-radius:999px!important;',
          'background-color:rgba(255,255,255,.6)!important;',
          'box-shadow:0 2px 0 rgba(62,81,157,.10),0 6px 14px rgba(148,172,232,.42)',
          ',inset 0 2px 0 rgba(255,255,255,.9)!important}',
          /* 侧栏收起时「新会话」会缩成标题栏里 28×28 的小方块（fixed 在 left:48px），
             还套着纸胶囊那套藏青描边+白圈就成了三个环。换成和标题条同一套：蓝玻璃小片。 */
          '[data-sidebar-collapsed] button[class*="_newSession"],',
          '[class*="_collapsed"] button[class*="_newSession"]{',
          'background:rgba(122,170,255,.14)!important;',
          'border:1.5px solid rgba(122,170,255,.45)!important;',
          'border-radius:9px!important;',
          'box-shadow:0 2px 8px rgba(0,0,0,.35)!important;',
          'padding:0!important;gap:0!important;',
          'color:#7aaaff!important}',
          '[data-sidebar-collapsed] button[class*="_newSession"]:hover,',
          '[class*="_collapsed"] button[class*="_newSession"]:hover{',
          'background:rgba(122,170,255,.26)!important}',
          '#' + SKIN_SNOW_ID + '{position:fixed!important;inset:0;width:100%;height:100%;',
          'pointer-events:none!important;z-index:2147483000}',
          /* 放在最后：收起态那颗方块的尺寸必须压过前面胶囊那套 min-height:36
             （同特异性下后来的赢），否则小方块被撑成竖条、图标跟着跑偏。 */
          '[data-sidebar-collapsed] button[class*="_newSession"],',
          '[class*="_collapsed"] button[class*="_newSession"]{',
          'width:28px!important;height:28px!important;min-height:28px!important;max-height:28px!important;',
          'padding:0!important;margin:0!important;gap:0!important;',
          'justify-content:center!important;align-items:center!important}',
        ].join('');

        let style = document.getElementById(SKIN_CSS_ID);
        if (style === null) {
          style = document.createElement('style');
          style.id = SKIN_CSS_ID;
          document.head.appendChild(style);
        }
        if (style.textContent !== css) style.textContent = css;

        // 旧版本的贴图边（现在已经不用了）热更时会留在 DOM 里，顺手清掉
        try {
          const stale = document.getElementById('dshb-edge');
          if (stale) stale.remove();
        } catch (e) { /* 忽略 */ }
        // 清掉旧版本调试留下的浮层（热更不会自己收走）
        try {
          const junk = document.querySelectorAll('div[style*="2147483600"]');
          for (let i = 0; i < junk.length; i += 1) {
            if (junk[i].id !== SKIN_SNOW_ID) junk[i].remove();
          }
        } catch (e) { /* 忽略 */ }
        const mount = function () {
          if (!document.body) return;
          // 雪：旧的 canvas 和它的循环都要收走，再挂一条新的
          const oldSnow = document.getElementById(SKIN_SNOW_ID);
          if (oldSnow) oldSnow.remove();
          const snow = document.createElement('canvas');
          snow.id = SKIN_SNOW_ID;
          snow.setAttribute('aria-hidden', 'true');
          document.body.appendChild(snow);
          try {
            const stopSnow = startSnow(snow);
            if (typeof stopSnow === 'function') stops.push(stopSnow);
          } catch (e) { /* 雪画不出来不影响底图 */ }
          paintSurface();
          window.addEventListener('resize', paintSurface);
          stops.push(function () { window.removeEventListener('resize', paintSurface); });
          const t1 = setTimeout(paintSurface, 400);
          const t2 = setTimeout(paintSurface, 1500);
          const t3 = setTimeout(paintSurface, 4000);
          stops.push(function () {
            clearTimeout(t1); clearTimeout(t2); clearTimeout(t3);
          });
            // 换会话/换工作区时主栏（和它的盖底层）会被整个替换掉。
            // 轮询最快也要 1.2s 才补，看着就是"先黑一下再出图"。
            // 这里挂一个只监听新增节点的 observer，插进来下一帧就补，视觉上跟切换同拍。
            let raf = 0;
            const kick = function () {
              if (raf) return;
              raf = window.requestAnimationFrame(function () {
                raf = 0;
                paintSurface();
              });
            };
            const observer = new MutationObserver(kick);
            observer.observe(document.body, { childList: true, subtree: true });
            stops.push(function () {
              observer.disconnect();
              if (raf) window.cancelAnimationFrame(raf);
              raf = 0;
            });
            kick();
          try {
            // 换会话/换工作区时主栏元素会整个重建，MutationObserver 会漏（还会被次数上限截断）。
            // 改成轻量轮询：只要当前主栏没挂上皮肤就补一次，500ms 一次，开销就是两次 query。
            const poll = window.setInterval(function () {
              const c = cardElement();
              if (c === null) return;
              // 换会话时主栏和它内部那层底色都会重建，所以这里每次都走一遍：
              // 类已经有就跳过，层已经剥过就跳过——真正干活的只有新出现的那些。
              paintSurface();
            }, 1200);
            stops.push(function () { window.clearInterval(poll); });
          } catch (e) { /* 轮询起不来就只画那几次 */ }
        };
        if (document.body) mount();
        else document.addEventListener('DOMContentLoaded', mount, { once: true });
      } catch (error) {
        try { console.error('[dsh-boot] 主界面底图挂载失败：', error); } catch (e) { /* 忽略 */ }
      }
    }


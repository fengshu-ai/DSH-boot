/**
 * 浅色皮肤包。
 *
 * 这是从「浅色模式那一版」（commit 4c79728）里抽出来的全部浅色相关参数：
 * 颜色、薄幕、视频滤镜、侧栏纸色，以及只属于浅色的 CSS 规则。
 *
 * 皮肤在 `theme === 'light'` 时整体套用这个包；深色包结构相同（`packs/dark.js`）。
 * 不含任何逻辑，只描述"长什么样"，方便单独调节、单独启用。
 */

export const light = {
  id: 'light',

  /* ── 外壳 ── */
  titlebar: '#efe8dc',   // 窗口标题条 / 顶栏
  body: '#efe8dc',       // 窗口边缘底色，避免露白
  surface: '#f4efe6',    // 主栏底色（静帧模式下的打底）

  /* ── 雪景 ── */
  veil: 'rgba(250,247,241,.06)',                 // 雪景上方那层纸色薄幕
  videoFilter: 'brightness(1.02) saturate(1.02)', // 动态底图视频的滤镜

  /* ── 侧栏（两套共用同一套纸色，放在包里是为了能单独调）── */
  sidebar: {
    fill: '#eee9e1',
    image: 'radial-gradient(150% 110% at 26% -14%,#F4F2EE 0%,#F0EBE3 45%,#EBE6DC 100%)',
    ink: '#1b2333',   // 主文字
    ink2: '#46527a',  // 次级
    ink3: '#5c6785',  // 弱化
    border: '#3e519d',
    pillFill: 'rgba(251,249,244,.62)',
  },

  /* ── 只属于浅色的 CSS（深色包里是另一套）── */
  css: `
html[data-dshb-theme="light"] body{background-color:#efe8dc!important}
[class*="_composerSeat"]{background:transparent!important}
[class*="_sidebarCol"]{background-color:#eee9e1!important;
  background-image:radial-gradient(150% 110% at 26% -14%,#F4F2EE 0%,#F0EBE3 45%,#EBE6DC 100%)!important}
[class*="_sidebarCol"] :not(svg):not(svg *){color:#1b2333!important}
[class*="_brandName"] svg:first-of-type *{fill:#2b3660!important;stop-color:#2b3660!important}
  `.trim(),
}

export default light

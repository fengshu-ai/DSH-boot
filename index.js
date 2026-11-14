/**
 * 启动界面 —— Host 半边。
 *
 * 纯展示：真正的界面在 Client 半边（shell.overlay 插槽里的一张全屏启动幕）。
 * Host 侧不需要任何服务，占位让 Loader 能解析这条 row。
 */

export const name = 'dsh-boot'

export function apply() {
  /* 没有宿主逻辑：启动幕完全在浏览器里跑 */
}

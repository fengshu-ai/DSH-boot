/**
 * 皮肤包集合：按主题 id 取对应的那一个。
 *
 * 皮肤（client.js）在启动时判断当前主题，然后 `pick(theme)` 拿到包，
 * 把包里的颜色/薄幕/视频滤镜/CSS 一次性套用。两个包互不影响。
 */

import { light } from './light.js'

/** theme: 'light' | 'dark' | 'system' */
export function pick(theme) {
  return theme === 'light' ? light : null
}

export const packs = { light }
export default packs

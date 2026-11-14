# 安装

给别人的安装说明。**Windows / macOS / Linux 都一样**，只是路径写法不同。

## 前置

| 需要 | 版本 | 用途 |
|---|---|---|
| DeepSeek Harness（DSH） | ≥ 0.2.0-rc.1 | 宿主 |
| Node.js | ≥ 20 | 构建 |
| pnpm | 任意 | 安装 profile 依赖 |
| Python 3 | 3.9+ | 生成素材（需 `Pillow`、`fonttools`、`brotli`） |

```bash
pip install Pillow fonttools brotli
```

## 第一步：克隆并构建

```bash
git clone https://github.com/fengshu-ai/DSH-boot.git
cd DSH-boot
npm run assets     # 生成 assets/*.b64（仓库自带素材，不需要游戏本体）
npm run build      # 生成 client.js
```

构建成功时最后一行是 `patched …\client.js bytes …`。

## 第二步：挂进 profile

DSH 的插件是按 **profile** 加载的。找到你的 profile 目录（默认是 `~/.dsh/profiles/desktop`，Windows 上是 `C:\Users\<你>\.dsh\profiles\desktop`），编辑其中的 `package.json`：

**① 在 `dependencies` 里加一行**（把路径换成你克隆的位置；Windows 用正斜杠）：

```json
"@local/dsh-boot": "link:C:/Users/you/DSH-boot"
```

macOS / Linux：

```json
"@local/dsh-boot": "link:/Users/you/DSH-boot"
```

**② 在 `dsh.profile.bundles` 数组末尾加一项**：

```json
"@local/dsh-boot"
```

## 第三步：装依赖并重启

```bash
cd ~/.dsh/profiles/desktop      # Windows: cd %USERPROFILE%\.dsh\profiles\desktop
pnpm install
```

然后**重启 DSH**。下次启动时会先播启动幕（约 4.2 秒），任意键或点击可跳过。

## 验证

- 启动时出现标题字 + 载入日志 + 撕纸侧栏 → 主界面是米色纸侧栏 + 像素胶囊；
- 浏览器地址里加 `?boot=0` 可以不播启动幕，`?skin=0` 可整块关掉皮肤；
- DSH 的「插件」页面里能看到 **启动界面**，详情页就是本仓库的 README。

## 卸载

把上面加的两行删掉（`dependencies` 一条、`bundles` 一条），再 `pnpm install`、重启即可。也可以直接删掉 profile 里的 `node_modules/@local/dsh-boot`。

## 常见问题

**启动幕不出现**
先确认 `DSH-boot/client.js` 存在（没构建的话这文件不会生成）；再看 profile 的 `package.json` 里那两处是不是都加了；最后看「插件」页面里它是否被禁用。

**画面是黑的 / 只有一条底图**
多半是构建时 `assets/*.b64` 不全。重跑 `npm run assets`，确认 `assets/` 下有 `art.b64`、`scene.b64`、`title-mask.b64`、`title-side.b64`、`textfont.b64`、`capsfont.b64` 六个文件，再 `npm run build`。

**和别的启动幕插件打架**
`dsh-550c-boot` 之类同样接管启动画面的插件不要同时启用，两个都挂会互相覆盖。留下想要的，另一个从 `dsh.profile.bundles` 里移掉。

**改了源码没变化**
DSH 会热重载，但改了 `package.json` 或新增依赖需要重启 profile；浏览器里也可以 `Ctrl+R` 强刷一次。

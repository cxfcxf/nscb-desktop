# NSCB 桌面版

[English](README.md) | **中文**

用于 Nintendo Switch 游戏文件操作的现代桌面图形界面：压缩、解压、合并、转换、拆分、重打包、重命名与校验（NSP、XCI、NSZ、XCZ、NCZ）。

基于 Tauri v2 + React + Vite 构建，后端由 [nscb_rust](https://github.com/cxfcxf/nscb_rust) 驱动。

## 功能特性

- 将 NSP/XCI 压缩为 NSZ/XCZ（zstd 等级 1-22）
- 将 NSZ/XCZ/NCZ 解压回 NSP/XCI
- 将多个文件合并、降级或重打包为单个 NSP/XCI（支持固件控制：RSV 上限、密钥生成补丁）
- 批量合并：选择包含各游戏子文件夹的目录（本体 + 更新 + DLC），一次性全部合并，并支持对每个游戏单独跳过/处理
- 在 NSP 与 XCI 之间转换
- 将多标题文件拆分为按标题分组的文件夹，或独立的 NSP/XCI 文件
- 由拆分后的文件夹创建/重打包 NSP
- 使用包元数据 + NUTDB 查询重命名文件，提供基础/高级选项以控制重命名模式、语言、版本处理与 DLC 命名
- NUTDB 工具：刷新缓存、查询 Title ID
- 校验容器完整性（NSP、NSX、NSZ、XCI、XCZ）三个级别：解密（lv1）、签名（lv2）、完整（lv3）
- 查看文件信息（内容明细与元数据摘要）
- 支持文件或文件夹拖放（重命名支持递归文件夹输入）
- 实时输出控制台与进度跟踪
- 压缩/解压/转换/拆分/重命名/校验均支持批量
- 深色主题界面，SVG 图标与文件类型徽标
- 自动从 GitHub Releases 下载 nscb_rust 后端，也可手动导入
- NUTDB 下载支持代理（URL 前缀代理，便于受防火墙影响的用户）
- 可配置 NUTDB 源地址覆盖
- 可为大体量后端工作文件配置临时目录
- 国际化支持，首次启动可选语言，并提供完整简体中文
- 首次启动的加密密钥设置向导
- 跨平台：Windows x86_64、Linux x86_64、macOS ARM64

## 支持平台

| 平台 | 架构 | 后端二进制 |
|---|---|---|
| Windows | x86_64 | `nscb_rust.exe` |
| Linux | x86_64 | `nscb_rust-linux-amd64` |
| macOS | ARM64 | `nscb_rust-macos-arm64` |

## 前置条件

- Switch 密钥文件（`prod.keys` 或 `keys.txt`）
- nscb_rust 后端二进制（自动下载或在设置中手动导入）
- **Windows**：WebView2 运行时（Windows 10/11 已内置）
- **Linux**：WebKitGTK 4.1、libayatana-appindicator3
- **macOS**：macOS 11.0+

## 使用方法

1. 直接运行程序（独立便携 exe），或使用对应平台的安装包。
2. 首次启动时选择界面语言（**English** 或 **简体中文**）。
3. 随后设置向导会提示导入**加密密钥**（`prod.keys` 或 `keys.txt`）。
4. 如果缺少 nscb_rust 后端，顶部横幅会引导你前往**设置 > 工具**，在那里可从 GitHub 下载或手动导入。
5. 从侧边栏选择操作，然后拖入你的文件。

语言选择会保存在应用设置中，随时可在**设置 > 通用 > 语言**更改。

如果系统临时所在磁盘空间不足，请打开**设置 > 工具 > 临时目录**，选择空间更大的硬盘上的目录；留空则继续使用操作系统默认目录。

### 重命名说明

- 基础视图与高级视图共享同一份重命名状态。
- DLC 命名模式：`Off`、`Full name`、`Tag mode`。
- `Tag mode` 会追加 `[DLC N]`；视元数据与重命名模式而定，仍可能使用解析出的 DLC 名称。
- 预览反映后端所支持的重命名行为；当前不支持自定义文件名排序。

## 开发

需要 [Rust](https://rustup.rs) + [Node.js](https://nodejs.org)（v18+）。

```bash
npm install
npm run dev        # Tauri 开发模式（热重载）
npm run dev:vite   # 仅启动 Vite 开发服务器（不含 Tauri）
npm test           # 运行单元测试
```

## 构建

```bash
# NSIS 安装包（Windows）/ deb（Linux）/ dmg（macOS）
npm run build

# 便携目录位于 release/NSCB Desktop/
npm run dist:portable
```

## 项目结构

```text
nscb-desktop/
|- ui/                     # 前端（React + TypeScript）
|  |- App.tsx              # 全部组件与页面
|  |- App.css              # 深色主题设计系统
|  |- main.tsx             # 入口
|  `- lib/
|     |- api.ts            # Tauri 插件封装
|     |- i18n.ts           # 语言字典与持久化语言偏好
|     |- i18n.test.ts      # 语言归一化/翻译的单元测试
|     |- nscb-runner.ts    # 后端进程 + 进度解析
|     `- nscb-runner.test.ts # CLI 参数构建的单元测试
|- src-tauri/              # Tauri v2 / Rust 后端
|  |- src/lib.rs           # 命令：run_nscb、import_keys 等
|  |- tauri.conf.json      # 窗口配置与打包
|  `- capabilities/        # 安全权限
`- scripts/portable.mjs    # 便携目录组装
```

## 许可证

ISC

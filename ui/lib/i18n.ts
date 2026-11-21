// ============================================================
// 国际化（i18n）核心
// ------------------------------------------------------------
// 设计要点：
// 1. 语言偏好持久化在 Tauri 的 settings.json（key = "language"），
//    与 proxy / nutdbUrl 等设置共用同一套读写接口。
// 2. 首次启动（从未保存过语言）时显示语言选择页；一旦用户确认，
//    之后不再打扰，除非在设置里手动切换。
// 3. 文案按命名空间分组，避免键名冲突；支持 {name} 占位符插值。
// 4. 后端命令的原样输出（输出控制台里的行）不经过翻译，保持原样，
//    否则会破坏用户对原始日志的排查。
// ============================================================

import { useCallback, useEffect, useState } from 'react';
import { getSetting, saveSetting } from './api';

export type Locale = 'en' | 'zh-CN';

export const LOCALES: Locale[] = ['en', 'zh-CN'];

// 语言元信息：nativeName 用于语言选择页展示，label 用于下拉/按钮
export const LOCALE_META: Record<Locale, { nativeName: string; label: string }> = {
    en: { nativeName: 'English', label: 'English' },
    'zh-CN': { nativeName: '简体中文', label: '中文（简体）' },
};

const STORAGE_KEY = 'language';

// 缺省语言：未保存偏好或读取失败时使用英文
const DEFAULT_LOCALE: Locale = 'en';

// ----------------------------------------------------------------
// 译文表：按命名空间分组
// ----------------------------------------------------------------

type Dict = Record<string, string>;

const dictionaries: Record<Locale, Dict> = {

    en: {
        // ---- 通用 ----
        'common.appName': 'NSCB Desktop',
        'common.loading': 'Loading...',
        'common.cancel': 'Cancel',
        'common.clearAll': 'Clear All',
        'common.browse': 'Browse',
        'common.reset': 'Reset',
        'common.done': 'Done',
        'common.waiting': 'Waiting...',
        'common.completedOk': 'Completed successfully!',
        'common.exitCode': 'Completed with exit code: {code}',
        'common.cancelled': 'Cancelled',
        'common.ready': 'Ready to go!',
        'common.available': '{tag} available',
        'common.removeFile': 'Remove file',
        'common.filesSelected': '{count} file{s} selected',
        'common.outputDir': 'Output Directory',
        'common.outputDirPlaceholder': 'Default: same as source file',
        'common.backendLabel': 'nscb_rust Backend',

        // ---- 语言选择 ----
        'lang.title': 'Select Language',
        'lang.subtitle': 'Choose the interface language. You can change it later in Settings.',
        'lang.confirm': 'Confirm',

        // ---- 侧边栏导航 ----
        'nav.compress': 'Compress',
        'nav.decompress': 'Decompress',
        'nav.merge': 'Merge',
        'nav.convert': 'Convert',
        'nav.split': 'Split',
        'nav.dspl': 'Split to Files',
        'nav.create': 'Create/Repack',
        'nav.info': 'Info',
        'nav.rename': 'Rename',
        'nav.batchmerge': 'Batch Merge',
        'nav.verify': 'Verify',
        'nav.settings': 'Settings',

        // ---- 压缩等级 ----
        'level.fast': 'Fast',
        'level.normal': 'Normal',
        'level.great': 'Great',
        'level.ultra': 'Ultra',

        // ---- 投放区 / 文件列表 ----
        'drop.filesHere': 'Drop files here or',
        'drop.foldersHere': 'Drop files/folders here or',
        'drop.browseFolder': 'browse folder',
        'drop.defaultHint': 'Supports NSP, XCI, NSZ, XCZ, NCZ files',

        // ---- 压缩 ----
        'compress.title': 'Compress',
        'compress.subtitle': 'Compress NSP/XCI files to NSZ/XCZ format',
        'compress.hint': 'Drop NSP or XCI files to compress',
        'compress.startLabel': 'Start Compression',
        'compress.startMessage': 'Starting compression...',
        'compress.optionsTitle': 'Compression Options',
        'compress.levelLabel': 'Compression Level',

        // ---- 解压 ----
        'decompress.title': 'Decompress',
        'decompress.subtitle': 'Decompress NSZ/XCZ/NCZ files back to NSP/XCI format',
        'decompress.hint': 'Drop NSZ, XCZ, or NCZ files to decompress',
        'decompress.startLabel': 'Start Decompression',
        'decompress.startMessage': 'Starting decompression...',

        // ---- 合并 ----
        'merge.title': 'Merge',
        'merge.subtitle': 'Merge, downgrade, or repack Switch files into a single output',
        'merge.inputFiles': 'Input Files',
        'merge.dropHint': 'Drop base game, update, and DLC files',
        'merge.optionsTitle': 'Merge Options',
        'merge.outputFormat': 'Output Format',
        'merge.xciDesc': 'XCI (Game Cartridge)',
        'merge.nspDesc': 'NSP (eShop Package)',
        'merge.singleXci': 'Single XCI with all content',
        'merge.singleNsp': 'Single NSP with all content',
        'merge.nodelta': 'Exclude Delta Fragments',
        'merge.nodeltaDesc': 'Skip delta NCA fragments during merge',
        'merge.pv': 'Show Firmware Info',
        'merge.pvDesc': 'Print before/after firmware version info during merge',
        'merge.rsvcap': 'RSV Cap',
        'merge.rsvcapPlaceholder': 'Optional — caps RequiredSystemVersion',
        'merge.rsvcapDesc': 'Cap the RequiredSystemVersion to a specific value',
        'merge.keypatch': 'Key Generation Patch',
        'merge.keypatchPlaceholder': 'Optional — lowers NCA key generation',
        'merge.keypatchDesc': 'Lower NCA key generation to a specific value',
        'merge.startLabel': 'Start Merge',
        'merge.startMessage': 'Starting merge...',

        // ---- 转换 ----
        'convert.title': 'Convert',
        'convert.subtitle': 'Convert between NSP and XCI formats',
        'convert.hint': 'Drop NSP or XCI files to convert',
        'convert.startLabel': 'Start Conversion',
        'convert.startMessage': 'Starting conversion...',
        'convert.optionsTitle': 'Convert Options',
        'convert.toXci': 'Convert NSP → XCI',
        'convert.toNsp': 'Convert XCI → NSP',

        // ---- 拆分 ----
        'split.title': 'Split',
        'split.subtitle': 'Split multi-title files into per-title NCA folders',
        'split.hint': 'Drop NSP or XCI files to split into per-title NCA folders',
        'split.startLabel': 'Start Split',
        'split.startMessage': 'Starting split...',

        // ---- 拆分到文件 ----
        'dspl.title': 'Split to Files',
        'dspl.subtitle': 'Split multi-title files into individual NSP/XCI files',
        'dspl.hint': 'Drop NSP or XCI files to split into individual titles',
        'dspl.startLabel': 'Start Split',
        'dspl.startMessage': 'Starting split to files...',
        'dspl.optionsTitle': 'Split Options',
        'dspl.outXci': 'Output individual XCI files',
        'dspl.outNsp': 'Output individual NSP files',

        // ---- 格式选项通用 ----
        'format.outputFormat': 'Output Format',

        // ---- 创建/重打包 ----
        'create.title': 'Create / Repack',
        'create.subtitle': 'Repack a split NCA folder back into an NSP file',
        'create.inputFolder': 'Input Folder',
        'create.sourceFolder': 'NCA Source Folder',
        'create.sourcePlaceholder': 'Select the folder produced by Split...',
        'create.outputIs': 'Output: {name}',
        'create.startLabel': 'Start Repack',
        'create.startMessage': 'Starting repack...',

        // ---- 信息 ----
        'info.title': 'Info',
        'info.subtitle': 'View content details or metadata summary of NSP/XCI files',
        'info.hint': 'Drop NSP, XCI, NSZ, or XCZ files to inspect',
        'info.modeTitle': 'Info Mode',
        'info.outputType': 'Output Type',
        'info.contentList': 'Content Details',
        'info.fileList': 'Metadata Summary',
        'info.contentDesc': 'Detailed content listing with title IDs and versions',
        'info.metaDesc': 'File-level metadata summary',
        'info.startLabel': 'Get Info',
        'info.startMessage': 'Fetching info...',

        // ---- 重命名 ----
        'rename.title': 'Rename',
        'rename.subtitle': 'Rename Switch files using metadata and NUTDB lookup',
        'rename.inputTitle': 'Input Files / Folders',
        'rename.dropHint': 'Drop files or folders to rename',
        'rename.optionsTitle': 'Rename Options',
        'rename.tabBasic': 'Basic',
        'rename.tabAdvanced': 'Advanced',
        'rename.renmode': 'Rename Mode',
        'rename.addlangue': 'Add Language',
        'rename.noversion': 'Version Handling',
        'rename.dlcrname': 'DLC Rename',
        'rename.language': 'Language',
        'rename.dlcNaming': 'DLC Naming',
        'rename.versionXciV0': 'Version — XCI v0',
        'rename.formatPreview': 'Format preview',
        'rename.yes': 'Yes',
        'rename.no': 'No',
        'rename.force': 'Force',
        'rename.skipCorrTid': 'Skip Correct TID',
        'rename.skipIfTid': 'Skip If TID',
        'rename.modeForceDesc': 'Always rename files',
        'rename.modeSkipCorrDesc': 'Skip files with correct title ID in name',
        'rename.modeSkipIfDesc': 'Skip files that already contain a title ID',
        'rename.addLangDesc': 'Include language information in filename',
        'rename.langAppendDesc': 'Append supported languages to the game name',
        'rename.includeVersion': 'Include version',
        'rename.excludeVersion': 'Exclude version',
        'rename.excludeV0Xci': 'Exclude v0 for XCI',
        'rename.verIncludeDesc': 'Include version number in filename',
        'rename.verExcludeDesc': 'Omit version number from filename',
        'rename.verExcludeV0Desc': 'Omit v0 for XCI files only',
        'rename.dlcOff': 'Do not rename DLC files',
        'rename.dlcYes': 'Rename DLC files with full name',
        'rename.dlcTag': 'Append DLC tag to filename',
        'rename.dlcOffShort': 'Off',
        'rename.dlcFull': 'Full name',
        'rename.dlcTagMode': 'Tag mode',
        'rename.dlcOffDesc': 'DLC files are not renamed',
        'rename.dlcFullDesc': 'DLC files renamed using resolved name from metadata or NUTDB',
        'rename.dlcTagDesc': 'Resolved name used where available; [DLC N] tag always appended',
        'rename.includeV0': 'Include v0',
        'rename.omitV0': 'Omit v0 for XCI',
        'rename.v0Desc': 'Whether to include v0 in XCI filenames',
        'rename.clickExclude': 'Click to exclude version',
        'rename.clickInclude': 'Click to include version',
        'rename.lockedHint': 'Always included — Language and DLC naming affect this portion',
        'rename.segmentHint': 'Name segment depends on available metadata and rename mode',
        'rename.startLabel': 'Start Rename',
        'rename.startMessage': 'Renaming files...',
        'rename.nutdbTitle': 'NUTDB Utilities',
        'rename.refreshCache': 'Refresh NUTDB Cache',
        'rename.refreshDesc': 'Update the local NUTDB title database cache',
        'rename.refreshMessage': 'Refreshing NUTDB cache...',
        'rename.lookupLabel': 'Title ID Lookup',
        'rename.lookupPlaceholder': 'e.g. 0100F8F0000A2000',
        'rename.lookupButton': 'Lookup',
        'rename.lookupDesc': 'Look up a title ID in the NUTDB database',
        'rename.lookupMessage': 'Looking up {id}...',

        // ---- 批量合并 ----
        'batch.title': 'Batch Merge',
        'batch.subtitle': 'Auto-merge all games in a folder, skipping already-merged titles',
        'batch.foldersTitle': 'Folders',
        'batch.baseFolder': 'Base Folder',
        'batch.basePlaceholder': 'Folder containing game subfolders...',
        'batch.baseDesc': 'Each subfolder is treated as one game (base + updates + DLC)',
        'batch.outputFolder': 'Output Folder',
        'batch.outputPlaceholder': 'Required — all merged outputs go here',
        'batch.outputDesc': 'Merged files are saved here. Existing outputs are checked to skip already-merged games.',
        'batch.optionsTitle': 'Merge Options',
        'batch.scan': 'Scan Folder',
        'batch.scanning': 'Scanning...',
        'batch.summaryFound': '{count} game{s} found',
        'batch.summaryToMerge': '{count} to merge',
        'batch.summaryAlreadyMerged': '{count} already merged',
        'batch.summaryDone': '{count} done',
        'batch.summaryFailed': '{count} failed',
        'batch.gamesTitle': 'Discovered Games',
        'batch.foundCount': '{count} found',
        'batch.statusPending': 'Pending',
        'batch.statusSkipped': 'Skipped',
        'batch.statusRunning': 'Running…',
        'batch.statusDone': 'Done',
        'batch.statusError': 'Error',
        'batch.clickSkip': 'Click to skip',
        'batch.clickInclude': 'Click to include',
        'batch.fileCount': '{count} file{s}',
        'batch.manualSkipped': 'Manually skipped',
        'batch.mergeFailed': 'Merge failed',
        'batch.mergingGame': 'Merging: {name}',
        'batch.complete': 'Batch merge complete!',
        'batch.startLabel': 'Start Batch Merge ({count})',

        // ---- 校验 ----
        'verify.title': 'Verify',
        'verify.subtitle': 'Verify integrity of NSP/XCI/NSZ/XCZ container files',
        'verify.hint': 'Drop NSP, NSX, NSZ, XCI, or XCZ files to verify',
        'verify.levelTitle': 'Verification Level',
        'verify.mode': 'Mode',
        'verify.lv1': 'Decryption (lv1)',
        'verify.lv2': 'Signature (lv2)',
        'verify.lv3': 'Full (lv3)',
        'verify.lv1Desc': 'Decryption test only — checks that NCA content can be decrypted with current keys',
        'verify.lv2Desc': 'Signature verification — validates NCA signatures',
        'verify.lv3Desc': 'Full verification — decryption + signature + hash check',
        'verify.startLabel': 'Verify',
        'verify.startMessage': 'Verifying...',

        // ---- 设置 ----
        'settings.title': 'Settings',
        'settings.subtitle': 'Manage backend binary and encryption keys',
        'settings.sectionTools': 'Tools',
        'settings.sectionNetwork': 'Network',
        'settings.sectionGeneral': 'General',
        'settings.backendTitle': 'Backend Binary (nscb_rust)',
        'settings.backendInstalled': 'Installed: {version}',
        'settings.backendUnknown': 'Unknown version (manually imported)',
        'settings.checkUpdate': 'Check for Update',
        'settings.checking': 'Checking...',
        'settings.importManual': 'Import Manually',
        'settings.updateUnreachable': 'Could not reach GitHub. Check your network connection.',
        'settings.updateUpToDate': 'Already up to date ({version})',
        'settings.updateDownloading': 'Downloading {tag}...',
        'settings.updateUpdated': 'Updated to {tag}',
        'settings.updateFailed': 'Update failed: {error}',
        'settings.backendImported': 'Backend imported manually',
        'settings.keysTitle': 'Encryption Keys',
        'settings.keysInstalled': 'Keys installed',
        'settings.keysMissing': 'No keys found',
        'settings.importKeys': 'Import Keys',
        'settings.tempTitle': 'Temporary Directory',
        'settings.tempDesc': 'Large working files for compression, decompression, merge, and rename. Leave blank to use the OS default.',
        'settings.tempPlaceholder': 'OS default temporary directory',
        'settings.proxyTitle': 'Proxy Prefix',
        'settings.proxyDesc': 'URL prefix for proxying GitHub downloads (e.g. https://gh-proxy.org/)',
        'settings.proxyPlaceholder': 'https://gh-proxy.org/',
        'settings.nutdbTitle': 'NUTDB Source URL',
        'settings.nutdbDesc': 'Override the default NUTDB title database URL',
        'settings.languageTitle': 'Language',
        'settings.languageDesc': 'Interface language used across the app',

        // ---- 设置向导 ----
        'setup.title': 'NSCB Desktop',
        'setup.subtitle': 'One-time setup: import encryption keys',
        'setup.checkItem': 'Encryption keys ({file})',
        'setup.importKeys': 'Import Keys File',
        'setup.importing': 'Importing...',
        'setup.selectKeysTitle': 'Select your encryption keys file',
        'setup.selectKeysFilter': 'Keys Files',
        'setup.selectAll': 'All Files',
        'setup.selectBackendTitle': 'Select nscb_rust backend binary',
        'setup.failedCopyKeys': 'Failed to copy keys: {error}',
        'setup.failedImportBackend': 'Failed to import backend: {error}',
        'setup.switchFiles': 'Switch Files',

        // ---- 缺失后端提示条 ----
        'banner.missing': '{backend} is missing. Go to Settings > Tools to download or import it.',
        'banner.openSettings': 'Open Settings',
    },

    'zh-CN': {
        // ---- 通用 ----
        'common.appName': 'NSCB 桌面版',
        'common.loading': '正在加载...',
        'common.cancel': '取消',
        'common.clearAll': '全部清除',
        'common.browse': '浏览',
        'common.reset': '重置',
        'common.done': '完成',
        'common.waiting': '等待中...',
        'common.completedOk': '已成功完成！',
        'common.exitCode': '已完成，退出码：{code}',
        'common.cancelled': '已取消',
        'common.ready': '准备就绪！',
        'common.available': '有新版 {tag}',
        'common.removeFile': '移除文件',
        'common.filesSelected': '已选择 {count} 个文件',
        'common.outputDir': '输出目录',
        'common.outputDirPlaceholder': '默认：与源文件相同目录',
        'common.backendLabel': 'nscb_rust 后端',

        // ---- 语言选择 ----
        'lang.title': '选择语言',
        'lang.subtitle': '请选择界面语言。之后可以在“设置”中随时更改。',
        'lang.confirm': '确定',

        // ---- 侧边栏导航 ----
        'nav.compress': '压缩',
        'nav.decompress': '解压',
        'nav.merge': '合并',
        'nav.convert': '转换',
        'nav.split': '拆分',
        'nav.dspl': '拆分到文件',
        'nav.create': '创建/重打包',
        'nav.info': '信息',
        'nav.rename': '重命名',
        'nav.batchmerge': '批量合并',
        'nav.verify': '校验',
        'nav.settings': '设置',

        // ---- 压缩等级 ----
        'level.fast': '快速',
        'level.normal': '正常',
        'level.great': '极佳',
        'level.ultra': '极致',

        // ---- 投放区 / 文件列表 ----
        'drop.filesHere': '将文件拖放到此处，或',
        'drop.foldersHere': '将文件/文件夹拖放到此处，或',
        'drop.browseFolder': '浏览文件夹',
        'drop.defaultHint': '支持 NSP、XCI、NSZ、XCZ、NCZ 文件',

        // ---- 压缩 ----
        'compress.title': '压缩',
        'compress.subtitle': '将 NSP/XCI 文件压缩为 NSZ/XCZ 格式',
        'compress.hint': '拖入 NSP 或 XCI 文件进行压缩',
        'compress.startLabel': '开始压缩',
        'compress.startMessage': '正在开始压缩...',
        'compress.optionsTitle': '压缩选项',
        'compress.levelLabel': '压缩等级',

        // ---- 解压 ----
        'decompress.title': '解压',
        'decompress.subtitle': '将 NSZ/XCZ/NCZ 文件解压回 NSP/XCI 格式',
        'decompress.hint': '拖入 NSZ、XCZ 或 NCZ 文件进行解压',
        'decompress.startLabel': '开始解压',
        'decompress.startMessage': '正在开始解压...',

        // ---- 合并 ----
        'merge.title': '合并',
        'merge.subtitle': '将 Switch 文件合并、降级或重打包为单个输出',
        'merge.inputFiles': '输入文件',
        'merge.dropHint': '拖入本体、更新和 DLC 文件',
        'merge.optionsTitle': '合并选项',
        'merge.outputFormat': '输出格式',
        'merge.xciDesc': 'XCI（游戏卡带）',
        'merge.nspDesc': 'NSP（eShop 安装包）',
        'merge.singleXci': '包含全部内容的单个 XCI',
        'merge.singleNsp': '包含全部内容的单个 NSP',
        'merge.nodelta': '排除差分片段',
        'merge.nodeltaDesc': '合并时跳过差分的 NCA 片段',
        'merge.pv': '显示固件信息',
        'merge.pvDesc': '合并时打印固件版本的前后对比信息',
        'merge.rsvcap': 'RSV 上限',
        'merge.rsvcapPlaceholder': '可选 — 限制 RequiredSystemVersion',
        'merge.rsvcapDesc': '将 RequiredSystemVersion 限制为指定值',
        'merge.keypatch': '密钥生成补丁',
        'merge.keypatchPlaceholder': '可选 — 降低 NCA 密钥生成世代',
        'merge.keypatchDesc': '将 NCA 密钥生成世代降低为指定值',
        'merge.startLabel': '开始合并',
        'merge.startMessage': '正在开始合并...',

        // ---- 转换 ----
        'convert.title': '转换',
        'convert.subtitle': '在 NSP 与 XCI 格式之间转换',
        'convert.hint': '拖入 NSP 或 XCI 文件进行转换',
        'convert.startLabel': '开始转换',
        'convert.startMessage': '正在开始转换...',
        'convert.optionsTitle': '转换选项',
        'convert.toXci': '将 NSP 转换为 XCI',
        'convert.toNsp': '将 XCI 转换为 NSP',

        // ---- 拆分 ----
        'split.title': '拆分',
        'split.subtitle': '将多标题文件拆分为按标题分组的 NCA 文件夹',
        'split.hint': '拖入 NSP 或 XCI 文件以拆分为按标题分组的 NCA 文件夹',
        'split.startLabel': '开始拆分',
        'split.startMessage': '正在开始拆分...',

        // ---- 拆分到文件 ----
        'dspl.title': '拆分到文件',
        'dspl.subtitle': '将多标题文件拆分为独立的 NSP/XCI 文件',
        'dspl.hint': '拖入 NSP 或 XCI 文件以拆分为独立标题',
        'dspl.startLabel': '开始拆分',
        'dspl.startMessage': '正在开始拆分到文件...',
        'dspl.optionsTitle': '拆分选项',
        'dspl.outXci': '输出独立的 XCI 文件',
        'dspl.outNsp': '输出独立的 NSP 文件',

        // ---- 格式选项通用 ----
        'format.outputFormat': '输出格式',

        // ---- 创建/重打包 ----
        'create.title': '创建 / 重打包',
        'create.subtitle': '将拆分后的 NCA 文件夹重新打包为 NSP 文件',
        'create.inputFolder': '输入文件夹',
        'create.sourceFolder': 'NCA 源文件夹',
        'create.sourcePlaceholder': '选择由“拆分”生成的文件夹...',
        'create.outputIs': '输出：{name}',
        'create.startLabel': '开始重打包',
        'create.startMessage': '正在开始重打包...',

        // ---- 信息 ----
        'info.title': '信息',
        'info.subtitle': '查看 NSP/XCI 文件的内容明细或元数据摘要',
        'info.hint': '拖入 NSP、XCI、NSZ 或 XCZ 文件以查看信息',
        'info.modeTitle': '信息模式',
        'info.outputType': '输出类型',
        'info.contentList': '内容明细',
        'info.fileList': '元数据摘要',
        'info.contentDesc': '包含标题 ID 和版本的详细内容列表',
        'info.metaDesc': '文件级元数据摘要',
        'info.startLabel': '获取信息',
        'info.startMessage': '正在获取信息...',

        // ---- 重命名 ----
        'rename.title': '重命名',
        'rename.subtitle': '使用元数据和 NUTDB 查询对 Switch 文件重命名',
        'rename.inputTitle': '输入文件 / 文件夹',
        'rename.dropHint': '拖入文件或文件夹进行重命名',
        'rename.optionsTitle': '重命名选项',
        'rename.tabBasic': '基础',
        'rename.tabAdvanced': '高级',
        'rename.renmode': '重命名模式',
        'rename.addlangue': '添加语言',
        'rename.noversion': '版本处理',
        'rename.dlcrname': 'DLC 重命名',
        'rename.language': '语言',
        'rename.dlcNaming': 'DLC 命名',
        'rename.versionXciV0': '版本 — XCI v0',
        'rename.formatPreview': '格式预览',
        'rename.yes': '是',
        'rename.no': '否',
        'rename.force': '强制',
        'rename.skipCorrTid': '跳过正确 TID',
        'rename.skipIfTid': '若含 TID 则跳过',
        'rename.modeForceDesc': '始终重命名文件',
        'rename.modeSkipCorrDesc': '跳过文件名中已含正确标题 ID 的文件',
        'rename.modeSkipIfDesc': '跳过文件名中已含标题 ID 的文件',
        'rename.addLangDesc': '在文件名中包含语言信息',
        'rename.langAppendDesc': '在游戏名称后追加所支持的语言',
        'rename.includeVersion': '包含版本号',
        'rename.excludeVersion': '排除版本号',
        'rename.excludeV0Xci': 'XCI 排除 v0',
        'rename.verIncludeDesc': '在文件名中包含版本号',
        'rename.verExcludeDesc': '不在文件名中包含版本号',
        'rename.verExcludeV0Desc': '仅对 XCI 文件省略 v0',
        'rename.dlcOff': '不重命名 DLC 文件',
        'rename.dlcYes': '使用完整名称重命名 DLC 文件',
        'rename.dlcTag': '在文件名后追加 DLC 标签',
        'rename.dlcOffShort': '关闭',
        'rename.dlcFull': '完整名称',
        'rename.dlcTagMode': '标签模式',
        'rename.dlcOffDesc': '不重命名 DLC 文件',
        'rename.dlcFullDesc': '使用元数据或 NUTDB 解析出的名称重命名 DLC 文件',
        'rename.dlcTagDesc': '可用时使用解析名称；始终追加 [DLC N] 标签',
        'rename.includeV0': '包含 v0',
        'rename.omitV0': 'XCI 省略 v0',
        'rename.v0Desc': '是否在 XCI 文件名中包含 v0',
        'rename.clickExclude': '点击以排除版本号',
        'rename.clickInclude': '点击以包含版本号',
        'rename.lockedHint': '始终包含 — 语言和 DLC 命名会影响此部分',
        'rename.segmentHint': '名称段取决于可用的元数据和重命名模式',
        'rename.startLabel': '开始重命名',
        'rename.startMessage': '正在重命名文件...',
        'rename.nutdbTitle': 'NUTDB 工具',
        'rename.refreshCache': '刷新 NUTDB 缓存',
        'rename.refreshDesc': '更新本地 NUTDB 标题数据库缓存',
        'rename.refreshMessage': '正在刷新 NUTDB 缓存...',
        'rename.lookupLabel': 'Title ID 查询',
        'rename.lookupPlaceholder': '例如 0100F8F0000A2000',
        'rename.lookupButton': '查询',
        'rename.lookupDesc': '在 NUTDB 数据库中查询标题 ID',
        'rename.lookupMessage': '正在查询 {id}...',

        // ---- 批量合并 ----
        'batch.title': '批量合并',
        'batch.subtitle': '自动合并文件夹中的所有游戏，已合并的标题会自动跳过',
        'batch.foldersTitle': '文件夹',
        'batch.baseFolder': '基础文件夹',
        'batch.basePlaceholder': '包含各游戏子文件夹的文件夹...',
        'batch.baseDesc': '每个子文件夹视为一个游戏（本体 + 更新 + DLC）',
        'batch.outputFolder': '输出文件夹',
        'batch.outputPlaceholder': '必填 — 所有合并输出都放在此处',
        'batch.outputDesc': '合并后的文件保存在这里。会检查已有输出以跳过已合并的游戏。',
        'batch.optionsTitle': '合并选项',
        'batch.scan': '扫描文件夹',
        'batch.scanning': '正在扫描...',
        'batch.summaryFound': '发现 {count} 个游戏',
        'batch.summaryToMerge': '{count} 个待合并',
        'batch.summaryAlreadyMerged': '{count} 个已合并',
        'batch.summaryDone': '{count} 个完成',
        'batch.summaryFailed': '{count} 个失败',
        'batch.gamesTitle': '发现的游戏',
        'batch.foundCount': '共 {count} 个',
        'batch.statusPending': '待处理',
        'batch.statusSkipped': '已跳过',
        'batch.statusRunning': '进行中…',
        'batch.statusDone': '完成',
        'batch.statusError': '错误',
        'batch.clickSkip': '点击以跳过',
        'batch.clickInclude': '点击以纳入',
        'batch.fileCount': '{count} 个文件',
        'batch.manualSkipped': '已手动跳过',
        'batch.mergeFailed': '合并失败',
        'batch.mergingGame': '正在合并：{name}',
        'batch.complete': '批量合并完成！',
        'batch.startLabel': '开始批量合并（{count}）',

        // ---- 校验 ----
        'verify.title': '校验',
        'verify.subtitle': '校验 NSP/XCI/NSZ/XCZ 容器文件的完整性',
        'verify.hint': '拖入 NSP、NSX、NSZ、XCI 或 XCZ 文件进行校验',
        'verify.levelTitle': '校验级别',
        'verify.mode': '模式',
        'verify.lv1': '解密（lv1）',
        'verify.lv2': '签名（lv2）',
        'verify.lv3': '完整（lv3）',
        'verify.lv1Desc': '仅解密测试 — 检查 NCA 内容能否用当前密钥解密',
        'verify.lv2Desc': '签名验证 — 校验 NCA 签名',
        'verify.lv3Desc': '完整校验 — 解密 + 签名 + 哈希检查',
        'verify.startLabel': '校验',
        'verify.startMessage': '正在校验...',

        // ---- 设置 ----
        'settings.title': '设置',
        'settings.subtitle': '管理后端二进制文件和加密密钥',
        'settings.sectionTools': '工具',
        'settings.sectionNetwork': '网络',
        'settings.sectionGeneral': '通用',
        'settings.backendTitle': '后端二进制文件（nscb_rust）',
        'settings.backendInstalled': '已安装：{version}',
        'settings.backendUnknown': '版本未知（手动导入）',
        'settings.checkUpdate': '检查更新',
        'settings.checking': '正在检查...',
        'settings.importManual': '手动导入',
        'settings.updateUnreachable': '无法访问 GitHub，请检查网络连接。',
        'settings.updateUpToDate': '已是最新版本（{version}）',
        'settings.updateDownloading': '正在下载 {tag}...',
        'settings.updateUpdated': '已更新到 {tag}',
        'settings.updateFailed': '更新失败：{error}',
        'settings.backendImported': '已手动导入后端',
        'settings.keysTitle': '加密密钥',
        'settings.keysInstalled': '密钥已安装',
        'settings.keysMissing': '未找到密钥',
        'settings.importKeys': '导入密钥',
        'settings.tempTitle': '临时目录',
        'settings.tempDesc': '压缩、解压、合并和重命名产生的大体积工作文件。留空则使用操作系统默认目录。',
        'settings.tempPlaceholder': '操作系统默认临时目录',
        'settings.proxyTitle': '代理前缀',
        'settings.proxyDesc': '用于代理 GitHub 下载的 URL 前缀（例如 https://gh-proxy.org/）',
        'settings.proxyPlaceholder': 'https://gh-proxy.org/',
        'settings.nutdbTitle': 'NUTDB 源地址',
        'settings.nutdbDesc': '覆盖默认的 NUTDB 标题数据库地址',
        'settings.languageTitle': '语言',
        'settings.languageDesc': '应用界面使用的语言',

        // ---- 设置向导 ----
        'setup.title': 'NSCB 桌面版',
        'setup.subtitle': '一次性设置：导入加密密钥',
        'setup.checkItem': '加密密钥（{file}）',
        'setup.importKeys': '导入密钥文件',
        'setup.importing': '正在导入...',
        'setup.selectKeysTitle': '选择加密密钥文件',
        'setup.selectKeysFilter': '密钥文件',
        'setup.selectAll': '所有文件',
        'setup.selectBackendTitle': '选择 nscb_rust 后端二进制文件',
        'setup.failedCopyKeys': '复制密钥失败：{error}',
        'setup.failedImportBackend': '导入后端失败：{error}',
        'setup.switchFiles': 'Switch 文件',

        // ---- 缺失后端提示条 ----
        'banner.missing': '缺少 {backend}。请前往“设置 > 工具”下载或导入。',
        'banner.openSettings': '打开设置',
    },
};

// ----------------------------------------------------------------
// 纯函数部分（便于单元测试，不依赖 Tauri）
// ----------------------------------------------------------------

/** 将 "zh-cn" / "zh_CN" 之类的写法归一化为受支持的 Locale；不支持时返回 null */
export function normalizeLocale(raw: string): Locale | null {
    const lower = raw.trim().toLowerCase();
    if (!lower) return null;
    if (lower === 'en' || lower.startsWith('en-')) return 'en';
    if (lower === 'zh-cn' || lower === 'zh-hans' || lower === 'zh-hans-cn' || lower === 'zh-sg') return 'zh-CN';
    if (lower === 'zh' || lower.startsWith('zh-')) return 'zh-CN'; // 其余中文变体回退到简体中文
    return null;
}

/** 取出当前 Locale 的译文表；不存在时回退到英文表 */
function tableFor(locale: Locale): Dict {
    return dictionaries[locale] ?? dictionaries[DEFAULT_LOCALE];
}

/**
 * 翻译单个键。
 * - 找不到键时回退英文；英文也没有则原样返回键名，避免界面上出现空白。
 * - params 用于替换 {name} 形式的占位符。
 */
export function translate(locale: Locale, key: string, params?: Record<string, string | number>): string {
    const table = tableFor(locale);
    let text = table[key];
    if (text === undefined) {
        text = dictionaries[DEFAULT_LOCALE][key] ?? key;
    }
    if (params) {
        for (const [name, value] of Object.entries(params)) {
            text = text.split(`{${name}}`).join(String(value));
        }
    }
    return text;
}

/** 复数后缀辅助：英文按数量决定 s，中文不使用复数变化 */
export function pluralSuffix(locale: Locale, count: number): string {
    if (locale === 'zh-CN') return '';
    return count === 1 ? '' : 's';
}

// ----------------------------------------------------------------
// 运行时状态（依赖 Tauri 设置读写）
// ----------------------------------------------------------------

let currentLocale: Locale = DEFAULT_LOCALE;
const listeners = new Set<(locale: Locale) => void>();

function emitChange() {
    for (const fn of listeners) fn(currentLocale);
}

/** 读取已保存的语言；未保存过时返回 null（用于触发首启语言选择） */
export async function loadSavedLocale(): Promise<Locale | null> {
    try {
        const raw = await getSetting(STORAGE_KEY);
        if (!raw) return null;
        return normalizeLocale(raw);
    } catch {
        return null;
    }
}

/** 把语言偏好写入 settings.json */
export async function persistLocale(locale: Locale): Promise<void> {
    try {
        await saveSetting(STORAGE_KEY, locale);
    } catch {
        // 写入失败不应阻断界面使用；保留内存中的当前语言即可
    }
}

/** 初始化：读取已保存语言并应用；无保存值时保持默认英文 */
export async function initI18n(): Promise<Locale> {
    const saved = await loadSavedLocale();
    currentLocale = saved ?? DEFAULT_LOCALE;
    emitChange();
    return currentLocale;
}

/** 切换语言并立即生效（同时持久化） */
export async function setLocale(locale: Locale): Promise<void> {
    currentLocale = locale;
    emitChange();
    await persistLocale(locale);
}

/**
 * 仅切换内存中的语言并刷新界面，不落盘。
 * 供语言选择页做即时预览；用户点“确定”时才调用 setLocale 持久化。
 */
export function previewLocale(locale: Locale): void {
    currentLocale = locale;
    emitChange();
}

export function getLocale(): Locale {
    return currentLocale;
}

/** 订阅语言变化，返回取消订阅函数 */
export function subscribeLocale(fn: (locale: Locale) => void): () => void {
    listeners.add(fn);
    return () => listeners.delete(fn);
}

/**
 * React Hook：在组件中获取当前 t() 函数。
 * 语言切换时组件会自动重新渲染。
 */
export function useT(): (key: string, params?: Record<string, string | number>) => string {
    const [, force] = useState(0);
    useEffect(() => subscribeLocale(() => force(n => n + 1)), []);
    return useCallback(
        (key: string, params?: Record<string, string | number>) => translate(getLocale(), key, params),
        [],
    );
}

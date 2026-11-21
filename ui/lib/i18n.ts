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

export type Locale = 'en';

export const LOCALES: Locale[] = ['en'];

// 语言元信息：nativeName 用于语言选择页展示，label 用于下拉/按钮
export const LOCALE_META: Record<Locale, { nativeName: string; label: string }> = {
    en: { nativeName: 'English', label: 'English' },
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
};

// ----------------------------------------------------------------
// 纯函数部分（便于单元测试，不依赖 Tauri）
// ----------------------------------------------------------------

/** 将 "zh-cn" / "zh_CN" 之类的写法归一化为受支持的 Locale；不支持时返回 null */
export function normalizeLocale(raw: string): Locale | null {
    const lower = raw.trim().toLowerCase();
    if (!lower) return null;
    if (lower === 'en' || lower.startsWith('en-')) return 'en';
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

import { open } from '@tauri-apps/plugin-dialog';
import { readDir, rename as fsRename } from '@tauri-apps/plugin-fs';
import { invoke } from '@tauri-apps/api/core';
import { openUrl } from '@tauri-apps/plugin-opener';
import { getLocale, translate } from './i18n';

let cachedToolsDir: string | null = null;

export async function getToolsDir(): Promise<string> {
    if (!cachedToolsDir) {
        try {
            cachedToolsDir = await invoke<string>('get_tools_dir');
        } catch {
            cachedToolsDir = 'tools';
        }
    }
    return cachedToolsDir;
}

export async function getToolsDirOrNull(): Promise<string | null> {
    try {
        return await getToolsDir();
    } catch {
        return null;
    }
}

export async function hasKeys(): Promise<boolean> {
    try {
        return await invoke<boolean>('has_keys');
    } catch {
        return false;
    }
}

export async function hasBackend(): Promise<boolean> {
    try {
        return await invoke<boolean>('has_backend');
    } catch {
        return false;
    }
}

export async function importKeys(): Promise<{ ok: boolean; error?: string }> {
    // 对话框标题/过滤器跟随界面语言
    const locale = getLocale();
    const selected = await open({
        title: translate(locale, 'setup.selectKeysTitle'),
        multiple: false,
        filters: [
            { name: translate(locale, 'setup.selectKeysFilter'), extensions: ['keys', 'txt'] },
            { name: translate(locale, 'setup.selectAll'), extensions: ['*'] },
        ],
    });
    if (!selected) return { ok: false };

    const srcFile = selected as string;
    try {
        await invoke('import_keys', { srcPath: srcFile });
        return { ok: true };
    } catch (e: any) {
        return { ok: false, error: translate(getLocale(), 'setup.failedCopyKeys', { error: e.message || e }) };
    }
}

export async function importBackend(): Promise<{ ok: boolean; error?: string }> {
    // 对话框标题跟随界面语言
    const selected = await open({
        title: translate(getLocale(), 'setup.selectBackendTitle'),
        multiple: false,
    });
    if (!selected) return { ok: false };

    const srcFile = selected as string;
    try {
        await invoke('import_nscb_binary', { srcPath: srcFile });
        return { ok: true };
    } catch (e: any) {
        return { ok: false, error: translate(getLocale(), 'setup.failedImportBackend', { error: e.message || e }) };
    }
}

export interface FileFilter {
    name: string;
    extensions: string[];
}

export async function selectFiles(filters?: FileFilter[]): Promise<string[]> {
    // 未提供过滤器时使用界面语言对应的默认过滤器
    const locale = getLocale();
    const result = await open({
        multiple: true,
        filters: filters || [
            { name: translate(locale, 'setup.switchFiles'), extensions: ['nsp', 'xci', 'nsz', 'xcz', 'ncz'] },
            { name: translate(locale, 'setup.selectAll'), extensions: ['*'] },
        ],
    });
    if (!result) return [];
    return result as string[];
}

export async function selectOutputDir(): Promise<string | null> {
    const result = await open({
        directory: true,
        multiple: false,
    });
    return result as string | null;
}

export async function openExternal(url: string): Promise<void> {
    await openUrl(url);
}

// GitHub release helpers

export interface ReleaseInfo {
    tag: string;
    downloadUrl: string;
}

export async function getPlatform(): Promise<string> {
    try {
        return await invoke<string>('get_platform');
    } catch {
        return 'windows';
    }
}

export async function fetchLatestRelease(): Promise<ReleaseInfo | null> {
    try {
        const platform = await getPlatform();
        const res = await fetch('https://api.github.com/repos/cxfcxf/nscb_rust/releases/latest');
        if (!res.ok) return null;
        const data = await res.json();
        const tag: string = data.tag_name ?? '';
        const assets = data.assets as any[];
        let asset: any;
        if (platform === 'macos') {
            asset = assets?.find((a: any) => typeof a.name === 'string' && a.name.includes('macos'));
        } else if (platform === 'linux') {
            asset = assets?.find((a: any) => typeof a.name === 'string' && a.name.includes('linux'));
        } else {
            asset = assets?.find((a: any) => typeof a.name === 'string' && a.name.endsWith('.exe'));
        }
        if (!asset?.browser_download_url) return null;
        return { tag, downloadUrl: asset.browser_download_url };
    } catch {
        return null;
    }
}

export async function downloadBackend(url: string): Promise<void> {
    await invoke('download_backend', { url });
}

export async function getInstalledVersion(): Promise<string | null> {
    try {
        const v = await invoke<string>('get_backend_version');
        return v || null;
    } catch {
        return null;
    }
}

export async function saveInstalledVersion(tag: string): Promise<void> {
    await invoke('save_backend_version', { version: tag });
}

export interface AppReleaseInfo {
    tag: string;
    url: string;
}

export async function fetchLatestAppRelease(): Promise<AppReleaseInfo | null> {
    try {
        const res = await fetch('https://api.github.com/repos/cxfcxf/nscb-desktop/releases/latest');
        if (!res.ok) return null;
        const data = await res.json();
        const tag: string = data.tag_name ?? '';
        const url: string = data.html_url ?? '';
        if (!tag) return null;
        return { tag, url };
    } catch {
        return null;
    }
}

export async function getSetting(key: string): Promise<string> {
    try {
        return await invoke<string>('get_setting', { key });
    } catch {
        return '';
    }
}

export async function saveSetting(key: string, value: string): Promise<void> {
    await invoke('save_setting', { key, value });
}

// ---- Filesystem helpers ----

export interface DirEntryInfo {
    name: string;
    isDirectory: boolean;
    path: string;
}

function joinPath(base: string, name: string): string {
    const sep = base.includes('\\') ? '\\' : '/';
    return base.replace(/[/\\]+$/, '') + sep + name;
}

export async function listDir(dirPath: string): Promise<DirEntryInfo[]> {
    const entries = await readDir(dirPath);
    return entries.map(e => ({
        name: e.name,
        isDirectory: e.isDirectory,
        path: joinPath(dirPath, e.name),
    }));
}

export async function renameFile(oldPath: string, newPath: string): Promise<void> {
    await fsRename(oldPath, newPath);
}

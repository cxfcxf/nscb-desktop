import { useState, useCallback, useEffect, useRef } from 'react';
import { getCurrentWebviewWindow } from '@tauri-apps/api/webviewWindow';
import type { UnlistenFn } from '@tauri-apps/api/event';
import { getVersion } from '@tauri-apps/api/app';
import * as api from './lib/api';
import { getRunner } from './lib/nscb-runner';
import {
    useT,
    initI18n,
    setLocale,
    previewLocale,
    getLocale,
    subscribeLocale,
    loadSavedLocale,
    pluralSuffix,
    LOCALES,
    LOCALE_META,
    type Locale,
} from './lib/i18n';

// ============================================================
// SVG Icons
// ============================================================

function icon(size: number, children: React.ReactNode, strokeWidth = 2): React.JSX.Element {
    return (
        <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round">
            {children}
        </svg>
    );
}

const Icons = {
    compress: icon(20, <><path d="M12 3v18" /><path d="m8 7 4 4 4-4" /><path d="m8 17 4-4 4 4" /><path d="M4 12h16" /></>),
    decompress: icon(20, <><path d="M12 3v18" /><path d="m8 8 4-4 4 4" /><path d="m8 16 4 4 4-4" /><path d="M4 12h16" /></>),
    merge: icon(20, <><circle cx="18" cy="18" r="3" /><circle cx="6" cy="6" r="3" /><path d="M6 21V9a9 9 0 0 0 9 9" /><path d="M6 9a9 9 0 0 1 9-9" /></>),
    convert: icon(20, <><path d="M21 12a9 9 0 1 1-9-9c2.52 0 4.93 1 6.74 2.74L21 8" /><path d="M21 3v5h-5" /></>),
    split: icon(20, <><path d="M16 3h5v5" /><path d="M8 3H3v5" /><path d="M12 22v-8.3a4 4 0 0 0-1.172-2.872L3 3" /><path d="m15 9 6-6" /></>),
    dspl: icon(20, <><path d="M16 3h5v5" /><path d="M8 3H3v5" /><path d="M12 22v-8.3a4 4 0 0 0-1.172-2.872L3 3" /><path d="m15 9 6-6" /><circle cx="18" cy="18" r="3" /></>),
    create: icon(20, <><path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z" /><polyline points="3.27 6.96 12 12.01 20.73 6.96" /><line x1="12" y1="22.08" x2="12" y2="12" /></>),
    rename: icon(20, <><path d="M17 3a2.85 2.85 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5Z" /><path d="m15 5 4 4" /></>),
    settings: icon(20, <><path d="M12.22 2h-.44a2 2 0 0 0-2 2v.18a2 2 0 0 1-1 1.73l-.43.25a2 2 0 0 1-2 0l-.15-.08a2 2 0 0 0-2.73.73l-.22.38a2 2 0 0 0 .73 2.73l.15.1a2 2 0 0 1 1 1.72v.51a2 2 0 0 1-1 1.74l-.15.09a2 2 0 0 0-.73 2.73l.22.38a2 2 0 0 0 2.73.73l.15-.08a2 2 0 0 1 2 0l.43.25a2 2 0 0 1 1 1.73V20a2 2 0 0 0 2 2h.44a2 2 0 0 0 2-2v-.18a2 2 0 0 1 1-1.73l.43-.25a2 2 0 0 1 2 0l.15.08a2 2 0 0 0 2.73-.73l.22-.39a2 2 0 0 0-.73-2.73l-.15-.08a2 2 0 0 1-1-1.74v-.5a2 2 0 0 1 1-1.74l.15-.09a2 2 0 0 0 .73-2.73l-.22-.38a2 2 0 0 0-2.73-.73l-.15.08a2 2 0 0 1-2 0l-.43-.25a2 2 0 0 1-1-1.73V4a2 2 0 0 0-2-2z" /><circle cx="12" cy="12" r="3" /></>),
    upload: icon(40, <><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" /><polyline points="17 8 12 3 7 8" /><line x1="12" y1="3" x2="12" y2="15" /></>, 1.5),
    file: icon(16, <><path d="M14.5 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7.5L14.5 2z" /><polyline points="14 2 14 8 20 8" /></>),
    folder: icon(16, <path d="M4 20h16a2 2 0 0 0 2-2V8a2 2 0 0 0-2-2h-7.93a2 2 0 0 1-1.66-.9l-.82-1.2A2 2 0 0 0 7.93 3H4a2 2 0 0 0-2 2v13c0 1.1.9 2 2 2Z" />),
    x: icon(14, <><line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" /></>),
    check: icon(16, <polyline points="20 6 9 17 4 12" />),
    alertCircle: icon(16, <><circle cx="12" cy="12" r="10" /><line x1="12" y1="8" x2="12" y2="12" /><line x1="12" y1="16" x2="12.01" y2="16" /></>),
    play: icon(18, <polygon points="5 3 19 12 5 21 5 3" />),
    save: icon(16, <><path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z" /><polyline points="17 21 17 13 7 13 7 21" /><polyline points="7 3 7 8 15 8" /></>),
    key: icon(20, <path d="m21 2-2 2m-7.61 7.61a5.5 5.5 0 1 1-7.778 7.778 5.5 5.5 0 0 1 7.777-7.777zm0 0L15.5 7.5m0 0 3 3L22 7l-3-3m-3.5 3.5L19 4" />),
    download: icon(20, <><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" /><polyline points="7 10 12 15 17 10" /><line x1="12" y1="15" x2="12" y2="3" /></>),
    trash: icon(14, <><polyline points="3 6 5 6 21 6" /><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" /></>),
    stop: icon(16, <rect x="3" y="3" width="18" height="18" rx="2" ry="2" />),
    switchLogo: icon(28, <><rect x="2" y="3" width="20" height="18" rx="3" ry="3" /><line x1="12" y1="3" x2="12" y2="21" /><circle cx="7.5" cy="9" r="2" /><circle cx="16.5" cy="15" r="1.5" /></>, 1.5),
    info: icon(16, <><circle cx="12" cy="12" r="10" /><path d="M12 16v-4" /><path d="M12 8h.01" /></>),
    batchMerge: icon(20, <><polygon points="12 2 2 7 12 12 22 7 12 2" /><polyline points="2 17 12 22 22 17" /><polyline points="2 12 12 17 22 12" /></>),
    verify: icon(20, <><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" /><polyline points="9 12 11 14 15 10" /></>),
};

// ============================================================
// Helpers
// ============================================================

// 返回压缩等级的 i18n 键，实际显示文本由调用方翻译
function levelLabelKey(level: number): string {
    if (level <= 8) return 'level.fast';
    if (level <= 14) return 'level.normal';
    if (level <= 18) return 'level.great';
    return 'level.ultra';
}

function getFileExt(path: string): string {
    const name = path.replace(/\\/g, '/').split('/').pop() || '';
    const dot = name.lastIndexOf('.');
    return dot >= 0 ? name.substring(dot + 1).toUpperCase() : '';
}

function getFileName(path: string): string {
    return path.replace(/\\/g, '/').split('/').pop() || '';
}

function getDirectory(path: string): string {
    const normalized = path.replace(/\\/g, '/');
    const lastSlash = normalized.lastIndexOf('/');
    return lastSlash >= 0 ? normalized.substring(0, lastSlash) : '';
}

function pathJoin(base: string, name: string): string {
    const sep = base.includes('\\') ? '\\' : '/';
    return base.replace(/[/\\]+$/, '') + sep + name;
}

const SWITCH_EXTS = new Set(['nsp', 'xci', 'nsz', 'xcz', 'ncz']);

interface BatchGame {
    name: string;
    path: string;
    files: string[];
    status: 'pending' | 'skipped' | 'running' | 'done' | 'error';
    message?: string;
    outputFile?: string;
}

const EXT_COLORS: Record<string, string> = {
    NSP: '#3fb950',
    XCI: '#58a6ff',
    NSZ: '#d2a8ff',
    XCZ: '#f0883e',
    NCZ: '#f778ba',
    NCA: '#8b949e',
    FOLDER: '#e3b341',
};

const EMPTY_PROGRESS = { percent: 0, message: '' };

const runner = getRunner();

// ============================================================
// Hooks
// ============================================================

function useRunnerEvents(operationNames: string | string[]) {
    const ops = Array.isArray(operationNames) ? operationNames : [operationNames];
    const opsKey = ops.join(',');
    // 传入 t 以便在完成/出错时输出当前语言的提示
    const t = useT();

    const [running, setRunning] = useState(false);
    const [progress, setProgress] = useState(EMPTY_PROGRESS);
    const [outputLines, setOutputLines] = useState<string[]>([]);

    useEffect(() => {
        function matchesOp(data: { op: string }) {
            return ops.includes(data.op);
        }

        const unsubs = [
            runner.on('progress', (data) => {
                if (matchesOp(data)) {
                    setProgress({ percent: data.percent, message: data.message });
                }
            }),
            runner.on('output', (data) => {
                if (matchesOp(data)) {
                    setOutputLines(prev => [...prev.slice(-200), data.line]);
                }
            }),
            runner.on('done', (data) => {
                if (matchesOp(data)) {
                    setRunning(false);
                    setProgress({
                        percent: 100,
                        message: data.code === 0
                            ? t('common.completedOk')
                            : t('common.exitCode', { code: data.code }),
                    });
                }
            }),
            runner.on('nscb-error', (data) => {
                if (matchesOp(data)) {
                    // ERROR 前缀保持原样（便于用户识别错误行），消息本身来自后端不翻译
                    setOutputLines(prev => [...prev, `ERROR: ${data.message}`]);
                }
            }),
        ];
        return () => unsubs.forEach(fn => fn());
    }, [opsKey, t]);

    return { running, progress, outputLines, setRunning, setProgress, setOutputLines };
}

function useFileList() {
    const [files, setFiles] = useState<string[]>([]);

    const addFiles = useCallback((newFiles: string[]) => {
        setFiles(prev => [...prev, ...newFiles.filter(f => !prev.includes(f))]);
    }, []);

    const removeFile = useCallback((index: number) => {
        setFiles(prev => prev.filter((_, i) => i !== index));
    }, []);

    const clearFiles = useCallback(() => setFiles([]), []);

    return { files, addFiles, removeFile, clearFiles };
}

function useOutputDir() {
    const [outputDir, setOutputDir] = useState('');

    const selectOutputDirFn = useCallback(async () => {
        const dir = await api.selectOutputDir();
        if (dir) setOutputDir(dir);
    }, []);

    return { outputDir, setOutputDir, selectOutputDir: selectOutputDirFn };
}

// ============================================================
// Shared Components
// ============================================================

const NAV_PAGES = [
    // label 存放 i18n 键而非直接文本
    { id: 'compress', icon: Icons.compress, labelKey: 'nav.compress' },
    { id: 'decompress', icon: Icons.decompress, labelKey: 'nav.decompress' },
    { id: 'merge', icon: Icons.merge, labelKey: 'nav.merge' },
    { id: 'convert', icon: Icons.convert, labelKey: 'nav.convert' },
    { id: 'split', icon: Icons.split, labelKey: 'nav.split' },
    { id: 'dspl', icon: Icons.dspl, labelKey: 'nav.dspl' },
    { id: 'create', icon: Icons.create, labelKey: 'nav.create' },
    { id: 'info', icon: Icons.info, labelKey: 'nav.info' },
    { id: 'rename', icon: Icons.rename, labelKey: 'nav.rename' },
    { id: 'batchmerge', icon: Icons.batchMerge, labelKey: 'nav.batchmerge' },
    { id: 'verify', icon: Icons.verify, labelKey: 'nav.verify' },
    { id: 'settings', icon: Icons.settings, labelKey: 'nav.settings' },
];

function Sidebar({ activePage, onNavigate, appVersion, appUpdate }: { activePage: string; onNavigate: (id: string) => void; appVersion: string; appUpdate?: { tag: string; url: string } | null }) {
    const t = useT();
    return (
        <div className="sidebar">
            <div className="sidebar-brand">
                <div className="brand-logo">{Icons.switchLogo}</div>
                <div className="brand-text">
                    <h1>{t('common.appName')}</h1>
                    <span>v{appVersion}{appUpdate && <>{' | '}<button className="update-link" onClick={() => api.openExternal(appUpdate.url)}>{t('common.available', { tag: appUpdate.tag })}</button></>}</span>
                </div>
            </div>
            <nav className="sidebar-nav">
                {NAV_PAGES.map(p => (
                    <div
                        key={p.id}
                        className={`nav-item ${activePage === p.id ? 'active' : ''}`}
                        onClick={() => onNavigate(p.id)}
                    >
                        <span className="nav-icon">{p.icon}</span>
                        <span className="nav-label">{t(p.labelKey)}</span>
                    </div>
                ))}
            </nav>
            <div className="sidebar-footer">
                <span className="footer-dot" />
                {t('common.backendLabel')}
            </div>
        </div>
    );
}

function ExtBadge({ ext }: { ext: string }) {
    const color = EXT_COLORS[ext] || 'var(--text-muted)';
    return (
        <span className="ext-badge" style={{ '--badge-color': color } as React.CSSProperties}>
            {ext}
        </span>
    );
}

function DropZone({ onFiles, accept, hint, allowFolders }: { onFiles: (files: string[]) => void; accept?: string[]; hint?: string; allowFolders?: boolean }) {
    const [dragOver, setDragOver] = useState(false);
    const ref = useRef<HTMLDivElement>(null);
    const t = useT();

    useEffect(() => {
        // 非 Tauri 环境（纯 Web 预览）下 getCurrentWebviewWindow() 缺少 internals，
        // 这里连同取窗口对象一起捕获，避免整个页面崩溃。
        let unlisten: Promise<UnlistenFn> | null = null;
        try {
            const appWindow = getCurrentWebviewWindow();
            unlisten = appWindow.onDragDropEvent((event) => {
            // Only handle drop events when this DropZone is visible
            if (!ref.current || ref.current.offsetParent === null) return;
            if (event.payload.type === 'over') {
                setDragOver(true);
            } else if (event.payload.type === 'leave') {
                setDragOver(false);
            } else if (event.payload.type === 'drop') {
                setDragOver(false);
                let paths = event.payload.paths;
                if (!allowFolders && accept) {
                    const extSet = new Set(accept.map(e => e.toLowerCase()));
                    paths = paths.filter(p => {
                        const name = p.replace(/\\/g, '/').split('/').pop() || '';
                        const dot = name.lastIndexOf('.');
                        return dot >= 0 && extSet.has(name.substring(dot + 1).toLowerCase());
                    });
                }
                if (paths && paths.length > 0) {
                    onFiles(paths);
                }
            }
            });
        } catch {
            return;
        }
        return () => { if (unlisten) void unlisten.then(fn => fn()); };
    }, [onFiles]);

    const handleClick = useCallback(async () => {
        // 过滤器名称跟随界面语言
        const filters = accept ? [{ name: t('setup.switchFiles'), extensions: accept }] : undefined;
        const files = await api.selectFiles(filters);
        if (files.length > 0) onFiles(files);
    }, [onFiles, accept, t]);

    const handleBrowseFolder = useCallback(async (e: React.MouseEvent) => {
        e.stopPropagation();
        const folder = await api.selectOutputDir();
        if (folder) onFiles([folder]);
    }, [onFiles]);

    return (
        <div
            ref={ref}
            className={`drop-zone ${dragOver ? 'drag-over' : ''}`}
            onClick={handleClick}
        >
            <div className="drop-zone-icon">{Icons.upload}</div>
            <div className="drop-zone-text">
                {t(allowFolders ? 'drop.foldersHere' : 'drop.filesHere')}{' '}
                <span className="drop-zone-link">{t('common.browse')}</span>
                {allowFolders && <>{' '}<span className="drop-zone-link" onClick={handleBrowseFolder}>{t('drop.browseFolder')}</span></>}
            </div>
            <div className="drop-zone-hint">
                {hint || t('drop.defaultHint')}
            </div>
            {accept && (
                <div className="drop-zone-badges">
                    {accept.map(ext => (
                        <ExtBadge key={ext} ext={ext.toUpperCase()} />
                    ))}
                </div>
            )}
        </div>
    );
}

function FileList({ files, onRemove }: { files: string[]; onRemove: (index: number) => void }) {
    if (files.length === 0) return null;
    const t = useT();

    return (
        <div className="file-list">
            <div className="file-list-header">
                <span className="file-list-count">
                    {t('common.filesSelected', { count: files.length, s: pluralSuffix(getLocale(), files.length) })}
                </span>
            </div>
            {files.map((file, i) => {
                const ext = getFileExt(file);
                return (
                <div key={i} className="file-item">
                    <span className="file-icon">{ext ? Icons.file : Icons.folder}</span>
                    <ExtBadge ext={ext || 'FOLDER'} />
                    <div className="file-info">
                        <div className="file-name">{getFileName(file)}</div>
                        <div className="file-path">{getDirectory(file)}</div>
                    </div>
                    <button
                        className="file-remove"
                        onClick={() => onRemove(i)}
                        title={t('common.removeFile')}
                    >
                        {Icons.x}
                    </button>
                </div>
                );
            })}
        </div>
    );
}

function Toggle({ checked, onChange, label }: { checked: boolean; onChange: (val: boolean) => void; label?: string }) {
    return (
        <div className="toggle" onClick={() => onChange(!checked)}>
            <div className={`toggle-track ${checked ? 'active' : ''}`}>
                <div className="toggle-thumb" />
            </div>
            {label && <span className="toggle-label">{label}</span>}
        </div>
    );
}

function getOutputLineClass(line: string): string {
    if (line.toLowerCase().includes('error')) return 'error';
    if (line.includes('Done!')) return 'success';
    if (line.startsWith('[') || line.startsWith('>')) return 'info';
    return '';
}

function ProgressDisplay({ progress, outputLines }: { progress: { percent: number; message: string }; outputLines: string[] }) {
    const consoleRef = useRef<HTMLDivElement>(null);
    const t = useT();

    useEffect(() => {
        if (consoleRef.current) {
            consoleRef.current.scrollTop = consoleRef.current.scrollHeight;
        }
    }, [outputLines]);

    const isComplete = progress.percent >= 100;

    return (
        <div className="progress-container">
            <div className="progress-bar-wrapper">
                <div
                    className={`progress-bar-fill ${isComplete ? 'complete' : ''}`}
                    style={{ width: `${progress.percent || 0}%` }}
                />
            </div>
            <div className="progress-info">
                <span className="progress-message">{progress.message || t('common.waiting')}</span>
                <span className={`progress-percent ${isComplete ? 'complete' : ''}`}>
                    {(progress.percent || 0).toFixed(1)}%
                </span>
            </div>
            {outputLines.length > 0 && (
                <div className="output-console" ref={consoleRef}>
                    {outputLines.map((line, i) => (
                        <div key={i} className={`output-line ${getOutputLineClass(line)}`}>
                            {/* 后端原始输出保持原样，不翻译 */}
                            {line}
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
}

function ToastContainer({ toasts }: { toasts: { id: number; message: string; type: string }[] }) {
    if (toasts.length === 0) return null;
    return (
        <div className="toast-container">
            {toasts.map(t => (
                <div key={t.id} className={`toast ${t.type}`}>
                    <span className="toast-icon">
                        {t.type === 'success' ? Icons.check : t.type === 'error' ? Icons.alertCircle : Icons.info}
                    </span>
                    <span>{t.message}</span>
                </div>
            ))}
        </div>
    );
}

function OutputDirPicker({ outputDir, setOutputDir, selectOutputDir }: { outputDir: string; setOutputDir: (dir: string) => void; selectOutputDir: () => void }) {
    const t = useT();
    return (
        <div className="dir-picker">
            <label className="dir-picker-label">{Icons.folder} {t('common.outputDir')}</label>
            <div className="dir-picker-row">
                <input
                    type="text"
                    value={outputDir}
                    onChange={(e) => setOutputDir(e.target.value)}
                    placeholder={t('common.outputDirPlaceholder')}
                />
                <button className="btn btn-secondary btn-sm" onClick={selectOutputDir}>{t('common.browse')}</button>
            </div>
        </div>
    );
}

function ActionBar({ running, onCancel, onClear, onStart, startLabelKey, startLabelParams, startDisabled }: {
    running: boolean;
    onCancel: () => void;
    onClear: () => void;
    onStart: () => void;
    startLabelKey: string;
    startLabelParams?: Record<string, string | number>;
    startDisabled?: boolean;
}) {
    const t = useT();
    return (
        <div className="actions-bar">
            <span className="spacer" />
            {running ? (
                <button className="btn btn-danger" onClick={onCancel}>
                    {Icons.stop} {t('common.cancel')}
                </button>
            ) : (
                <>
                    <button className="btn btn-ghost" onClick={onClear}>
                        {Icons.trash} {t('common.clearAll')}
                    </button>
                    <button
                        className="btn btn-primary btn-lg"
                        onClick={onStart}
                        disabled={startDisabled}
                    >
                        {Icons.play} {t(startLabelKey, startLabelParams)}
                    </button>
                </>
            )}
        </div>
    );
}

// ============================================================
// Pages
// ============================================================

interface OperationPageConfig {
    op: string;
    icon: React.JSX.Element;
    accent: string;
    // 标题/副标题等改为 i18n 键，便于按当前语言渲染
    titleKey: string;
    subtitleKey: string;
    accept: string[];
    hintKey: string;
    startLabelKey: string;
    startMessageKey: string;
    minFiles?: number;
    renderOptions?: (state: OperationPageState) => React.ReactNode;
    buildRunnerOpts?: (state: OperationPageState) => Record<string, unknown>;
}

interface OperationPageState {
    outputDir: string;
    options: Record<string, any>;
    setOption: (key: string, value: any) => void;
}

function OperationPage({ config }: { config: OperationPageConfig }) {
    const { files, addFiles, removeFile, clearFiles } = useFileList();
    const { running, progress, outputLines, setRunning, setProgress, setOutputLines } = useRunnerEvents(config.op);
    const { outputDir, setOutputDir, selectOutputDir } = useOutputDir();
    const [options, setOptions] = useState<Record<string, any>>({});
    const t = useT();

    // Always set output dir to first file's directory
    useEffect(() => {
        setOutputDir(files.length > 0 ? getDirectory(files[0]) : '');
    }, [files]);

    const setOption = useCallback((key: string, value: any) => {
        setOptions(prev => ({ ...prev, [key]: value }));
    }, []);

    const minFiles = config.minFiles ?? 1;
    const state: OperationPageState = { outputDir, options, setOption };

    const handleStart = async () => {
        if (files.length < minFiles) return;
        setRunning(true);
        setProgress({ ...EMPTY_PROGRESS, message: t(config.startMessageKey) });
        setOutputLines([]);
        const extraOpts = config.buildRunnerOpts ? config.buildRunnerOpts(state) : {};
        await runner.run(config.op, files, {
            output: outputDir || undefined,
            ...extraOpts,
        });
    };

    const handleCancel = async () => {
        await runner.cancel();
        setRunning(false);
        setProgress({ ...EMPTY_PROGRESS, message: t('common.cancelled') });
    };

    const handleClear = () => {
        clearFiles();
        setOutputLines([]);
        setProgress(EMPTY_PROGRESS);
    };

    return (
        <div className="page">
            <div className="page-header">
                <div className={`page-icon accent-${config.accent}`}>{config.icon}</div>
                <div>
                    <h2>{t(config.titleKey)}</h2>
                    <p>{t(config.subtitleKey)}</p>
                </div>
            </div>

            <DropZone onFiles={addFiles} accept={config.accept} hint={t(config.hintKey)} />
            <FileList files={files} onRemove={removeFile} />

            {files.length > 0 && (
                <>
                    {config.renderOptions && config.renderOptions(state)}

                    <OutputDirPicker outputDir={outputDir} setOutputDir={setOutputDir} selectOutputDir={selectOutputDir} />

                    {(running || outputLines.length > 0) && (
                        <ProgressDisplay progress={progress} outputLines={outputLines} />
                    )}

                    <ActionBar
                        running={running}
                        onCancel={handleCancel}
                        onClear={handleClear}
                        onStart={handleStart}
                        startLabelKey={config.startLabelKey}
                        startDisabled={files.length < minFiles}
                    />
                </>
            )}
        </div>
    );
}

function CompressOptions({ options, setOption }: { options: Record<string, any>; setOption: (k: string, v: any) => void }) {
    const level = options.level ?? 18;
    const t = useT();
    return (
        <div className="card">
            <div className="card-header">
                <span className="card-title">{t('compress.optionsTitle')}</span>
            </div>
            <div className="options-panel">
                <div className="option-group">
                    <label className="option-label">{t('compress.levelLabel')}</label>
                    <div className="slider-control">
                        <input
                            type="range"
                            min="1"
                            max="22"
                            value={level}
                            onChange={(e) => setOption('level', Number(e.target.value))}
                        />
                        <span className="slider-value">{level}</span>
                    </div>
                    <span className={`level-badge level-${levelLabelKey(level).replace('level.', '')}`}>
                        {t(levelLabelKey(level))}
                    </span>
                </div>
            </div>
        </div>
    );
}

function FormatOptions({ options, setOption, titleKey, descriptions }: {
    options: Record<string, any>;
    setOption: (k: string, v: any) => void;
    titleKey: string;
    descriptions: { xciKey: string; nspKey: string };
}) {
    const format = options.format ?? 'xci';
    const t = useT();
    return (
        <div className="card">
            <div className="card-header">
                <span className="card-title">{t(titleKey)}</span>
            </div>
            <div className="options-panel">
                <div className="option-group">
                    <label className="option-label">{t('format.outputFormat')}</label>
                    <select value={format} onChange={(e) => setOption('format', e.target.value)}>
                        <option value="xci">{t('merge.xciDesc')}</option>
                        <option value="nsp">{t('merge.nspDesc')}</option>
                    </select>
                    <span className="option-description">
                        {format === 'xci' ? t(descriptions.xciKey) : t(descriptions.nspKey)}
                    </span>
                </div>
            </div>
        </div>
    );
}

const COMPRESS_CONFIG: OperationPageConfig = {
    op: 'compress',
    icon: Icons.compress,
    accent: 'compress',
    titleKey: 'compress.title',
    subtitleKey: 'compress.subtitle',
    accept: ['nsp', 'xci'],
    hintKey: 'compress.hint',
    startLabelKey: 'compress.startLabel',
    startMessageKey: 'compress.startMessage',
    renderOptions: (state) => (
        <CompressOptions options={state.options} setOption={state.setOption} />
    ),
    buildRunnerOpts: (state) => ({
        level: state.options.level ?? 18,
    }),
};

const DECOMPRESS_CONFIG: OperationPageConfig = {
    op: 'decompress',
    icon: Icons.decompress,
    accent: 'decompress',
    titleKey: 'decompress.title',
    subtitleKey: 'decompress.subtitle',
    accept: ['nsz', 'xcz', 'ncz'],
    hintKey: 'decompress.hint',
    startLabelKey: 'decompress.startLabel',
    startMessageKey: 'decompress.startMessage',
};

// Merge page is a custom component (not config-driven) — see MergePage below.

const CONVERT_CONFIG: OperationPageConfig = {
    op: 'convert',
    icon: Icons.convert,
    accent: 'convert',
    titleKey: 'convert.title',
    subtitleKey: 'convert.subtitle',
    accept: ['nsp', 'xci'],
    hintKey: 'convert.hint',
    startLabelKey: 'convert.startLabel',
    startMessageKey: 'convert.startMessage',
    renderOptions: (state) => (
        <FormatOptions
            options={state.options}
            setOption={state.setOption}
            titleKey="convert.optionsTitle"
            descriptions={{ xciKey: 'convert.toXci', nspKey: 'convert.toNsp' }}
        />
    ),
    buildRunnerOpts: (state) => ({
        format: state.options.format ?? 'xci',
    }),
};

const SPLIT_CONFIG: OperationPageConfig = {
    op: 'split',
    icon: Icons.split,
    accent: 'split',
    titleKey: 'split.title',
    subtitleKey: 'split.subtitle',
    accept: ['nsp', 'xci'],
    hintKey: 'split.hint',
    startLabelKey: 'split.startLabel',
    startMessageKey: 'split.startMessage',
};

const DSPL_CONFIG: OperationPageConfig = {
    op: 'dspl',
    icon: Icons.dspl,
    accent: 'dspl',
    titleKey: 'dspl.title',
    subtitleKey: 'dspl.subtitle',
    accept: ['nsp', 'xci'],
    hintKey: 'dspl.hint',
    startLabelKey: 'dspl.startLabel',
    startMessageKey: 'dspl.startMessage',
    renderOptions: (state) => (
        <FormatOptions
            options={state.options}
            setOption={state.setOption}
            titleKey="dspl.optionsTitle"
            descriptions={{ xciKey: 'dspl.outXci', nspKey: 'dspl.outNsp' }}
        />
    ),
    buildRunnerOpts: (state) => ({
        format: state.options.format ?? 'xci',
    }),
};

function CompressPage() { return <OperationPage config={COMPRESS_CONFIG} />; }
function DecompressPage() { return <OperationPage config={DECOMPRESS_CONFIG} />; }
function MergePage() {
    const { files, addFiles, removeFile, clearFiles } = useFileList();
    const { running, progress, outputLines, setRunning, setProgress, setOutputLines } = useRunnerEvents('merge');
    const { outputDir, setOutputDir, selectOutputDir } = useOutputDir();
    const [format, setFormat] = useState('xci');
    const [nodelta, setNodelta] = useState(false);
    const [pv, setPv] = useState(false);
    const [rsvcap, setRsvcap] = useState('');
    const [keypatch, setKeypatch] = useState('');
    const t = useT();

    // Output dir defaults to first file's directory
    useEffect(() => {
        setOutputDir(files.length > 0 ? getDirectory(files[0]) : '');
    }, [files]);

    const canStart = files.length >= 1;

    const handleStart = async () => {
        if (!canStart) return;
        setRunning(true);
        setProgress({ ...EMPTY_PROGRESS, message: t('merge.startMessage') });
        setOutputLines([]);
        await runner.run('merge', files, {
            output: outputDir || undefined,
            format,
            nodelta: nodelta || undefined,
            pv: pv || undefined,
            rsvcap: rsvcap || undefined,
            keypatch: keypatch || undefined,
        });
    };

    const handleCancel = async () => {
        await runner.cancel();
        setRunning(false);
        setProgress({ ...EMPTY_PROGRESS, message: t('common.cancelled') });
    };

    const handleClear = () => {
        clearFiles();
        setOutputLines([]);
        setProgress(EMPTY_PROGRESS);
    };

    return (
        <div className="page">
            <div className="page-header">
                <div className="page-icon accent-merge">{Icons.merge}</div>
                <div>
                    <h2>{t('merge.title')}</h2>
                    <p>{t('merge.subtitle')}</p>
                </div>
            </div>

            <div className="card">
                <div className="card-header">
                    <span className="card-title">{t('merge.inputFiles')}</span>
                </div>
                <div style={{ padding: '12px' }}>
                    <DropZone onFiles={addFiles} accept={['xci', 'nsp', 'nsz', 'xcz']} hint={t('merge.dropHint')} />
                    <FileList files={files} onRemove={removeFile} />
                </div>
            </div>

            {files.length > 0 && (
                <>
                    <div className="card">
                        <div className="card-header">
                            <span className="card-title">{t('merge.optionsTitle')}</span>
                        </div>
                        <div className="options-panel">
                            <div className="option-group">
                                <label className="option-label">{t('merge.outputFormat')}</label>
                                <select value={format} onChange={(e) => setFormat(e.target.value)}>
                                    <option value="xci">{t('merge.xciDesc')}</option>
                                    <option value="nsp">{t('merge.nspDesc')}</option>
                                </select>
                                <span className="option-description">
                                    {format === 'xci' ? t('merge.singleXci') : t('merge.singleNsp')}
                                </span>
                            </div>
                            <div className="option-group">
                                <Toggle checked={nodelta} onChange={setNodelta} label={t('merge.nodelta')} />
                                <span className="option-description">{t('merge.nodeltaDesc')}</span>
                            </div>
                            <div className="option-group">
                                <Toggle checked={pv} onChange={setPv} label={t('merge.pv')} />
                                <span className="option-description">{t('merge.pvDesc')}</span>
                            </div>
                            <div className="option-group">
                                <label className="option-label">{t('merge.rsvcap')}</label>
                                <input
                                    type="text"
                                    value={rsvcap}
                                    onChange={(e) => setRsvcap(e.target.value)}
                                    placeholder={t('merge.rsvcapPlaceholder')}
                                />
                                <span className="option-description">{t('merge.rsvcapDesc')}</span>
                            </div>
                            <div className="option-group">
                                <label className="option-label">{t('merge.keypatch')}</label>
                                <input
                                    type="text"
                                    value={keypatch}
                                    onChange={(e) => setKeypatch(e.target.value)}
                                    placeholder={t('merge.keypatchPlaceholder')}
                                />
                                <span className="option-description">{t('merge.keypatchDesc')}</span>
                            </div>
                        </div>
                    </div>

                    <OutputDirPicker outputDir={outputDir} setOutputDir={setOutputDir} selectOutputDir={selectOutputDir} />

                    {(running || outputLines.length > 0) && (
                        <ProgressDisplay progress={progress} outputLines={outputLines} />
                    )}

                    <ActionBar
                        running={running}
                        onCancel={handleCancel}
                        onClear={handleClear}
                        onStart={handleStart}
                        startLabelKey="merge.startLabel"
                        startDisabled={!canStart}
                    />
                </>
            )}
        </div>
    );
}
function ConvertPage() { return <OperationPage config={CONVERT_CONFIG} />; }
function SplitPage() { return <OperationPage config={SPLIT_CONFIG} />; }
function DsplPage() { return <OperationPage config={DSPL_CONFIG} />; }

function InfoPage() {
    const { files, addFiles, removeFile, clearFiles } = useFileList();
    const { running, progress, outputLines, setRunning, setProgress, setOutputLines } = useRunnerEvents('info');
    const [mode, setMode] = useState<'contentlist' | 'filelist'>('contentlist');
    const t = useT();

    const handleStart = async () => {
        if (files.length === 0) return;
        setRunning(true);
        setProgress({ ...EMPTY_PROGRESS, message: t('info.startMessage') });
        setOutputLines([]);
        await runner.run('info', files, { mode });
    };

    const handleCancel = async () => {
        await runner.cancel();
        setRunning(false);
        setProgress({ ...EMPTY_PROGRESS, message: t('common.cancelled') });
    };

    const handleClear = () => {
        clearFiles();
        setOutputLines([]);
        setProgress(EMPTY_PROGRESS);
    };

    return (
        <div className="page">
            <div className="page-header">
                <div className="page-icon accent-info">{Icons.info}</div>
                <div>
                    <h2>{t('info.title')}</h2>
                    <p>{t('info.subtitle')}</p>
                </div>
            </div>

            <DropZone onFiles={addFiles} accept={['nsp', 'xci', 'nsz', 'xcz']} hint={t('info.hint')} />
            <FileList files={files} onRemove={removeFile} />

            {files.length > 0 && (
                <>
                    <div className="card">
                        <div className="card-header">
                            <span className="card-title">{t('info.modeTitle')}</span>
                        </div>
                        <div className="options-panel">
                            <div className="option-group">
                                <label className="option-label">{t('info.outputType')}</label>
                                <select value={mode} onChange={(e) => setMode(e.target.value as 'contentlist' | 'filelist')}>
                                    <option value="contentlist">{t('info.contentList')}</option>
                                    <option value="filelist">{t('info.fileList')}</option>
                                </select>
                                <span className="option-description">
                                    {mode === 'contentlist' ? t('info.contentDesc') : t('info.metaDesc')}
                                </span>
                            </div>
                        </div>
                    </div>

                    {(running || outputLines.length > 0) && (
                        <ProgressDisplay progress={progress} outputLines={outputLines} />
                    )}

                    <ActionBar
                        running={running}
                        onCancel={handleCancel}
                        onClear={handleClear}
                        onStart={handleStart}
                        startLabelKey="info.startLabel"
                    />
                </>
            )}
        </div>
    );
}

function RenamePage() {
    const { files, addFiles, removeFile, clearFiles } = useFileList();
    const { running, progress, outputLines, setRunning, setProgress, setOutputLines } = useRunnerEvents(['renamef', 'nutdb-refresh', 'nutdb-lookup']);
    const [renmode, setRenmode] = useState('force');
    const [addlangue, setAddlangue] = useState('false');
    const [noversion, setNoversion] = useState('false');
    const [dlcrname, setDlcrname] = useState('false');
    const [optionsTab, setOptionsTab] = useState<'basic' | 'advanced'>('basic');
    const lastVersionOnRef = useRef('false'); // preserves last non-'true' noversion across chip toggle
    const [nutdbTitleId, setNutdbTitleId] = useState('');
    const [proxy, setProxy] = useState('');
    const [nutdbUrl, setNutdbUrl] = useState('');
    const t = useT();

    useEffect(() => {
        api.getSetting('proxy').then(setProxy);
        api.getSetting('nutdbUrl').then(setNutdbUrl);
    }, []);

    const handleStart = async () => {
        if (files.length === 0) return;
        setRunning(true);
        setProgress({ ...EMPTY_PROGRESS, message: t('rename.startMessage') });
        setOutputLines([]);
        await runner.run('renamef', files, {
            renmode,
            addlangue,
            noversion,
            dlcrname,
        });
    };

    const handleNutdbRefresh = async () => {
        setRunning(true);
        setProgress({ ...EMPTY_PROGRESS, message: t('rename.refreshMessage') });
        setOutputLines([]);
        const baseUrl = nutdbUrl || 'https://raw.githubusercontent.com/blawar/titledb/master/US.en.json';
        const finalUrl = proxy ? proxy + baseUrl : baseUrl;
        await runner.run('nutdb-refresh', [], { nutdbUrl: finalUrl });
    };

    const handleNutdbLookup = async () => {
        if (!nutdbTitleId.trim()) return;
        setRunning(true);
        setProgress({ ...EMPTY_PROGRESS, message: t('rename.lookupMessage', { id: nutdbTitleId }) });
        setOutputLines([]);
        await runner.run('nutdb-lookup', [], { titleId: nutdbTitleId.trim() });
    };

    const handleCancel = async () => {
        await runner.cancel();
        setRunning(false);
        setProgress({ ...EMPTY_PROGRESS, message: t('common.cancelled') });
    };

    const handleClear = () => {
        clearFiles();
        setOutputLines([]);
        setProgress(EMPTY_PROGRESS);
    };

    return (
        <div className="page">
            <div className="page-header">
                <div className="page-icon accent-rename">{Icons.rename}</div>
                <div>
                    <h2>{t('rename.title')}</h2>
                    <p>{t('rename.subtitle')}</p>
                </div>
            </div>

            <div className="card">
                <div className="card-header">
                    <span className="card-title">{t('rename.inputTitle')}</span>
                </div>
                <div style={{ padding: '12px' }}>
                    <DropZone onFiles={addFiles} accept={['nsp', 'nsx', 'nsz', 'xci', 'xcz']} hint={t('rename.dropHint')} allowFolders />
                    <FileList files={files} onRemove={removeFile} />
                </div>
            </div>

            <div className="card">
                <div className="card-header">
                    <span className="card-title">{t('rename.optionsTitle')}</span>
                    <div className="card-tab-bar">
                        <button className={`card-tab-btn${optionsTab === 'basic' ? ' active' : ''}`} onClick={() => setOptionsTab('basic')}>{t('rename.tabBasic')}</button>
                        <button className={`card-tab-btn${optionsTab === 'advanced' ? ' active' : ''}`} onClick={() => setOptionsTab('advanced')}>{t('rename.tabAdvanced')}</button>
                    </div>
                </div>
                {optionsTab === 'basic' ? (
                    <div className="options-panel">
                        <div className="option-group">
                            <label className="option-label">{t('rename.renmode')}</label>
                            <select value={renmode} onChange={(e) => setRenmode(e.target.value)}>
                                <option value="force">{t('rename.force')}</option>
                                <option value="skip_corr_tid">{t('rename.skipCorrTid')}</option>
                                <option value="skip_if_tid">{t('rename.skipIfTid')}</option>
                            </select>
                            <span className="option-description">
                                {renmode === 'force' ? t('rename.modeForceDesc') : renmode === 'skip_corr_tid' ? t('rename.modeSkipCorrDesc') : t('rename.modeSkipIfDesc')}
                            </span>
                        </div>
                        <div className="option-group">
                            <label className="option-label">{t('rename.addlangue')}</label>
                            <select value={addlangue} onChange={(e) => setAddlangue(e.target.value)}>
                                <option value="false">{t('rename.no')}</option>
                                <option value="true">{t('rename.yes')}</option>
                            </select>
                            <span className="option-description">{t('rename.addLangDesc')}</span>
                        </div>
                        <div className="option-group">
                            <label className="option-label">{t('rename.noversion')}</label>
                            <select value={noversion} onChange={(e) => { if (e.target.value !== 'true') lastVersionOnRef.current = e.target.value; setNoversion(e.target.value); }}>
                                <option value="false">{t('rename.includeVersion')}</option>
                                <option value="true">{t('rename.excludeVersion')}</option>
                                <option value="xci_no_v0">{t('rename.excludeV0Xci')}</option>
                            </select>
                            <span className="option-description">
                                {noversion === 'false' ? t('rename.verIncludeDesc') : noversion === 'true' ? t('rename.verExcludeDesc') : t('rename.verExcludeV0Desc')}
                            </span>
                        </div>
                        <div className="option-group">
                            <label className="option-label">{t('rename.dlcrname')}</label>
                            <select value={dlcrname} onChange={(e) => setDlcrname(e.target.value)}>
                                <option value="false">{t('rename.no')}</option>
                                <option value="true">{t('rename.yes')}</option>
                                <option value="tag">{t('rename.dlcTagMode')}</option>
                            </select>
                            <span className="option-description">
                                {dlcrname === 'false' ? t('rename.dlcOff') : dlcrname === 'true' ? t('rename.dlcYes') : t('rename.dlcTag')}
                            </span>
                        </div>
                    </div>
                ) : (
                    <div style={{ padding: '16px' }}>
                        <div className="fname-parts">
                            <div className="fname-part fp-locked" title={t('rename.lockedHint')}>
                                Game Name
                                {addlangue === 'true' && <span className="fname-modifier">+Lang</span>}
                                {dlcrname !== 'false' && <span className="fname-modifier">+DLC</span>}
                            </div>
                            <span className="fname-sep">·</span>
                            <div className="fname-part fp-locked" title={t('rename.lockedHint')}>[TitleID]</div>
                            <span className="fname-sep">·</span>
                            <div
                                className={`fname-part ${noversion !== 'true' ? 'fp-on' : 'fp-off'}`}
                                onClick={() => {
                                    if (noversion !== 'true') {
                                        lastVersionOnRef.current = noversion;
                                        setNoversion('true');
                                    } else {
                                        setNoversion(lastVersionOnRef.current);
                                    }
                                }}
                                title={noversion !== 'true' ? t('rename.clickExclude') : t('rename.clickInclude')}
                            >
                                [vVersion]
                            </div>
                        </div>

                        <div className="options-panel" style={{ paddingTop: 0 }}>
                            <div className="option-group">
                                <Toggle checked={addlangue === 'true'} onChange={v => setAddlangue(v ? 'true' : 'false')} label={t('rename.language')} />
                                <span className="option-description">{t('rename.langAppendDesc')}</span>
                            </div>
                            <div className="option-group">
                                <label className="option-label">{t('rename.dlcNaming')}</label>
                                <div className="seg-ctrl">
                                    <button className={`seg-btn${dlcrname === 'false' ? ' active' : ''}`} onClick={() => setDlcrname('false')}>{t('rename.dlcOffShort')}</button>
                                    <button className={`seg-btn${dlcrname === 'true' ? ' active' : ''}`} onClick={() => setDlcrname('true')}>{t('rename.dlcFull')}</button>
                                    <button className={`seg-btn${dlcrname === 'tag' ? ' active' : ''}`} onClick={() => setDlcrname('tag')}>{t('rename.dlcTagMode')}</button>
                                </div>
                                <span className="option-description">
                                    {dlcrname === 'false' ? t('rename.dlcOffDesc') : dlcrname === 'true' ? t('rename.dlcFullDesc') : t('rename.dlcTagDesc')}
                                </span>
                            </div>
                            {noversion !== 'true' && (
                                <div className="option-group">
                                    <label className="option-label">{t('rename.versionXciV0')}</label>
                                    <select value={noversion} onChange={(e) => { lastVersionOnRef.current = e.target.value; setNoversion(e.target.value); }}>
                                        <option value="false">{t('rename.includeV0')}</option>
                                        <option value="xci_no_v0">{t('rename.omitV0')}</option>
                                    </select>
                                    <span className="option-description">{t('rename.v0Desc')}</span>
                                </div>
                            )}
                            <div className="option-group">
                                <label className="option-label">{t('rename.renmode')}</label>
                                <select value={renmode} onChange={(e) => setRenmode(e.target.value)}>
                                    <option value="force">{t('rename.force')}</option>
                                    <option value="skip_corr_tid">{t('rename.skipCorrTid')}</option>
                                    <option value="skip_if_tid">{t('rename.skipIfTid')}</option>
                                </select>
                                <span className="option-description">
                                    {renmode === 'force' ? t('rename.modeForceDesc') : renmode === 'skip_corr_tid' ? t('rename.modeSkipCorrDesc') : t('rename.modeSkipIfDesc')}
                                </span>
                            </div>
                        </div>

                        <div className="fname-preview-label" style={{ marginTop: 12 }}>{t('rename.formatPreview')}</div>
                        <div className="fname-preview">
                            {dlcrname === 'false'
                                ? <><span>GameName</span>
                                   {addlangue === 'true' && <span className="fp-hi"> [EN,FR]</span>}
                                  </>
                                : <><span className="fp-hi">DLC Name</span>
                                   {dlcrname === 'tag' && <span className="fp-hi"> [DLC 2]</span>}
                                  </>
                            }
                            <span> [0100847008600000]</span>
                            {noversion !== 'true' && <span className="fp-hi"> [v131072]</span>}
                            <span>.nsp</span>
                        </div>
                        {dlcrname !== 'false' && (
                            <span className="option-description" style={{ display: 'block', marginTop: 6 }}>
                                {t('rename.segmentHint')}
                            </span>
                        )}
                    </div>
                )}
            </div>

            <div className="card">
                <div className="card-header">
                    <span className="card-title">{t('rename.nutdbTitle')}</span>
                </div>
                <div className="options-panel">
                    <div className="option-group">
                        <button className="btn btn-secondary" onClick={handleNutdbRefresh} disabled={running}>
                            {t('rename.refreshCache')}
                        </button>
                        <span className="option-description">{t('rename.refreshDesc')}</span>
                    </div>
                    <div className="option-group">
                        <label className="option-label">{t('rename.lookupLabel')}</label>
                        <div style={{ display: 'flex', gap: '8px' }}>
                            <input
                                type="text"
                                value={nutdbTitleId}
                                onChange={(e) => setNutdbTitleId(e.target.value)}
                                placeholder={t('rename.lookupPlaceholder')}
                                style={{ flex: 1 }}
                            />
                            <button className="btn btn-secondary" onClick={handleNutdbLookup} disabled={running || !nutdbTitleId.trim()}>{t('rename.lookupButton')}</button>
                        </div>
                        <span className="option-description">{t('rename.lookupDesc')}</span>
                    </div>
                </div>
            </div>

            {(running || outputLines.length > 0) && (
                <ProgressDisplay progress={progress} outputLines={outputLines} />
            )}

            <ActionBar
                running={running}
                onCancel={handleCancel}
                onClear={handleClear}
                onStart={handleStart}
                startLabelKey="rename.startLabel"
                startDisabled={files.length === 0}
            />
        </div>
    );
}

function CreatePage() {
    const { running, progress, outputLines, setRunning, setProgress, setOutputLines } = useRunnerEvents('create');
    const { outputDir, setOutputDir, selectOutputDir } = useOutputDir();
    const [inputFolder, setInputFolder] = useState('');
    const t = useT();

    const handleSelectFolder = useCallback(async () => {
        const dir = await api.selectOutputDir();
        if (dir) setInputFolder(dir);
    }, []);

    const handleStart = async () => {
        if (!inputFolder) return;
        setRunning(true);
        setProgress({ ...EMPTY_PROGRESS, message: t('create.startMessage') });
        setOutputLines([]);
        await runner.run('create', [inputFolder], {
            output: outputDir || undefined,
        });
    };

    const handleCancel = async () => {
        await runner.cancel();
        setRunning(false);
        setProgress({ ...EMPTY_PROGRESS, message: t('common.cancelled') });
    };

    const handleClear = () => {
        setInputFolder('');
        setOutputLines([]);
        setProgress(EMPTY_PROGRESS);
    };

    const getFolderName = (p: string) => p.replace(/\\/g, '/').split('/').pop();

    return (
        <div className="page">
            <div className="page-header">
                <div className="page-icon accent-create">{Icons.create}</div>
                <div>
                    <h2>{t('create.title')}</h2>
                    <p>{t('create.subtitle')}</p>
                </div>
            </div>

            <div className="card">
                <div className="card-header">
                    <span className="card-title">{t('create.inputFolder')}</span>
                </div>
                <div className="options-panel">
                    <div className="option-group" style={{ gridColumn: '1 / -1' }}>
                        <label className="option-label">{t('create.sourceFolder')}</label>
                        <div className="dir-picker-row">
                            <input
                                type="text"
                                value={inputFolder}
                                onChange={(e) => setInputFolder(e.target.value)}
                                placeholder={t('create.sourcePlaceholder')}
                            />
                            <button className="btn btn-secondary btn-sm" onClick={handleSelectFolder}>{t('common.browse')}</button>
                        </div>
                        {inputFolder && (
                            <span className="option-description">
                                {t('create.outputIs', { name: `${getFolderName(inputFolder)}.nsp` })}
                            </span>
                        )}
                    </div>
                </div>
            </div>

            {inputFolder && (
                <>
                    <OutputDirPicker outputDir={outputDir} setOutputDir={setOutputDir} selectOutputDir={selectOutputDir} />

                    {(running || outputLines.length > 0) && (
                        <ProgressDisplay progress={progress} outputLines={outputLines} />
                    )}

                    <ActionBar
                        running={running}
                        onCancel={handleCancel}
                        onClear={handleClear}
                        onStart={handleStart}
                        startLabelKey="create.startLabel"
                    />
                </>
            )}
        </div>
    );
}

function SettingsPage({ onBackendChanged }: { onBackendChanged?: () => void }) {
    const [backendVersion, setBackendVersion] = useState<string | null>(null);
    const [keysInstalled, setKeysInstalled] = useState(false);
    const [updateStatus, setUpdateStatus] = useState<string | null>(null);
    const [checkingUpdate, setCheckingUpdate] = useState(false);
    const [proxy, setProxy] = useState('');
    const [nutdbUrl, setNutdbUrl] = useState('');
    const [tempDir, setTempDir] = useState('');
    // 语言选择：本地 state 驱动下拉，提交时写入 i18n
    const [language, setLanguage] = useState<Locale>(getLocale());
    const t = useT();

    useEffect(() => {
        api.getInstalledVersion().then(setBackendVersion);
        api.hasKeys().then(setKeysInstalled);
        api.getSetting('proxy').then(setProxy);
        api.getSetting('nutdbUrl').then(setNutdbUrl);
        api.getSetting('tempDir').then(setTempDir);
    }, []);

    // 订阅全局语言变化（含语言选择页与后续切换），保持下拉显示同步
    useEffect(() => subscribeLocale(setLanguage), []);

    const handleChangeLanguage = async (value: Locale) => {
        setLanguage(value);
        await setLocale(value);
    };

    const handleCheckUpdate = async () => {
        setCheckingUpdate(true);
        setUpdateStatus(null);
        try {
            const release = await api.fetchLatestRelease();
            const backendExists = await api.hasBackend();
            if (!release) {
                setUpdateStatus(t('settings.updateUnreachable'));
            } else if (backendExists && backendVersion && release.tag === backendVersion) {
                setUpdateStatus(t('settings.updateUpToDate', { version: backendVersion }));
            } else {
                setUpdateStatus(t('settings.updateDownloading', { tag: release.tag }));
                await api.downloadBackend(release.downloadUrl);
                await api.saveInstalledVersion(release.tag);
                setBackendVersion(release.tag);
                setUpdateStatus(t('settings.updateUpdated', { tag: release.tag }));
                onBackendChanged?.();
            }
        } catch (e: any) {
            setUpdateStatus(t('settings.updateFailed', { error: e.message || e }));
        } finally {
            setCheckingUpdate(false);
        }
    };

    const handleImportBackend = async () => {
        const result = await api.importBackend();
        if (result.ok) {
            setBackendVersion(null);
            await api.saveInstalledVersion('');
            setUpdateStatus(t('settings.backendImported'));
            onBackendChanged?.();
        } else if (result.error) {
            setUpdateStatus(result.error);
        }
    };

    const handleImportKeys = async () => {
        const result = await api.importKeys();
        if (result.ok) setKeysInstalled(true);
    };

    const handleSelectTempDir = async () => {
        const dir = await api.selectOutputDir();
        if (dir) {
            setTempDir(dir);
            await api.saveSetting('tempDir', dir);
        }
    };

    return (
        <div className="page">
            <div className="page-header">
                <div className="page-icon accent-settings">{Icons.settings}</div>
                <div>
                    <h2>{t('settings.title')}</h2>
                    <p>{t('settings.subtitle')}</p>
                </div>
            </div>

            {/* 通用：语言 */}
            <div className="settings-section">
                <h3 className="settings-section-title">{t('settings.sectionGeneral')}</h3>
                <div className="settings-row">
                    <div className="settings-row-label">
                        <h4>{t('settings.languageTitle')}</h4>
                        <p>{t('settings.languageDesc')}</p>
                    </div>
                    <div className="settings-row-control">
                        <select value={language} onChange={(e) => handleChangeLanguage(e.target.value as Locale)}>
                            {LOCALES.map(loc => (
                                <option key={loc} value={loc}>{LOCALE_META[loc].label}</option>
                            ))}
                        </select>
                    </div>
                </div>
            </div>

            <div className="settings-grid">
                <div className="settings-section">
                    <h3 className="settings-section-title">{t('settings.sectionTools')}</h3>

                    <div className="settings-row">
                        <div className="settings-row-label">
                            <h4>{t('settings.backendTitle')}</h4>
                            <p>{backendVersion ? t('settings.backendInstalled', { version: backendVersion }) : t('settings.backendUnknown')}</p>
                        </div>
                        <div className="settings-row-control">
                            <div style={{ display: 'flex', gap: '8px' }}>
                                <button
                                    className="btn btn-secondary btn-sm"
                                    onClick={handleCheckUpdate}
                                    disabled={checkingUpdate}
                                >
                                    {checkingUpdate ? t('settings.checking') : t('settings.checkUpdate')}
                                </button>
                                <button className="btn btn-ghost btn-sm" onClick={handleImportBackend}>{t('settings.importManual')}</button>
                            </div>
                            {updateStatus && (
                                <p style={{ marginTop: '6px', fontSize: '12px', color: 'var(--text-muted)' }}>{updateStatus}</p>
                            )}
                        </div>
                    </div>

                    <div className="settings-row">
                        <div className="settings-row-label">
                            <h4>{t('settings.keysTitle')}</h4>
                            <p>{keysInstalled ? t('settings.keysInstalled') : t('settings.keysMissing')}</p>
                        </div>
                        <div className="settings-row-control">
                            <button className="btn btn-secondary btn-sm" onClick={handleImportKeys}>
                                {Icons.key} {t('settings.importKeys')}
                            </button>
                        </div>
                    </div>

                    <div className="settings-row">
                        <div className="settings-row-label">
                            <h4>{t('settings.tempTitle')}</h4>
                            <p>{t('settings.tempDesc')}</p>
                        </div>
                        <div className="settings-row-control">
                            <div style={{ display: 'flex', gap: '8px' }}>
                                <input
                                    type="text"
                                    className="input"
                                    placeholder={t('settings.tempPlaceholder')}
                                    value={tempDir}
                                    onChange={(e) => setTempDir(e.target.value)}
                                    onBlur={() => api.saveSetting('tempDir', tempDir.trim())}
                                />
                                <button className="btn btn-secondary btn-sm" onClick={handleSelectTempDir}>{t('common.browse')}</button>
                                {tempDir && (
                                    <button
                                        className="btn btn-ghost btn-sm"
                                        onClick={() => {
                                            setTempDir('');
                                            void api.saveSetting('tempDir', '');
                                        }}
                                    >
                                        {t('common.reset')}
                                    </button>
                                )}
                            </div>
                        </div>
                    </div>
                </div>

                <div className="settings-section">
                    <h3 className="settings-section-title">{t('settings.sectionNetwork')}</h3>

                    <div className="settings-row">
                        <div className="settings-row-label">
                            <h4>{t('settings.proxyTitle')}</h4>
                            <p>{t('settings.proxyDesc')}</p>
                        </div>
                        <div className="settings-row-control">
                            <input
                                type="text"
                                className="input"
                                placeholder={t('settings.proxyPlaceholder')}
                                value={proxy}
                                onChange={(e) => setProxy(e.target.value)}
                                onBlur={() => api.saveSetting('proxy', proxy.trim())}
                            />
                        </div>
                    </div>

                    <div className="settings-row">
                        <div className="settings-row-label">
                            <h4>{t('settings.nutdbTitle')}</h4>
                            <p>{t('settings.nutdbDesc')}</p>
                        </div>
                        <div className="settings-row-control">
                            <input
                                type="text"
                                className="input"
                                placeholder="https://raw.githubusercontent.com/blawar/titledb/master/US.en.json"
                                value={nutdbUrl}
                                onChange={(e) => setNutdbUrl(e.target.value)}
                                onBlur={() => api.saveSetting('nutdbUrl', nutdbUrl.trim())}
                            />
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}

// ============================================================
// Setup Page
// ============================================================

function SetupPage({
    onComplete,
    appVersion,
}: {
    onComplete: () => void;
    appVersion: string;
}) {
    const [error, setError] = useState('');
    const [checking, setChecking] = useState(false);
    const t = useT();

    const handleImportKeys = async () => {
        setError('');
        setChecking(true);
        const result = await api.importKeys();
        setChecking(false);
        if (result.ok) {
            const keys = await api.hasKeys();
            if (keys) onComplete();
        } else if (result.error) {
            setError(result.error);
        }
    };

    return (
        <div className="setup-screen">
            <div className="setup-card">
                <div className="setup-logo">{Icons.switchLogo}</div>
                <h1 className="setup-title">{t('setup.title')}</h1>
                <p className="setup-subtitle">
                    {t('setup.subtitle')}
                </p>

                <div className="setup-divider" />

                <div className="setup-checklist">
                    <div className="setup-check-item">
                        <span className="setup-check-icon">
                            {Icons.key}
                        </span>
                        <span>{t('setup.checkItem', { file: 'prod.keys' })}</span>
                    </div>
                </div>

                <div className="setup-actions">
                    <button
                        className="btn btn-primary btn-lg setup-btn"
                        onClick={handleImportKeys}
                        disabled={checking}
                    >
                        {checking ? t('setup.importing') : <>{Icons.key} {t('setup.importKeys')}</>}
                    </button>
                </div>

                {error && (
                    <div className="setup-error">
                        {Icons.alertCircle} {error}
                    </div>
                )}

                <div className="setup-footer">
                    {t('common.appName')} v{appVersion}
                </div>
            </div>
        </div>
    );
}

function VerifyPage() {
    const { files, addFiles, removeFile, clearFiles } = useFileList();
    const { running, progress, outputLines, setRunning, setProgress, setOutputLines } = useRunnerEvents('verify');
    const [vertype, setVertype] = useState('lv1');
    const t = useT();

    const handleStart = async () => {
        if (files.length === 0) return;
        setRunning(true);
        setProgress({ ...EMPTY_PROGRESS, message: t('verify.startMessage') });
        setOutputLines([]);
        await runner.run('verify', files, { vertype });
    };

    const handleCancel = async () => {
        await runner.cancel();
        setRunning(false);
        setProgress({ ...EMPTY_PROGRESS, message: t('common.cancelled') });
    };

    const handleClear = () => {
        clearFiles();
        setOutputLines([]);
        setProgress(EMPTY_PROGRESS);
    };

    // 三个校验级别的说明文本 i18n 键
    const vertypeDescKeys: Record<string, string> = {
        lv1: 'verify.lv1Desc',
        lv2: 'verify.lv2Desc',
        lv3: 'verify.lv3Desc',
    };

    return (
        <div className="page">
            <div className="page-header">
                <div className="page-icon accent-verify">{Icons.verify}</div>
                <div>
                    <h2>{t('verify.title')}</h2>
                    <p>{t('verify.subtitle')}</p>
                </div>
            </div>

            <DropZone onFiles={addFiles} accept={['nsp', 'nsx', 'nsz', 'xci', 'xcz']} hint={t('verify.hint')} />
            <FileList files={files} onRemove={removeFile} />

            {files.length > 0 && (
                <>
                    <div className="card">
                        <div className="card-header">
                            <span className="card-title">{t('verify.levelTitle')}</span>
                        </div>
                        <div className="options-panel">
                            <div className="option-group">
                                <label className="option-label">{t('verify.mode')}</label>
                                <select value={vertype} onChange={(e) => setVertype(e.target.value)}>
                                    <option value="lv1">{t('verify.lv1')}</option>
                                    <option value="lv2">{t('verify.lv2')}</option>
                                    <option value="lv3">{t('verify.lv3')}</option>
                                </select>
                                <span className="option-description">{t(vertypeDescKeys[vertype])}</span>
                            </div>
                        </div>
                    </div>

                    {(running || outputLines.length > 0) && (
                        <ProgressDisplay progress={progress} outputLines={outputLines} />
                    )}

                    <ActionBar
                        running={running}
                        onCancel={handleCancel}
                        onClear={handleClear}
                        onStart={handleStart}
                        startLabelKey="verify.startLabel"
                    />
                </>
            )}
        </div>
    );
}

// Parsed representation of an nscb_rust merge output filename.
// Format: "GameName [TitleID] [vVersion] (Summary).ext"
// Example: "Bayonetta 2 [0100847008600000] [v131072] (1G+1U+3D).nsp"
interface ParsedMergeOutput {
    filename: string;
    gameName: string;
    titleId: string;   // uppercase 16-hex
    version: string;
    dlcCount: number;  // number of DLC packs included in the merge (from summary)
}

function parseMergeOutputFilename(filename: string): ParsedMergeOutput | null {
    const lastDot = filename.lastIndexOf('.');
    if (lastDot === -1) return null;
    const base = filename.substring(0, lastDot);
    const m = base.match(/^(.+?)\s+\[([0-9A-Fa-f]{16})\]\s+\[v(\d+)\](?:\s+\(([^)]+)\))?$/i);
    if (!m) return null;
    const dlcMatch = (m[4] ?? '').match(/(\d+)D/i);
    return {
        filename,
        gameName: m[1],
        titleId: m[2].toUpperCase(),
        version: m[3],
        dlcCount: dlcMatch ? parseInt(dlcMatch[1]) : 0,
    };
}

// Extract all base title IDs from a list of input file paths.
// Collects every distinct base TID found, so multi-game collection folders
// (e.g. "Guacamelee One-Two Punch Collection" containing Guacamelee 1 & 2)
// can match an output file named after any one of the included games.
// Base TIDs end in 000; update (800) and DLC (001+) TIDs are normalised to base.
function extractBaseTitleIds(filePaths: string[]): Set<string> {
    const tidRe = /[\[-]([0-9A-Fa-f]{16})[\]-]/gi;
    const baseTids = new Set<string>();
    for (const fp of filePaths) {
        const fname = fp.replace(/\\/g, '/').split('/').pop() ?? '';
        for (const m of fname.matchAll(tidRe)) {
            const tid = m[1].toUpperCase();
            baseTids.add(tid.endsWith('000') ? tid : tid.slice(0, -3) + '000');
        }
    }
    return baseTids;
}

// Count distinct DLC title IDs in the input file names.
// DLC TIDs end in 001–7FF (base = 000, update = 800).
// Used to detect stale outputs where new DLC was added without a version bump.
function countDlcFiles(filePaths: string[]): number {
    const tidRe = /[\[-]([0-9A-Fa-f]{16})[\]-]/gi;
    const dlcTids = new Set<string>();
    for (const fp of filePaths) {
        const fname = fp.replace(/\\/g, '/').split('/').pop() ?? '';
        for (const m of fname.matchAll(tidRe)) {
            const tid = m[1].toUpperCase();
            const suffixValue = parseInt(tid.slice(-3), 16);
            if (suffixValue >= 0x001 && suffixValue <= 0x7FF) dlcTids.add(tid);
        }
    }
    return dlcTids.size;
}

// Extract the highest version number found across all input file names.
// Used to detect stale outputs where the output version < latest input version.
function extractLatestVersion(filePaths: string[]): number {
    const verRe = /\[v(\d+)\]/gi;
    let latest = 0;
    for (const fp of filePaths) {
        const fname = fp.replace(/\\/g, '/').split('/').pop() ?? '';
        for (const m of fname.matchAll(verRe)) {
            const v = parseInt(m[1]);
            if (v > latest) latest = v;
        }
    }
    return latest;
}

function BatchMergePage() {
    const [baseFolder, setBaseFolder] = useState('');
    const [outputDir, setOutputDir] = useState('');
    const [format, setFormat] = useState('xci');
    const [nodelta, setNodelta] = useState(false);
    const [scanning, setScanning] = useState(false);
    const [games, setGames] = useState<BatchGame[]>([]);
    const [running, setRunning] = useState(false);
    const [currentIdx, setCurrentIdx] = useState(-1);
    const [outputLines, setOutputLines] = useState<string[]>([]);
    const [progress, setProgress] = useState(EMPTY_PROGRESS);
    const cancelledRef = useRef(false);
    const gameResolverRef = useRef<((result: 'success' | 'error' | 'cancelled') => void) | null>(null);
    // t 需要在事件回调中读取，故用 ref 保存最新的翻译函数
    const t = useT();
    const tRef = useRef(t);
    useEffect(() => { tRef.current = t; }, [t]);

    useEffect(() => {
        const unsubs = [
            runner.on('progress', (data) => {
                if (data.op === 'merge') setProgress({ percent: data.percent, message: data.message });
            }),
            runner.on('output', (data) => {
                if (data.op === 'merge') setOutputLines(prev => [...prev.slice(-200), data.line]);
            }),
            runner.on('done', (data) => {
                if (data.op === 'merge' && gameResolverRef.current) {
                    const resolve = gameResolverRef.current;
                    gameResolverRef.current = null;
                    resolve(data.code === 0 ? 'success' : 'error');
                }
            }),
            runner.on('nscb-error', (data) => {
                if (data.op === 'merge') setOutputLines(prev => [...prev, `ERROR: ${data.message}`]);
            }),
        ];
        return () => unsubs.forEach(fn => fn());
    }, []);

    const handleSelectBaseFolder = async () => {
        const dir = await api.selectOutputDir();
        if (dir) { setBaseFolder(dir); setGames([]); }
    };

    const handleSelectOutputDir = async () => {
        const dir = await api.selectOutputDir();
        if (dir) setOutputDir(dir);
    };

    function normalizeForMatch(s: string): string {
        return s.toLowerCase().replace(/[^a-z0-9]/g, '');
    }

    const handleScan = async () => {
        if (!baseFolder || !outputDir) return;
        setScanning(true);
        setGames([]);
        try {
            const entries = await api.listDir(baseFolder);
            const subfolders = entries.filter(e => e.isDirectory);

            let outputFiles: api.DirEntryInfo[] = [];
            try { outputFiles = await api.listDir(outputDir); } catch { /* empty output dir */ }

            // Parse all switch files in the output dir into structured objects
            const parsedOutputs = outputFiles
                .filter(f => {
                    if (f.isDirectory) return false;
                    const ext = f.name.split('.').pop()?.toLowerCase() ?? '';
                    return SWITCH_EXTS.has(ext);
                })
                .map(f => parseMergeOutputFilename(f.name))
                .filter((p): p is ParsedMergeOutput => p !== null);

            const discovered: BatchGame[] = [];
            for (const sub of subfolders) {
                if (!sub.name) continue;
                let subEntries: api.DirEntryInfo[] = [];
                try { subEntries = await api.listDir(sub.path); } catch { continue; }

                const switchFiles = subEntries.filter(e => {
                    if (e.isDirectory) return false;
                    const ext = e.name.split('.').pop()?.toLowerCase() ?? '';
                    return SWITCH_EXTS.has(ext);
                });
                if (switchFiles.length === 0) continue;

                const filePaths = switchFiles.map(f => f.path);

                // Prefer title ID match — most accurate, handles multi-game collections
                // (e.g. a folder with Guacamelee 1 & 2 files matches an output named
                // after either game) and avoids name ambiguity entirely.
                // Pick the highest-version candidate — the output dir may contain both
                // an old and a new merged file for the same game.
                let matchedOutput: ParsedMergeOutput | undefined;
                let tidMatchStale = false;
                const baseTids = extractBaseTitleIds(filePaths);
                if (baseTids.size > 0) {
                    const candidates = parsedOutputs.filter(o => baseTids.has(o.titleId));
                    if (candidates.length > 0) {
                        matchedOutput = candidates.reduce((best, o) =>
                            parseInt(o.version) > parseInt(best.version) ? o : best
                        );
                    }
                }
                // Staleness check: if the matched output's version is lower than the
                // latest version found in the input files, the output is out of date.
                // e.g. folder has a new [UPD] file but output still shows [v0].
                // Flag tidMatchStale so the name fallback doesn't re-match the same
                // stale output (name matching would otherwise find it again by folder name).
                if (matchedOutput) {
                    const inputVer = extractLatestVersion(filePaths);
                    const inputDlc = countDlcFiles(filePaths);
                    if (inputVer > parseInt(matchedOutput.version) || inputDlc > matchedOutput.dlcCount) {
                        matchedOutput = undefined;
                        tidMatchStale = true;
                    }
                }
                // Name fallback for files without TIDs in their names.
                // Skipped when TID matching already confirmed the output is stale.
                // Three cases handled:
                //   endsWith  — publisher prefix:  "Metal Slug 3" in "ACA NEOGEO METAL SLUG 3"
                //   startsWith — volume suffix:    "Mega Man BN Legacy Collection" in
                //                                  "MEGAMAN BN LEGACY COLLECTION Vol.1"
                //                Guard: reject if the extra chars start with a digit,
                //                which would indicate a sequel ("bayonetta" + "2") not a tag.
                if (!matchedOutput && !tidMatchStale) {
                    const normName = normalizeForMatch(sub.name);
                    if (normName.length >= 3) {
                        const nameCandidates = parsedOutputs.filter(o => {
                            const n = normalizeForMatch(o.gameName);
                            if (n === normName) return true;
                            if (n.endsWith(normName)) return true;
                            if (n.startsWith(normName)) {
                                const extra = n.slice(normName.length);
                                return !/^\d/.test(extra);
                            }
                            return false;
                        });
                        if (nameCandidates.length > 0) {
                            matchedOutput = nameCandidates.reduce((best, o) =>
                                parseInt(o.version) > parseInt(best.version) ? o : best
                            );
                            // Apply the same staleness check as the TID path.
                            const inputVer = extractLatestVersion(filePaths);
                            const inputDlc = countDlcFiles(filePaths);
                            if (inputVer > parseInt(matchedOutput.version) || inputDlc > matchedOutput.dlcCount) {
                                matchedOutput = undefined;
                            }
                        }
                    }
                }

                discovered.push({
                    name: sub.name,
                    path: sub.path,
                    files: filePaths,
                    status: matchedOutput ? 'skipped' : 'pending',
                    outputFile: matchedOutput?.filename,
                });
            }
            discovered.sort((a, b) => a.name.localeCompare(b.name, undefined, { sensitivity: 'base' }));
            setGames(discovered);
        } catch (e: any) {
            setGames([]);
        } finally {
            setScanning(false);
        }
    };

    const listOutputFileNames = async (): Promise<Set<string>> => {
        try {
            const entries = await api.listDir(outputDir);
            return new Set(entries.filter(e => !e.isDirectory).map(e => e.name));
        } catch { return new Set(); }
    };

    const runCurrentGame = (files: string[], opts: Record<string, any>): Promise<'success' | 'error' | 'cancelled'> => {
        return new Promise((resolve) => {
            gameResolverRef.current = resolve;
            runner.run('merge', files, opts).catch(() => {
                if (gameResolverRef.current === resolve) {
                    gameResolverRef.current = null;
                    resolve('error');
                }
            });
        });
    };

    const handleStart = async () => {
        const pendingCount = games.filter(g => g.status === 'pending').length;
        if (!outputDir || pendingCount === 0 || running) return;

        setRunning(true);
        cancelledRef.current = false;

        for (let i = 0; i < games.length; i++) {
            if (cancelledRef.current) break;
            const game = games[i];
            if (game.status !== 'pending') continue;

            setCurrentIdx(i);
            setOutputLines([]);
            setProgress({ ...EMPTY_PROGRESS, message: tRef.current('batch.mergingGame', { name: game.name }) });
            setGames(prev => prev.map((g, idx) => idx === i ? { ...g, status: 'running', message: undefined } : g));

            const beforeFiles = await listOutputFileNames();
            const result = await runCurrentGame(game.files, {
                output: outputDir,
                format,
                nodelta: nodelta || undefined,
            });

            if (result === 'cancelled') {
                setGames(prev => prev.map((g, idx) => idx === i ? { ...g, status: 'pending', message: tRef.current('common.cancelled') } : g));
                break;
            }

            const afterEntries = await api.listDir(outputDir).catch(() => [] as api.DirEntryInfo[]);
            const newFiles = afterEntries.filter(e => !e.isDirectory && !beforeFiles.has(e.name));

            if (result === 'error') {
                let renamedFile: string | undefined;
                for (const f of newFiles) {
                    if (!f.name.startsWith('ERROR_')) {
                        const newName = `ERROR_${f.name}`;
                        try {
                            await api.renameFile(f.path, pathJoin(outputDir, newName));
                            renamedFile = newName;
                        } catch {
                            renamedFile = f.name;
                        }
                    }
                }
                setGames(prev => prev.map((g, idx) => idx === i
                    ? { ...g, status: 'error', outputFile: renamedFile, message: tRef.current('batch.mergeFailed') }
                    : g));
            } else {
                setGames(prev => prev.map((g, idx) => idx === i
                    ? { ...g, status: 'done', outputFile: newFiles[0]?.name }
                    : g));
            }
        }

        setRunning(false);
        setCurrentIdx(-1);
        if (!cancelledRef.current) {
            setProgress({ percent: 100, message: tRef.current('batch.complete') });
        }
    };

    const handleCancel = async () => {
        cancelledRef.current = true;
        if (gameResolverRef.current) {
            const resolve = gameResolverRef.current;
            gameResolverRef.current = null;
            resolve('cancelled');
        }
        await runner.cancel();
        setRunning(false);
        setProgress({ ...EMPTY_PROGRESS, message: tRef.current('common.cancelled') });
    };

    const handleToggleGame = (idx: number) => {
        if (running) return;
        setGames(prev => prev.map((g, i) => {
            if (i !== idx) return g;
            if (g.status === 'pending') return { ...g, status: 'skipped', message: tRef.current('batch.manualSkipped') };
            if (g.status === 'skipped') return { ...g, status: 'pending', message: undefined };
            return g;
        }));
    };

    const handleClear = () => {
        if (running) return;
        setGames([]);
        setOutputLines([]);
        setProgress(EMPTY_PROGRESS);
    };

    const pendingCount = games.filter(g => g.status === 'pending').length;
    const skippedCount = games.filter(g => g.status === 'skipped').length;
    const doneCount = games.filter(g => g.status === 'done').length;
    const errorCount = games.filter(g => g.status === 'error').length;

    return (
        <div className="page">
            <div className="page-header">
                <div className="page-icon accent-batchmerge">{Icons.batchMerge}</div>
                <div>
                    <h2>{t('batch.title')}</h2>
                    <p>{t('batch.subtitle')}</p>
                </div>
            </div>

            <div className="card">
                <div className="card-header">
                    <span className="card-title">{t('batch.foldersTitle')}</span>
                </div>
                <div className="options-panel">
                    <div className="option-group">
                        <label className="option-label">{t('batch.baseFolder')}</label>
                        <div className="dir-picker-row">
                            <input
                                type="text"
                                value={baseFolder}
                                onChange={e => setBaseFolder(e.target.value)}
                                placeholder={t('batch.basePlaceholder')}
                                readOnly={running}
                            />
                            <button className="btn btn-secondary btn-sm" onClick={handleSelectBaseFolder} disabled={running}>{t('common.browse')}</button>
                        </div>
                        <span className="option-description">{t('batch.baseDesc')}</span>
                    </div>
                    <div className="option-group">
                        <label className="option-label">
                            {t('batch.outputFolder')} <span className="required-star">*</span>
                        </label>
                        <div className="dir-picker-row">
                            <input
                                type="text"
                                value={outputDir}
                                onChange={e => setOutputDir(e.target.value)}
                                placeholder={t('batch.outputPlaceholder')}
                                readOnly={running}
                            />
                            <button className="btn btn-secondary btn-sm" onClick={handleSelectOutputDir} disabled={running}>{t('common.browse')}</button>
                        </div>
                        <span className="option-description">{t('batch.outputDesc')}</span>
                    </div>
                </div>
            </div>

            <div className="card">
                <div className="card-header">
                    <span className="card-title">{t('batch.optionsTitle')}</span>
                </div>
                <div className="options-panel">
                    <div className="option-group">
                        <label className="option-label">{t('merge.outputFormat')}</label>
                        <select value={format} onChange={e => setFormat(e.target.value)} disabled={running}>
                            <option value="xci">{t('merge.xciDesc')}</option>
                            <option value="nsp">{t('merge.nspDesc')}</option>
                        </select>
                    </div>
                    <div className="option-group">
                        <Toggle checked={nodelta} onChange={setNodelta} label={t('merge.nodelta')} />
                        <span className="option-description">{t('merge.nodeltaDesc')}</span>
                    </div>
                </div>
            </div>

            <div className="batch-scan-row">
                <button
                    className="btn btn-secondary"
                    onClick={handleScan}
                    disabled={!baseFolder || !outputDir || scanning || running}
                >
                    {scanning ? t('batch.scanning') : t('batch.scan')}
                </button>
                {games.length > 0 && (
                    <span className="batch-summary">
                        {t('batch.summaryFound', { count: games.length, s: pluralSuffix(getLocale(), games.length) })}
                        {' · '}{t('batch.summaryToMerge', { count: pendingCount })}
                        {skippedCount > 0 && ` · ${t('batch.summaryAlreadyMerged', { count: skippedCount })}`}
                        {doneCount > 0 && ` · ${t('batch.summaryDone', { count: doneCount })}`}
                        {errorCount > 0 && ` · ${t('batch.summaryFailed', { count: errorCount })}`}
                    </span>
                )}
            </div>

            {games.length > 0 && (
                <div className="card">
                    <div className="card-header">
                        <span className="card-title">{t('batch.gamesTitle')}</span>
                        <span style={{ fontSize: 'var(--font-size-xs)', color: 'var(--text-muted)' }}>{t('batch.foundCount', { count: games.length })}</span>
                    </div>
                    <div className="batch-game-list">
                        {games.map((game, i) => {
                            const toggleable = !running && (game.status === 'pending' || game.status === 'skipped');
                            return (
                            <div
                                key={game.path}
                                className={`batch-game-row status-${game.status}${i === currentIdx ? ' current' : ''}${toggleable ? ' toggleable' : ''}`}
                                onClick={toggleable ? () => handleToggleGame(i) : undefined}
                                title={toggleable ? (game.status === 'pending' ? t('batch.clickSkip') : t('batch.clickInclude')) : undefined}
                            >
                                <span className={`batch-status-badge status-${game.status}`}>
                                    {game.status === 'pending' ? t('batch.statusPending')
                                        : game.status === 'skipped' ? t('batch.statusSkipped')
                                        : game.status === 'running' ? t('batch.statusRunning')
                                        : game.status === 'done' ? t('batch.statusDone')
                                        : t('batch.statusError')}
                                </span>
                                <div className="batch-game-info">
                                    <span className="batch-game-name">{game.name}</span>
                                    {game.outputFile && <span className="batch-game-output">{game.outputFile}</span>}
                                    {game.message && !game.outputFile && <span className="batch-game-message">{game.message}</span>}
                                </div>
                                <span className="batch-game-count">{t('batch.fileCount', { count: game.files.length, s: pluralSuffix(getLocale(), game.files.length) })}</span>
                            </div>
                            );
                        })}
                    </div>
                </div>
            )}

            {(running || outputLines.length > 0) && (
                <ProgressDisplay progress={progress} outputLines={outputLines} />
            )}

            {games.length > 0 && (
                <ActionBar
                    running={running}
                    onCancel={handleCancel}
                    onClear={handleClear}
                    onStart={handleStart}
                    startLabelKey="batch.startLabel"
                    startLabelParams={{ count: pendingCount }}
                    startDisabled={!outputDir || pendingCount === 0}
                />
            )}
        </div>
    );
}

function MissingBackendBanner({ onGoToSettings }: { onGoToSettings: () => void }) {
    const t = useT();
    return (
        <div className="missing-backend-banner">
            {Icons.alertCircle}
            <span>{t('banner.missing', { backend: 'nscb_rust' })}</span>
            <button className="btn btn-secondary btn-sm" onClick={onGoToSettings}>
                {t('banner.openSettings')}
            </button>
        </div>
    );
}

// ============================================================
// Language Picker Page
// ============================================================

function LanguagePickerPage({ onConfirm }: { onConfirm: () => void }) {
    // 默认选中简体中文，并立即以该语言渲染本页，保证高亮与文案一致
    const [selected, setSelected] = useState<Locale>('zh-CN');
    const t = useT();

    useEffect(() => { previewLocale('zh-CN'); }, []);

    // 点选即预览该语言，界面立即跟随
    const handleSelect = (locale: Locale) => {
        setSelected(locale);
        previewLocale(locale);
    };

    const handleConfirm = async () => {
        // 确认时才持久化，然后进入主流程
        await setLocale(selected);
        onConfirm();
    };

    return (
        <div className="setup-screen">
            <div className="setup-card">
                <div className="setup-logo">{Icons.switchLogo}</div>
                <h1 className="setup-title">{t('common.appName')}</h1>
                <p className="setup-subtitle">{t('lang.title')}</p>

                <div className="setup-divider" />

                <div className="lang-list">
                    {LOCALES.map(loc => (
                        <button
                            key={loc}
                            className={`lang-option${selected === loc ? ' selected' : ''}`}
                        onClick={() => handleSelect(loc)}
                        >
                            <span className="lang-native">{LOCALE_META[loc].nativeName}</span>
                            <span className="lang-label">{LOCALE_META[loc].label}</span>
                        </button>
                    ))}
                </div>

                <div className="setup-actions" style={{ marginTop: 'var(--space-xl)' }}>
                <button className="btn btn-primary btn-lg setup-btn" onClick={handleConfirm} autoFocus>
                        {t('lang.confirm')}
                    </button>
                </div>

                <div className="setup-footer">
                    {t('lang.subtitle')}
                </div>
            </div>
        </div>
    );
}

// ============================================================
// App Root
// ============================================================

const PAGES: Record<string, React.FC> = {
    compress: CompressPage,
    decompress: DecompressPage,
    merge: MergePage,
    convert: ConvertPage,
    split: SplitPage,
    dspl: DsplPage,
    create: CreatePage,
    info: InfoPage,
    rename: RenamePage,
    batchmerge: BatchMergePage,
    verify: VerifyPage,
};

async function checkSetupState() {
    const [dir, keys, backend] = await Promise.all([
        api.getToolsDirOrNull(),
        api.hasKeys(),
        api.hasBackend(),
    ]);
    return { dir, keys, backend };
}

export default function App() {
    const [activePage, setActivePage] = useState('compress');
    const [toasts, setToasts] = useState<{ id: number; message: string; type: string }[]>([]);
    const [toolsDir, setToolsDir] = useState<string | null>(null);
    const [hasKeysState, setHasKeys] = useState(false);
    const [hasBackendState, setHasBackend] = useState(false);
    const [loading, setLoading] = useState(true);
    const [appVersion, setAppVersion] = useState('0.0.0');
    const [appUpdate, setAppUpdate] = useState<{ tag: string; url: string } | null>(null);
    // 是否已选择过界面语言：未选择时先显示语言选择页
    const [languageChosen, setLanguageChosen] = useState<boolean | null>(null);

    function applySetupState(state: { dir: string | null; keys: boolean; backend: boolean }) {
        setToolsDir(state.dir);
        setHasKeys(state.keys);
        setHasBackend(state.backend);
    }

    useEffect(() => {
        (async () => {
            await runner.init();
            // 先确定语言，再加载其余状态，保证首屏即为所选语言
            await initI18n();
            setLanguageChosen((await loadSavedLocale()) !== null);
            const ver = await getVersion().catch(() => '0.0.0');
            setAppVersion(ver);
            applySetupState(await checkSetupState());
            setLoading(false);
            api.fetchLatestAppRelease().then(release => {
                if (release && release.tag.replace(/^v/, '') !== ver) {
                    setAppUpdate(release);
                }
            });
        })();
    }, []);

    const addToast = useCallback((message: string, type = 'info') => {
        const id = Date.now();
        setToasts(prev => [...prev, { id, message, type }]);
        setTimeout(() => {
            setToasts(prev => prev.filter(t => t.id !== id));
        }, 4000);
    }, []);
    const t = useT();

    useEffect(() => {
        const unsub = runner.on('nscb-error', (data) => {
            addToast(data.message || String(data), 'error');
        });
        return unsub;
    }, [addToast]);

    const handleSetupComplete = async () => {
        const state = await checkSetupState();
        applySetupState(state);
        if (state.dir) runner.setToolsDir(state.dir);
        addToast(t('common.ready'), 'success');
    };

    const refreshBackendState = async () => {
        const backend = await api.hasBackend();
        setHasBackend(backend);
    };

    if (loading) {
        return (
            <div className="setup-screen">
                <div className="setup-card">
                    <div className="setup-logo loading">{Icons.switchLogo}</div>
                    <h1 className="setup-title">{t('common.loading')}</h1>
                </div>
            </div>
        );
    }

    // 首次启动：尚未选择语言时先让用户选择
    if (languageChosen === false) {
        return <LanguagePickerPage onConfirm={() => setLanguageChosen(true)} />;
    }

    // 纯 Web 预览（无 Tauri 桥）时允许跳过密钥向导，便于检查界面渲染。
    // 正常桌面环境下 __TAURI_INTERNALS__ 始终存在，此分支不会触发。
    const isPureWebPreview = typeof (window as any).__TAURI_INTERNALS__ === 'undefined';

    if ((!toolsDir || !hasKeysState) && !(isPureWebPreview && (window as any).__NSCB_SKIP_WIZARD__)) {
        return (
            <>
                <SetupPage onComplete={handleSetupComplete} appVersion={appVersion} />
                <ToastContainer toasts={toasts} />
            </>
        );
    }

    return (
        <div className="app-shell">
            <Sidebar activePage={activePage} onNavigate={setActivePage} appVersion={appVersion} appUpdate={appUpdate} />
            <main className="main-content">
                {!hasBackendState && (
                    <MissingBackendBanner onGoToSettings={() => setActivePage('settings')} />
                )}
                {Object.entries(PAGES).map(([id, PageComponent]) => (
                    <div key={id} style={{ display: activePage === id ? 'block' : 'none' }}>
                        <PageComponent />
                    </div>
                ))}
                <div style={{ display: activePage === 'settings' ? 'block' : 'none' }}>
                    <SettingsPage onBackendChanged={refreshBackendState} />
                </div>
            </main>
            <ToastContainer toasts={toasts} />
        </div>
    );
}

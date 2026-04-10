import { useState, useCallback, useEffect, useRef } from 'react';
import { getCurrentWebviewWindow } from '@tauri-apps/api/webviewWindow';
import { getVersion } from '@tauri-apps/api/app';
import * as api from './lib/api';
import { getRunner } from './lib/nscb-runner';

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

function levelLabel(level: number): string {
    if (level <= 8) return 'Fast';
    if (level <= 14) return 'Normal';
    if (level <= 18) return 'Great';
    return 'Ultra';
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
                        message: data.code === 0 ? 'Completed successfully!' : `Completed with exit code: ${data.code}`,
                    });
                }
            }),
            runner.on('nscb-error', (data) => {
                if (matchesOp(data)) {
                    setOutputLines(prev => [...prev, `ERROR: ${data.message}`]);
                }
            }),
        ];
        return () => unsubs.forEach(fn => fn());
    }, [opsKey]);

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
    { id: 'compress', icon: Icons.compress, label: 'Compress' },
    { id: 'decompress', icon: Icons.decompress, label: 'Decompress' },
    { id: 'merge', icon: Icons.merge, label: 'Merge' },
    { id: 'convert', icon: Icons.convert, label: 'Convert' },
    { id: 'split', icon: Icons.split, label: 'Split' },
    { id: 'dspl', icon: Icons.dspl, label: 'Split to Files' },
    { id: 'create', icon: Icons.create, label: 'Create/Repack' },
    { id: 'info', icon: Icons.info, label: 'Info' },
    { id: 'rename', icon: Icons.rename, label: 'Rename' },
    { id: 'batchmerge', icon: Icons.batchMerge, label: 'Batch Merge' },
    { id: 'verify', icon: Icons.verify, label: 'Verify' },
    { id: 'settings', icon: Icons.settings, label: 'Settings' },
];

function Sidebar({ activePage, onNavigate, appVersion, appUpdate }: { activePage: string; onNavigate: (id: string) => void; appVersion: string; appUpdate?: { tag: string; url: string } | null }) {
    return (
        <div className="sidebar">
            <div className="sidebar-brand">
                <div className="brand-logo">{Icons.switchLogo}</div>
                <div className="brand-text">
                    <h1>NSCB Desktop</h1>
                    <span>v{appVersion}{appUpdate && <>{' | '}<button className="update-link" onClick={() => api.openExternal(appUpdate.url)}>{appUpdate.tag} available</button></>}</span>
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
                        <span className="nav-label">{p.label}</span>
                    </div>
                ))}
            </nav>
            <div className="sidebar-footer">
                <span className="footer-dot" />
                nscb_rust Backend
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

    useEffect(() => {
        const appWindow = getCurrentWebviewWindow();
        const unlisten = appWindow.onDragDropEvent((event) => {
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
        return () => { unlisten.then(fn => fn()); };
    }, [onFiles]);

    const handleClick = useCallback(async () => {
        const filters = accept ? [{ name: 'Files', extensions: accept }] : undefined;
        const files = await api.selectFiles(filters);
        if (files.length > 0) onFiles(files);
    }, [onFiles, accept]);

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
                Drop {allowFolders ? 'files/folders' : 'files'} here or <span className="drop-zone-link">browse</span>
                {allowFolders && <>{' or '}<span className="drop-zone-link" onClick={handleBrowseFolder}>browse folder</span></>}
            </div>
            <div className="drop-zone-hint">
                {hint || 'Supports NSP, XCI, NSZ, XCZ, NCZ files'}
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

    return (
        <div className="file-list">
            <div className="file-list-header">
                <span className="file-list-count">{files.length} file{files.length !== 1 ? 's' : ''} selected</span>
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
                        title="Remove file"
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
                <span className="progress-message">{progress.message || 'Waiting...'}</span>
                <span className={`progress-percent ${isComplete ? 'complete' : ''}`}>
                    {(progress.percent || 0).toFixed(1)}%
                </span>
            </div>
            {outputLines.length > 0 && (
                <div className="output-console" ref={consoleRef}>
                    {outputLines.map((line, i) => (
                        <div key={i} className={`output-line ${getOutputLineClass(line)}`}>
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
    return (
        <div className="dir-picker">
            <label className="dir-picker-label">{Icons.folder} Output Directory</label>
            <div className="dir-picker-row">
                <input
                    type="text"
                    value={outputDir}
                    onChange={(e) => setOutputDir(e.target.value)}
                    placeholder="Default: same as source file"
                />
                <button className="btn btn-secondary btn-sm" onClick={selectOutputDir}>
                    Browse
                </button>
            </div>
        </div>
    );
}

function ActionBar({ running, onCancel, onClear, onStart, startLabel, startDisabled }: {
    running: boolean;
    onCancel: () => void;
    onClear: () => void;
    onStart: () => void;
    startLabel: string;
    startDisabled?: boolean;
}) {
    return (
        <div className="actions-bar">
            <span className="spacer" />
            {running ? (
                <button className="btn btn-danger" onClick={onCancel}>
                    {Icons.stop} Cancel
                </button>
            ) : (
                <>
                    <button className="btn btn-ghost" onClick={onClear}>
                        {Icons.trash} Clear All
                    </button>
                    <button
                        className="btn btn-primary btn-lg"
                        onClick={onStart}
                        disabled={startDisabled}
                    >
                        {Icons.play} {startLabel}
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
    title: string;
    subtitle: string;
    accept: string[];
    hint: string;
    startLabel: string;
    startMessage: string;
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
        setProgress({ ...EMPTY_PROGRESS, message: config.startMessage });
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
        setProgress({ ...EMPTY_PROGRESS, message: 'Cancelled' });
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
                    <h2>{config.title}</h2>
                    <p>{config.subtitle}</p>
                </div>
            </div>

            <DropZone onFiles={addFiles} accept={config.accept} hint={config.hint} />
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
                        startLabel={config.startLabel}
                        startDisabled={files.length < minFiles}
                    />
                </>
            )}
        </div>
    );
}

function CompressOptions({ options, setOption }: { options: Record<string, any>; setOption: (k: string, v: any) => void }) {
    const level = options.level ?? 18;
    return (
        <div className="card">
            <div className="card-header">
                <span className="card-title">Compression Options</span>
            </div>
            <div className="options-panel">
                <div className="option-group">
                    <label className="option-label">Compression Level</label>
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
                    <span className={`level-badge level-${levelLabel(level).toLowerCase()}`}>
                        {levelLabel(level)}
                    </span>
                </div>
            </div>
        </div>
    );
}

function FormatOptions({ options, setOption, title, descriptions }: {
    options: Record<string, any>;
    setOption: (k: string, v: any) => void;
    title: string;
    descriptions: { xci: string; nsp: string };
}) {
    const format = options.format ?? 'xci';
    return (
        <div className="card">
            <div className="card-header">
                <span className="card-title">{title}</span>
            </div>
            <div className="options-panel">
                <div className="option-group">
                    <label className="option-label">Output Format</label>
                    <select value={format} onChange={(e) => setOption('format', e.target.value)}>
                        <option value="xci">XCI (Game Cartridge)</option>
                        <option value="nsp">NSP (eShop Package)</option>
                    </select>
                    <span className="option-description">
                        {format === 'xci' ? descriptions.xci : descriptions.nsp}
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
    title: 'Compress',
    subtitle: 'Compress NSP/XCI files to NSZ/XCZ format',
    accept: ['nsp', 'xci'],
    hint: 'Drop NSP or XCI files to compress',
    startLabel: 'Start Compression',
    startMessage: 'Starting compression...',
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
    title: 'Decompress',
    subtitle: 'Decompress NSZ/XCZ/NCZ files back to NSP/XCI format',
    accept: ['nsz', 'xcz', 'ncz'],
    hint: 'Drop NSZ, XCZ, or NCZ files to decompress',
    startLabel: 'Start Decompression',
    startMessage: 'Starting decompression...',
};

// Merge page is a custom component (not config-driven) — see MergePage below.

const CONVERT_CONFIG: OperationPageConfig = {
    op: 'convert',
    icon: Icons.convert,
    accent: 'convert',
    title: 'Convert',
    subtitle: 'Convert between NSP and XCI formats',
    accept: ['nsp', 'xci'],
    hint: 'Drop NSP or XCI files to convert',
    startLabel: 'Start Conversion',
    startMessage: 'Starting conversion...',
    renderOptions: (state) => (
        <FormatOptions
            options={state.options}
            setOption={state.setOption}
            title="Convert Options"
            descriptions={{ xci: 'Convert NSP \u2192 XCI', nsp: 'Convert XCI \u2192 NSP' }}
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
    title: 'Split',
    subtitle: 'Split multi-title files into per-title NCA folders',
    accept: ['nsp', 'xci'],
    hint: 'Drop NSP or XCI files to split into per-title NCA folders',
    startLabel: 'Start Split',
    startMessage: 'Starting split...',
};

const DSPL_CONFIG: OperationPageConfig = {
    op: 'dspl',
    icon: Icons.dspl,
    accent: 'dspl',
    title: 'Split to Files',
    subtitle: 'Split multi-title files into individual NSP/XCI files',
    accept: ['nsp', 'xci'],
    hint: 'Drop NSP or XCI files to split into individual titles',
    startLabel: 'Start Split',
    startMessage: 'Starting split to files...',
    renderOptions: (state) => (
        <FormatOptions
            options={state.options}
            setOption={state.setOption}
            title="Split Options"
            descriptions={{ xci: 'Output individual XCI files', nsp: 'Output individual NSP files' }}
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

    // Output dir defaults to first file's directory
    useEffect(() => {
        setOutputDir(files.length > 0 ? getDirectory(files[0]) : '');
    }, [files]);

    const canStart = files.length >= 1;

    const handleStart = async () => {
        if (!canStart) return;
        setRunning(true);
        setProgress({ ...EMPTY_PROGRESS, message: 'Starting merge...' });
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
        setProgress({ ...EMPTY_PROGRESS, message: 'Cancelled' });
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
                    <h2>Merge</h2>
                    <p>Merge, downgrade, or repack Switch files into a single output</p>
                </div>
            </div>

            <div className="card">
                <div className="card-header">
                    <span className="card-title">Input Files</span>
                </div>
                <div style={{ padding: '12px' }}>
                    <DropZone onFiles={addFiles} accept={['xci', 'nsp', 'nsz', 'xcz']} hint="Drop base game, update, and DLC files" />
                    <FileList files={files} onRemove={removeFile} />
                </div>
            </div>

            {files.length > 0 && (
                <>
                    <div className="card">
                        <div className="card-header">
                            <span className="card-title">Merge Options</span>
                        </div>
                        <div className="options-panel">
                            <div className="option-group">
                                <label className="option-label">Output Format</label>
                                <select value={format} onChange={(e) => setFormat(e.target.value)}>
                                    <option value="xci">XCI (Game Cartridge)</option>
                                    <option value="nsp">NSP (eShop Package)</option>
                                </select>
                                <span className="option-description">
                                    {format === 'xci' ? 'Single XCI with all content' : 'Single NSP with all content'}
                                </span>
                            </div>
                            <div className="option-group">
                                <Toggle checked={nodelta} onChange={setNodelta} label="Exclude Delta Fragments" />
                                <span className="option-description">Skip delta NCA fragments during merge</span>
                            </div>
                            <div className="option-group">
                                <Toggle checked={pv} onChange={setPv} label="Show Firmware Info" />
                                <span className="option-description">Print before/after firmware version info during merge</span>
                            </div>
                            <div className="option-group">
                                <label className="option-label">RSV Cap</label>
                                <input
                                    type="text"
                                    value={rsvcap}
                                    onChange={(e) => setRsvcap(e.target.value)}
                                    placeholder="Optional — caps RequiredSystemVersion"
                                />
                                <span className="option-description">Cap the RequiredSystemVersion to a specific value</span>
                            </div>
                            <div className="option-group">
                                <label className="option-label">Key Generation Patch</label>
                                <input
                                    type="text"
                                    value={keypatch}
                                    onChange={(e) => setKeypatch(e.target.value)}
                                    placeholder="Optional — lowers NCA key generation"
                                />
                                <span className="option-description">Lower NCA key generation to a specific value</span>
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
                        startLabel="Start Merge"
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

    const handleStart = async () => {
        if (files.length === 0) return;
        setRunning(true);
        setProgress({ ...EMPTY_PROGRESS, message: 'Fetching info...' });
        setOutputLines([]);
        await runner.run('info', files, { mode });
    };

    const handleCancel = async () => {
        await runner.cancel();
        setRunning(false);
        setProgress({ ...EMPTY_PROGRESS, message: 'Cancelled' });
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
                    <h2>Info</h2>
                    <p>View content details or metadata summary of NSP/XCI files</p>
                </div>
            </div>

            <DropZone onFiles={addFiles} accept={['nsp', 'xci', 'nsz', 'xcz']} hint="Drop NSP, XCI, NSZ, or XCZ files to inspect" />
            <FileList files={files} onRemove={removeFile} />

            {files.length > 0 && (
                <>
                    <div className="card">
                        <div className="card-header">
                            <span className="card-title">Info Mode</span>
                        </div>
                        <div className="options-panel">
                            <div className="option-group">
                                <label className="option-label">Output Type</label>
                                <select value={mode} onChange={(e) => setMode(e.target.value as 'contentlist' | 'filelist')}>
                                    <option value="contentlist">Content Details</option>
                                    <option value="filelist">Metadata Summary</option>
                                </select>
                                <span className="option-description">
                                    {mode === 'contentlist' ? 'Detailed content listing with title IDs and versions' : 'File-level metadata summary'}
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
                        startLabel="Get Info"
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
    const [nutdbTitleId, setNutdbTitleId] = useState('');
    const [proxy, setProxy] = useState('');
    const [nutdbUrl, setNutdbUrl] = useState('');

    useEffect(() => {
        api.getSetting('proxy').then(setProxy);
        api.getSetting('nutdbUrl').then(setNutdbUrl);
    }, []);

    const handleStart = async () => {
        if (files.length === 0) return;
        setRunning(true);
        setProgress({ ...EMPTY_PROGRESS, message: 'Renaming files...' });
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
        setProgress({ ...EMPTY_PROGRESS, message: 'Refreshing NUTDB cache...' });
        setOutputLines([]);
        const baseUrl = nutdbUrl || 'https://raw.githubusercontent.com/blawar/titledb/master/US.en.json';
        const finalUrl = proxy ? proxy + baseUrl : baseUrl;
        await runner.run('nutdb-refresh', [], { nutdbUrl: finalUrl });
    };

    const handleNutdbLookup = async () => {
        if (!nutdbTitleId.trim()) return;
        setRunning(true);
        setProgress({ ...EMPTY_PROGRESS, message: `Looking up ${nutdbTitleId}...` });
        setOutputLines([]);
        await runner.run('nutdb-lookup', [], { titleId: nutdbTitleId.trim() });
    };

    const handleCancel = async () => {
        await runner.cancel();
        setRunning(false);
        setProgress({ ...EMPTY_PROGRESS, message: 'Cancelled' });
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
                    <h2>Rename</h2>
                    <p>Rename Switch files using metadata and NUTDB lookup</p>
                </div>
            </div>

            <div className="card">
                <div className="card-header">
                    <span className="card-title">Input Files / Folders</span>
                </div>
                <div style={{ padding: '12px' }}>
                    <DropZone onFiles={addFiles} accept={['nsp', 'nsx', 'nsz', 'xci', 'xcz']} hint="Drop files or folders to rename" allowFolders />
                    <FileList files={files} onRemove={removeFile} />
                </div>
            </div>

            <div className="card">
                <div className="card-header">
                    <span className="card-title">Rename Options</span>
                </div>
                <div className="options-panel">
                    <div className="option-group">
                        <label className="option-label">Rename Mode</label>
                        <select value={renmode} onChange={(e) => setRenmode(e.target.value)}>
                            <option value="force">Force</option>
                            <option value="skip_corr_tid">Skip Correct TID</option>
                            <option value="skip_if_tid">Skip If TID</option>
                        </select>
                        <span className="option-description">
                            {renmode === 'force' ? 'Always rename files' : renmode === 'skip_corr_tid' ? 'Skip files with correct title ID in name' : 'Skip files that already contain a title ID'}
                        </span>
                    </div>
                    <div className="option-group">
                        <label className="option-label">Add Language</label>
                        <select value={addlangue} onChange={(e) => setAddlangue(e.target.value)}>
                            <option value="false">No</option>
                            <option value="true">Yes</option>
                        </select>
                        <span className="option-description">Include language information in filename</span>
                    </div>
                    <div className="option-group">
                        <label className="option-label">Version Handling</label>
                        <select value={noversion} onChange={(e) => setNoversion(e.target.value)}>
                            <option value="false">Include version</option>
                            <option value="true">Exclude version</option>
                            <option value="xci_no_v0">Exclude v0 for XCI</option>
                        </select>
                        <span className="option-description">
                            {noversion === 'false' ? 'Include version number in filename' : noversion === 'true' ? 'Omit version number from filename' : 'Omit v0 for XCI files only'}
                        </span>
                    </div>
                    <div className="option-group">
                        <label className="option-label">DLC Rename</label>
                        <select value={dlcrname} onChange={(e) => setDlcrname(e.target.value)}>
                            <option value="false">No</option>
                            <option value="true">Yes</option>
                            <option value="tag">Tag only</option>
                        </select>
                        <span className="option-description">
                            {dlcrname === 'false' ? 'Do not rename DLC files' : dlcrname === 'true' ? 'Rename DLC files with full name' : 'Append DLC tag to filename'}
                        </span>
                    </div>
                </div>
            </div>

            <div className="card">
                <div className="card-header">
                    <span className="card-title">NUTDB Utilities</span>
                </div>
                <div className="options-panel">
                    <div className="option-group">
                        <button className="btn btn-secondary" onClick={handleNutdbRefresh} disabled={running}>
                            Refresh NUTDB Cache
                        </button>
                        <span className="option-description">Update the local NUTDB title database cache</span>
                    </div>
                    <div className="option-group">
                        <label className="option-label">Title ID Lookup</label>
                        <div style={{ display: 'flex', gap: '8px' }}>
                            <input
                                type="text"
                                value={nutdbTitleId}
                                onChange={(e) => setNutdbTitleId(e.target.value)}
                                placeholder="e.g. 0100F8F0000A2000"
                                style={{ flex: 1 }}
                            />
                            <button className="btn btn-secondary" onClick={handleNutdbLookup} disabled={running || !nutdbTitleId.trim()}>
                                Lookup
                            </button>
                        </div>
                        <span className="option-description">Look up a title ID in the NUTDB database</span>
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
                startLabel="Start Rename"
                startDisabled={files.length === 0}
            />
        </div>
    );
}

function CreatePage() {
    const { running, progress, outputLines, setRunning, setProgress, setOutputLines } = useRunnerEvents('create');
    const { outputDir, setOutputDir, selectOutputDir } = useOutputDir();
    const [inputFolder, setInputFolder] = useState('');

    const handleSelectFolder = useCallback(async () => {
        const dir = await api.selectOutputDir();
        if (dir) setInputFolder(dir);
    }, []);

    const handleStart = async () => {
        if (!inputFolder) return;
        setRunning(true);
        setProgress({ ...EMPTY_PROGRESS, message: 'Starting repack...' });
        setOutputLines([]);
        await runner.run('create', [inputFolder], {
            output: outputDir || undefined,
        });
    };

    const handleCancel = async () => {
        await runner.cancel();
        setRunning(false);
        setProgress({ ...EMPTY_PROGRESS, message: 'Cancelled' });
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
                    <h2>Create / Repack</h2>
                    <p>Repack a split NCA folder back into an NSP file</p>
                </div>
            </div>

            <div className="card">
                <div className="card-header">
                    <span className="card-title">Input Folder</span>
                </div>
                <div className="options-panel">
                    <div className="option-group" style={{ gridColumn: '1 / -1' }}>
                        <label className="option-label">NCA Source Folder</label>
                        <div className="dir-picker-row">
                            <input
                                type="text"
                                value={inputFolder}
                                onChange={(e) => setInputFolder(e.target.value)}
                                placeholder="Select the folder produced by Split..."
                            />
                            <button className="btn btn-secondary btn-sm" onClick={handleSelectFolder}>
                                Browse
                            </button>
                        </div>
                        {inputFolder && (
                            <span className="option-description">
                                Output: <code>{getFolderName(inputFolder)}.nsp</code>
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
                        startLabel="Start Repack"
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

    useEffect(() => {
        api.getInstalledVersion().then(setBackendVersion);
        api.hasKeys().then(setKeysInstalled);
        api.getSetting('proxy').then(setProxy);
        api.getSetting('nutdbUrl').then(setNutdbUrl);
    }, []);

    const handleCheckUpdate = async () => {
        setCheckingUpdate(true);
        setUpdateStatus(null);
        try {
            const release = await api.fetchLatestRelease();
            const backendExists = await api.hasBackend();
            if (!release) {
                setUpdateStatus('Could not reach GitHub. Check your network connection.');
            } else if (backendExists && backendVersion && release.tag === backendVersion) {
                setUpdateStatus(`Already up to date (${backendVersion})`);
            } else {
                setUpdateStatus(`Downloading ${release.tag}...`);
                await api.downloadBackend(release.downloadUrl);
                await api.saveInstalledVersion(release.tag);
                setBackendVersion(release.tag);
                setUpdateStatus(`Updated to ${release.tag}`);
                onBackendChanged?.();
            }
        } catch (e: any) {
            setUpdateStatus(`Update failed: ${e.message || e}`);
        } finally {
            setCheckingUpdate(false);
        }
    };

    const handleImportBackend = async () => {
        const result = await api.importBackend();
        if (result.ok) {
            setBackendVersion(null);
            await api.saveInstalledVersion('');
            setUpdateStatus('Backend imported manually');
            onBackendChanged?.();
        } else if (result.error) {
            setUpdateStatus(result.error);
        }
    };

    const handleImportKeys = async () => {
        const result = await api.importKeys();
        if (result.ok) setKeysInstalled(true);
    };

    return (
        <div className="page">
            <div className="page-header">
                <div className="page-icon accent-settings">{Icons.settings}</div>
                <div>
                    <h2>Settings</h2>
                    <p>Manage backend binary and encryption keys</p>
                </div>
            </div>

            <div className="settings-grid">
                <div className="settings-section">
                    <h3 className="settings-section-title">Tools</h3>

                    <div className="settings-row">
                        <div className="settings-row-label">
                            <h4>Backend Binary (nscb_rust)</h4>
                            <p>{backendVersion ? `Installed: ${backendVersion}` : 'Unknown version (manually imported)'}</p>
                        </div>
                        <div className="settings-row-control">
                            <div style={{ display: 'flex', gap: '8px' }}>
                                <button
                                    className="btn btn-secondary btn-sm"
                                    onClick={handleCheckUpdate}
                                    disabled={checkingUpdate}
                                >
                                    {checkingUpdate ? 'Checking...' : 'Check for Update'}
                                </button>
                                <button className="btn btn-ghost btn-sm" onClick={handleImportBackend}>
                                    Import Manually
                                </button>
                            </div>
                            {updateStatus && (
                                <p style={{ marginTop: '6px', fontSize: '12px', color: 'var(--text-muted)' }}>{updateStatus}</p>
                            )}
                        </div>
                    </div>

                    <div className="settings-row">
                        <div className="settings-row-label">
                            <h4>Encryption Keys</h4>
                            <p>{keysInstalled ? 'Keys installed' : 'No keys found'}</p>
                        </div>
                        <div className="settings-row-control">
                            <button className="btn btn-secondary btn-sm" onClick={handleImportKeys}>
                                {Icons.key} Import Keys
                            </button>
                        </div>
                    </div>
                </div>

                <div className="settings-section">
                    <h3 className="settings-section-title">Network</h3>

                    <div className="settings-row">
                        <div className="settings-row-label">
                            <h4>Proxy Prefix</h4>
                            <p>URL prefix for proxying GitHub downloads (e.g. https://gh-proxy.org/)</p>
                        </div>
                        <div className="settings-row-control">
                            <input
                                type="text"
                                className="input"
                                placeholder="https://gh-proxy.org/"
                                value={proxy}
                                onChange={(e) => setProxy(e.target.value)}
                                onBlur={() => api.saveSetting('proxy', proxy.trim())}
                            />
                        </div>
                    </div>

                    <div className="settings-row">
                        <div className="settings-row-label">
                            <h4>NUTDB Source URL</h4>
                            <p>Override the default NUTDB title database URL</p>
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
                <h1 className="setup-title">NSCB Desktop</h1>
                <p className="setup-subtitle">
                    One-time setup: import encryption keys
                </p>

                <div className="setup-divider" />

                <div className="setup-checklist">
                    <div className="setup-check-item">
                        <span className="setup-check-icon">
                            {Icons.key}
                        </span>
                        <span>Encryption keys (<code>prod.keys</code>)</span>
                    </div>
                </div>

                <div className="setup-actions">
                    <button
                        className="btn btn-primary btn-lg setup-btn"
                        onClick={handleImportKeys}
                        disabled={checking}
                    >
                        {checking ? 'Importing...' : <>{Icons.key} Import Keys File</>}
                    </button>
                </div>

                {error && (
                    <div className="setup-error">
                        {Icons.alertCircle} {error}
                    </div>
                )}

                <div className="setup-footer">
                    NSCB Desktop v{appVersion}
                </div>
            </div>
        </div>
    );
}

function VerifyPage() {
    const { files, addFiles, removeFile, clearFiles } = useFileList();
    const { running, progress, outputLines, setRunning, setProgress, setOutputLines } = useRunnerEvents('verify');
    const [vertype, setVertype] = useState('lv1');

    const handleStart = async () => {
        if (files.length === 0) return;
        setRunning(true);
        setProgress({ ...EMPTY_PROGRESS, message: 'Verifying...' });
        setOutputLines([]);
        await runner.run('verify', files, { vertype });
    };

    const handleCancel = async () => {
        await runner.cancel();
        setRunning(false);
        setProgress({ ...EMPTY_PROGRESS, message: 'Cancelled' });
    };

    const handleClear = () => {
        clearFiles();
        setOutputLines([]);
        setProgress(EMPTY_PROGRESS);
    };

    const vertypeDescriptions: Record<string, string> = {
        lv1: 'Decryption test only — checks that NCA content can be decrypted with current keys',
        lv2: 'Signature verification — validates NCA signatures',
        lv3: 'Full verification — decryption + signature + hash check',
    };

    return (
        <div className="page">
            <div className="page-header">
                <div className="page-icon accent-verify">{Icons.verify}</div>
                <div>
                    <h2>Verify</h2>
                    <p>Verify integrity of NSP/XCI/NSZ/XCZ container files</p>
                </div>
            </div>

            <DropZone onFiles={addFiles} accept={['nsp', 'nsx', 'nsz', 'xci', 'xcz']} hint="Drop NSP, NSX, NSZ, XCI, or XCZ files to verify" />
            <FileList files={files} onRemove={removeFile} />

            {files.length > 0 && (
                <>
                    <div className="card">
                        <div className="card-header">
                            <span className="card-title">Verification Level</span>
                        </div>
                        <div className="options-panel">
                            <div className="option-group">
                                <label className="option-label">Mode</label>
                                <select value={vertype} onChange={(e) => setVertype(e.target.value)}>
                                    <option value="lv1">Decryption (lv1)</option>
                                    <option value="lv2">Signature (lv2)</option>
                                    <option value="lv3">Full (lv3)</option>
                                </select>
                                <span className="option-description">{vertypeDescriptions[vertype]}</span>
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
                        startLabel="Verify"
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
            setProgress({ ...EMPTY_PROGRESS, message: `Merging: ${game.name}` });
            setGames(prev => prev.map((g, idx) => idx === i ? { ...g, status: 'running', message: undefined } : g));

            const beforeFiles = await listOutputFileNames();
            const result = await runCurrentGame(game.files, {
                output: outputDir,
                format,
                nodelta: nodelta || undefined,
            });

            if (result === 'cancelled') {
                setGames(prev => prev.map((g, idx) => idx === i ? { ...g, status: 'pending', message: 'Cancelled' } : g));
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
                    ? { ...g, status: 'error', outputFile: renamedFile, message: 'Merge failed' }
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
            setProgress({ percent: 100, message: 'Batch merge complete!' });
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
        setProgress({ ...EMPTY_PROGRESS, message: 'Cancelled' });
    };

    const handleToggleGame = (idx: number) => {
        if (running) return;
        setGames(prev => prev.map((g, i) => {
            if (i !== idx) return g;
            if (g.status === 'pending') return { ...g, status: 'skipped', message: 'Manually skipped' };
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
                    <h2>Batch Merge</h2>
                    <p>Auto-merge all games in a folder, skipping already-merged titles</p>
                </div>
            </div>

            <div className="card">
                <div className="card-header">
                    <span className="card-title">Folders</span>
                </div>
                <div className="options-panel">
                    <div className="option-group">
                        <label className="option-label">Base Folder</label>
                        <div className="dir-picker-row">
                            <input
                                type="text"
                                value={baseFolder}
                                onChange={e => setBaseFolder(e.target.value)}
                                placeholder="Folder containing game subfolders..."
                                readOnly={running}
                            />
                            <button className="btn btn-secondary btn-sm" onClick={handleSelectBaseFolder} disabled={running}>Browse</button>
                        </div>
                        <span className="option-description">Each subfolder is treated as one game (base + updates + DLC)</span>
                    </div>
                    <div className="option-group">
                        <label className="option-label">
                            Output Folder <span className="required-star">*</span>
                        </label>
                        <div className="dir-picker-row">
                            <input
                                type="text"
                                value={outputDir}
                                onChange={e => setOutputDir(e.target.value)}
                                placeholder="Required — all merged outputs go here"
                                readOnly={running}
                            />
                            <button className="btn btn-secondary btn-sm" onClick={handleSelectOutputDir} disabled={running}>Browse</button>
                        </div>
                        <span className="option-description">Merged files are saved here. Existing outputs are checked to skip already-merged games.</span>
                    </div>
                </div>
            </div>

            <div className="card">
                <div className="card-header">
                    <span className="card-title">Merge Options</span>
                </div>
                <div className="options-panel">
                    <div className="option-group">
                        <label className="option-label">Output Format</label>
                        <select value={format} onChange={e => setFormat(e.target.value)} disabled={running}>
                            <option value="xci">XCI (Game Cartridge)</option>
                            <option value="nsp">NSP (eShop Package)</option>
                        </select>
                    </div>
                    <div className="option-group">
                        <Toggle checked={nodelta} onChange={setNodelta} label="Exclude Delta Fragments" />
                        <span className="option-description">Skip delta NCA fragments during merge</span>
                    </div>
                </div>
            </div>

            <div className="batch-scan-row">
                <button
                    className="btn btn-secondary"
                    onClick={handleScan}
                    disabled={!baseFolder || !outputDir || scanning || running}
                >
                    {scanning ? 'Scanning...' : 'Scan Folder'}
                </button>
                {games.length > 0 && (
                    <span className="batch-summary">
                        {games.length} game{games.length !== 1 ? 's' : ''} found
                        {' · '}{pendingCount} to merge
                        {skippedCount > 0 && ` · ${skippedCount} already merged`}
                        {doneCount > 0 && ` · ${doneCount} done`}
                        {errorCount > 0 && ` · ${errorCount} failed`}
                    </span>
                )}
            </div>

            {games.length > 0 && (
                <div className="card">
                    <div className="card-header">
                        <span className="card-title">Discovered Games</span>
                        <span style={{ fontSize: 'var(--font-size-xs)', color: 'var(--text-muted)' }}>{games.length} found</span>
                    </div>
                    <div className="batch-game-list">
                        {games.map((game, i) => {
                            const toggleable = !running && (game.status === 'pending' || game.status === 'skipped');
                            return (
                            <div
                                key={game.path}
                                className={`batch-game-row status-${game.status}${i === currentIdx ? ' current' : ''}${toggleable ? ' toggleable' : ''}`}
                                onClick={toggleable ? () => handleToggleGame(i) : undefined}
                                title={toggleable ? (game.status === 'pending' ? 'Click to skip' : 'Click to include') : undefined}
                            >
                                <span className={`batch-status-badge status-${game.status}`}>
                                    {game.status === 'pending' ? 'Pending'
                                        : game.status === 'skipped' ? 'Skipped'
                                        : game.status === 'running' ? 'Running…'
                                        : game.status === 'done' ? 'Done'
                                        : 'Error'}
                                </span>
                                <div className="batch-game-info">
                                    <span className="batch-game-name">{game.name}</span>
                                    {game.outputFile && <span className="batch-game-output">{game.outputFile}</span>}
                                    {game.message && !game.outputFile && <span className="batch-game-message">{game.message}</span>}
                                </div>
                                <span className="batch-game-count">{game.files.length} file{game.files.length !== 1 ? 's' : ''}</span>
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
                    startLabel={`Start Batch Merge (${pendingCount})`}
                    startDisabled={!outputDir || pendingCount === 0}
                />
            )}
        </div>
    );
}

function MissingBackendBanner({ onGoToSettings }: { onGoToSettings: () => void }) {
    return (
        <div className="missing-backend-banner">
            {Icons.alertCircle}
            <span><strong>nscb_rust backend</strong> is missing. Go to Settings &gt; Tools to download or import it.</span>
            <button className="btn btn-secondary btn-sm" onClick={onGoToSettings}>
                Open Settings
            </button>
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

    function applySetupState(state: { dir: string | null; keys: boolean; backend: boolean }) {
        setToolsDir(state.dir);
        setHasKeys(state.keys);
        setHasBackend(state.backend);
    }

    useEffect(() => {
        (async () => {
            await runner.init();
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
        addToast('Ready to go!', 'success');
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
                    <h1 className="setup-title">Loading...</h1>
                </div>
            </div>
        );
    }

    if (!toolsDir || !hasKeysState) {
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

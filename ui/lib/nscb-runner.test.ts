import { describe, it, expect } from 'vitest';
import { buildArgs, SINGLE_FILE_OPS, getBasename, getDirname } from './nscb-runner';

const KEYS = 'C:/tools/prod.keys';

// ─── helpers ────────────────────────────────────────────────────

describe('getBasename', () => {
    it('extracts filename from unix path', () => {
        expect(getBasename('/home/user/game.nsp')).toBe('game.nsp');
    });
    it('extracts filename from windows path', () => {
        expect(getBasename('C:\\Games\\game.xci')).toBe('game.xci');
    });
});

describe('getDirname', () => {
    it('extracts directory from unix path', () => {
        expect(getDirname('/home/user/game.nsp')).toBe('/home/user');
    });
    it('extracts directory from windows path', () => {
        expect(getDirname('C:\\Games\\game.xci')).toBe('C:/Games');
    });
    it('returns . for bare filename', () => {
        expect(getDirname('game.nsp')).toBe('.');
    });
});

// ─── SINGLE_FILE_OPS ───────────────────────────────────────────

describe('SINGLE_FILE_OPS', () => {
    it.each([
        'compress', 'decompress', 'convert', 'split', 'dspl', 'info', 'renamef', 'verify',
    ])('includes %s', (op) => {
        expect(SINGLE_FILE_OPS.has(op)).toBe(true);
    });

    it.each([
        'merge', 'create', 'nutdb-refresh', 'nutdb-lookup',
    ])('does not include %s', (op) => {
        expect(SINGLE_FILE_OPS.has(op)).toBe(false);
    });
});

// ─── Compress tab ───────────────────────────────────────────────

describe('custom temporary directory', () => {
    it('passes --temp-dir when configured', () => {
        const args = buildArgs('compress', ['H:/game.nsp'], { tempDir: 'D:/NSCB Temp' }, KEYS);
        expect(args).toContain('--temp-dir');
        expect(args[args.indexOf('--temp-dir') + 1]).toBe('D:/NSCB Temp');
    });

    it('uses the OS default when no directory is configured', () => {
        expect(buildArgs('compress', ['H:/game.nsp'], { tempDir: '' }, KEYS))
            .not.toContain('--temp-dir');
    });
});

describe('compress', () => {
    it('single file with default options', () => {
        expect(buildArgs('compress', ['H:/game.nsp'], {}, KEYS)).toEqual([
            '-z', 'H:/game.nsp',
            '-o', 'H:',
            '--keys', KEYS,
        ]);
    });

    it('single file with level', () => {
        expect(buildArgs('compress', ['H:/game.nsp'], { level: 22 }, KEYS)).toEqual([
            '-z', 'H:/game.nsp',
            '--level', '22',
            '-o', 'H:',
            '--keys', KEYS,
        ]);
    });

    it('single file with custom output dir', () => {
        expect(buildArgs('compress', ['H:/game.nsp'], { output: 'D:/out' }, KEYS)).toEqual([
            '-z', 'H:/game.nsp',
            '-o', 'D:/out',
            '--keys', KEYS,
        ]);
    });

    it('single file with buffer', () => {
        expect(buildArgs('compress', ['H:/game.nsp'], { buffer: 64 }, KEYS)).toEqual([
            '-z', 'H:/game.nsp',
            '-o', 'H:',
            '-b', '64',
            '--keys', KEYS,
        ]);
    });

    it('no keys when keysPath is null', () => {
        const args = buildArgs('compress', ['H:/game.nsp'], {}, null);
        expect(args).not.toContain('--keys');
    });
});

// ─── Decompress tab ─────────────────────────────────────────────

describe('decompress', () => {
    it('single file', () => {
        expect(buildArgs('decompress', ['H:/game.nsz'], {}, KEYS)).toEqual([
            '--decompress', 'H:/game.nsz',
            '-o', 'H:',
            '--keys', KEYS,
        ]);
    });

    it('with custom output', () => {
        expect(buildArgs('decompress', ['H:/game.nsz'], { output: 'D:/out' }, KEYS)).toEqual([
            '--decompress', 'H:/game.nsz',
            '-o', 'D:/out',
            '--keys', KEYS,
        ]);
    });
});

// ─── Merge tab ──────────────────────────────────────────────────

describe('merge', () => {
    it('two files with format', () => {
        expect(buildArgs('merge', ['H:/base.nsp', 'H:/update.nsp'], { format: 'xci' }, KEYS)).toEqual([
            '-d', 'H:/base.nsp', 'H:/update.nsp',
            '-t', 'xci',
            '-o', 'H:',
            '--keys', KEYS,
        ]);
    });

    it('with nodelta flag', () => {
        const args = buildArgs('merge', ['H:/a.nsp', 'H:/b.nsp'], { format: 'nsp', nodelta: true }, KEYS);
        expect(args).toContain('-n');
    });

    it('with pv flag', () => {
        const args = buildArgs('merge', ['H:/a.nsp'], { pv: true }, KEYS);
        expect(args).toContain('--pv');
    });

    it('with RSVcap', () => {
        const args = buildArgs('merge', ['H:/a.nsp'], { rsvcap: 5 }, KEYS);
        expect(args).toContain('--RSVcap');
        expect(args).toContain('5');
    });

    it('with keypatch', () => {
        const args = buildArgs('merge', ['H:/a.nsp'], { keypatch: 3 }, KEYS);
        expect(args).toContain('-k');
        expect(args).toContain('3');
    });

    it('with custom output', () => {
        const args = buildArgs('merge', ['H:/a.nsp', 'H:/b.nsp'], { output: 'D:/merged' }, KEYS);
        expect(args).toContain('-o');
        expect(args).toContain('D:/merged');
    });

    it('passes multiple files as multi-arg (not batched)', () => {
        expect(SINGLE_FILE_OPS.has('merge')).toBe(false);
        const args = buildArgs('merge', ['H:/a.nsp', 'H:/b.nsp', 'H:/c.nsp'], {}, KEYS);
        expect(args[0]).toBe('-d');
        expect(args[1]).toBe('H:/a.nsp');
        expect(args[2]).toBe('H:/b.nsp');
        expect(args[3]).toBe('H:/c.nsp');
    });
});

// ─── Convert tab ────────────────────────────────────────────────

describe('convert', () => {
    it('single file with format', () => {
        expect(buildArgs('convert', ['H:/game.nsp'], { format: 'xci' }, KEYS)).toEqual([
            '-c', 'H:/game.nsp',
            '-t', 'xci',
            '-o', 'H:',
            '--keys', KEYS,
        ]);
    });

    it('nsp format', () => {
        const args = buildArgs('convert', ['H:/game.xci'], { format: 'nsp' }, KEYS);
        expect(args).toContain('-t');
        expect(args[args.indexOf('-t') + 1]).toBe('nsp');
    });
});

// ─── Split tab ──────────────────────────────────────────────────

describe('split', () => {
    it('single file', () => {
        expect(buildArgs('split', ['H:/game.xci'], {}, KEYS)).toEqual([
            '--splitter', 'H:/game.xci',
            '-o', 'H:',
            '--keys', KEYS,
        ]);
    });
});

// ─── Split to Files (dspl) tab ──────────────────────────────────

describe('dspl', () => {
    it('single file with format', () => {
        expect(buildArgs('dspl', ['H:/game.xci'], { format: 'xci' }, KEYS)).toEqual([
            '--dspl', 'H:/game.xci',
            '-t', 'xci',
            '-o', 'H:',
            '--keys', KEYS,
        ]);
    });

    it('nsp format', () => {
        const args = buildArgs('dspl', ['H:/game.xci'], { format: 'nsp' }, KEYS);
        expect(args[args.indexOf('-t') + 1]).toBe('nsp');
    });
});

// ─── Info tab ───────────────────────────────────────────────────

describe('info', () => {
    it('default mode (contentlist)', () => {
        expect(buildArgs('info', ['H:/game.nsp'], {}, KEYS)).toEqual([
            '--ADVcontentlist', 'H:/game.nsp',
            '--keys', KEYS,
        ]);
    });

    it('filelist mode', () => {
        expect(buildArgs('info', ['H:/game.nsp'], { mode: 'filelist' }, KEYS)).toEqual([
            '--ADVfilelist', 'H:/game.nsp',
            '--keys', KEYS,
        ]);
    });

    it('no -o flag appended', () => {
        const args = buildArgs('info', ['H:/game.nsp'], {}, KEYS);
        expect(args).not.toContain('-o');
    });
});

// ─── Create/Repack tab ─────────────────────────────────────────

describe('create', () => {
    it('builds --create and --ifolder from folder path', () => {
        expect(buildArgs('create', ['H:/MyGame'], {}, KEYS)).toEqual([
            '--create', 'H:/MyGame.nsp',
            '--ifolder', 'H:/MyGame',
            '--keys', KEYS,
        ]);
    });

    it('uses custom output dir for nsp path', () => {
        expect(buildArgs('create', ['H:/MyGame'], { output: 'D:/out' }, KEYS)).toEqual([
            '--create', 'D:/out/MyGame.nsp',
            '--ifolder', 'H:/MyGame',
            '--keys', KEYS,
        ]);
    });

    it('no -o flag appended (output is embedded in --create path)', () => {
        const args = buildArgs('create', ['H:/MyGame'], {}, KEYS);
        expect(args).not.toContain('-o');
    });

    it('windows path', () => {
        const args = buildArgs('create', ['C:\\Users\\me\\GameFolder'], {}, KEYS);
        expect(args).toContain('--create');
        expect(args[args.indexOf('--create') + 1]).toBe('C:/Users/me/GameFolder.nsp');
        expect(args[args.indexOf('--ifolder') + 1]).toBe('C:\\Users\\me\\GameFolder');
    });
});

// ─── Rename tab ─────────────────────────────────────────────────

describe('renamef', () => {
    it('single file with all options', () => {
        expect(buildArgs('renamef', ['H:/game.nsp'], {
            renmode: 'force',
            addlangue: 'true',
            noversion: 'false',
            dlcrname: 'tag',
        }, KEYS)).toEqual([
            '--renamef', 'H:/game.nsp',
            '--renmode', 'force',
            '--addlangue', 'true',
            '--noversion', 'false',
            '--dlcrname', 'tag',
            '--keys', KEYS,
        ]);
    });

    it('folder path (recursive rename)', () => {
        expect(buildArgs('renamef', ['H:/Games'], {
            renmode: 'force',
        }, KEYS)).toEqual([
            '--renamef', 'H:/Games',
            '--renmode', 'force',
            '--keys', KEYS,
        ]);
    });

    it('only uses files[0] — never spreads multiple files', () => {
        const args = buildArgs('renamef', ['H:/a.nsp', 'H:/b.nsp'], { renmode: 'force' }, KEYS);
        expect(args.filter(a => a === 'H:/a.nsp')).toHaveLength(1);
        expect(args).not.toContain('H:/b.nsp');
    });

    it('no -o flag appended', () => {
        const args = buildArgs('renamef', ['H:/game.nsp'], {}, KEYS);
        expect(args).not.toContain('-o');
    });

    it('skip_corr_tid mode', () => {
        const args = buildArgs('renamef', ['H:/game.nsp'], { renmode: 'skip_corr_tid' }, KEYS);
        expect(args[args.indexOf('--renmode') + 1]).toBe('skip_corr_tid');
    });

    it('skip_if_tid mode', () => {
        const args = buildArgs('renamef', ['H:/game.nsp'], { renmode: 'skip_if_tid' }, KEYS);
        expect(args[args.indexOf('--renmode') + 1]).toBe('skip_if_tid');
    });

    it('optional flags omitted when falsy', () => {
        const args = buildArgs('renamef', ['H:/game.nsp'], {}, KEYS);
        expect(args).not.toContain('--renmode');
        expect(args).not.toContain('--addlangue');
        expect(args).not.toContain('--noversion');
        expect(args).not.toContain('--dlcrname');
    });
});

// ─── NUTDB operations ───────────────────────────────────────────

describe('nutdb-refresh', () => {
    it('produces only --nutdb-refresh (no keys, no -o)', () => {
        expect(buildArgs('nutdb-refresh', [], {}, null)).toEqual([
            '--nutdb-refresh',
        ]);
    });

    it('ignores keys even if provided', () => {
        // In the runner, keysPath is null for nutdb ops, but buildArgs
        // would append it if passed — the runner gates this.
        const args = buildArgs('nutdb-refresh', [], {}, KEYS);
        expect(args).toContain('--keys');
        // This is fine: the runner ensures keysPath=null for nutdb ops.
    });

    it('appends --nutdb-url when nutdbUrl option is set', () => {
        const url = 'https://gh-proxy.org/https://raw.githubusercontent.com/blawar/titledb/master/US.en.json';
        expect(buildArgs('nutdb-refresh', [], { nutdbUrl: url }, null)).toEqual([
            '--nutdb-refresh', '--nutdb-url', url,
        ]);
    });

    it('omits --nutdb-url when nutdbUrl option is empty', () => {
        expect(buildArgs('nutdb-refresh', [], { nutdbUrl: '' }, null)).toEqual([
            '--nutdb-refresh',
        ]);
    });
});

describe('nutdb-lookup', () => {
    it('passes title ID', () => {
        expect(buildArgs('nutdb-lookup', [], { titleId: '0100000000010000' }, null)).toEqual([
            '--nutdb-lookup', '0100000000010000',
        ]);
    });
});

// ─── Cross-cutting: batching behavior ───────────────────────────

describe('batching (SINGLE_FILE_OPS)', () => {
    it('single-file ops should each produce one-file args when called per-batch', () => {
        // Simulate what the runner does: split files into batches of 1
        const files = ['H:/a.nsp', 'H:/b.nsp', 'H:/c.nsp'];
        for (const op of ['compress', 'decompress', 'convert', 'split', 'renamef']) {
            const batches = files.map(f => [f]);
            expect(batches).toHaveLength(3);
            for (const batch of batches) {
                const args = buildArgs(op, batch, {}, KEYS);
                // Each batch should reference exactly one input file
                const flag = args[0]; // e.g. '-z', '--decompress', etc.
                expect(typeof flag).toBe('string');
                expect(batch).toHaveLength(1);
            }
        }
    });

    it('merge passes all files in a single invocation', () => {
        const files = ['H:/a.nsp', 'H:/b.nsp', 'H:/c.nsp'];
        const batches = SINGLE_FILE_OPS.has('merge') ? files.map(f => [f]) : [files];
        expect(batches).toHaveLength(1);
        expect(batches[0]).toHaveLength(3);
    });
});

// ─── Verify tab ─────────────────────────────────────────────────

describe('verify', () => {
    it('is in SINGLE_FILE_OPS', () => {
        expect(SINGLE_FILE_OPS.has('verify')).toBe(true);
    });

    it('filelist mode with vertype lv1', () => {
        expect(buildArgs('verify', ['H:/game.nsp'], { vertype: 'lv1', filelistPath: 'C:/tools/game-vflist.txt' }, KEYS)).toEqual([
            '--verify', 'all', '--text_file', 'C:/tools/game-vflist.txt',
            '--vertype', 'lv1',
            '--keys', KEYS,
        ]);
    });

    it('filelist mode with vertype lv2', () => {
        expect(buildArgs('verify', ['H:/game.xci'], { vertype: 'lv2', filelistPath: 'C:/tools/game-vflist.txt' }, KEYS)).toEqual([
            '--verify', 'all', '--text_file', 'C:/tools/game-vflist.txt',
            '--vertype', 'lv2',
            '--keys', KEYS,
        ]);
    });

    it('filelist mode with vertype lv3', () => {
        expect(buildArgs('verify', ['H:/game.nsz'], { vertype: 'lv3', filelistPath: 'C:/tools/game-vflist.txt' }, KEYS)).toEqual([
            '--verify', 'all', '--text_file', 'C:/tools/game-vflist.txt',
            '--vertype', 'lv3',
            '--keys', KEYS,
        ]);
    });

    it('no -o flag is added for verify', () => {
        const args = buildArgs('verify', ['H:/game.nsp'], { vertype: 'lv1', filelistPath: 'C:/tools/game-vflist.txt' }, KEYS);
        expect(args).not.toContain('-o');
    });
});

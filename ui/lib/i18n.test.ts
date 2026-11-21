import { describe, it, expect } from 'vitest';
import {
    normalizeLocale,
    translate,
    pluralSuffix,
    getLocale,
    initI18n,
    setLocale,
    subscribeLocale,
    type Locale,
} from './i18n';

describe('normalizeLocale', () => {
    it('接受受支持的语言标签', () => {
        expect(normalizeLocale('en')).toBe('en');
        expect(normalizeLocale('en-US')).toBe('en');
    });

    it('对空值和不支持的标签返回 null', () => {
        expect(normalizeLocale('')).toBeNull();
        expect(normalizeLocale('   ')).toBeNull();
        expect(normalizeLocale('fr-FR')).toBeNull();
    });
});

describe('translate', () => {
    it('按当前语言返回译文', () => {
        expect(translate('en', 'nav.compress')).toBe('Compress');
    });

    it('支持占位符插值', () => {
        expect(translate('en', 'settings.backendInstalled', { version: 'v1.2.3' })).toBe('Installed: v1.2.3');
    });

    it('键缺失时回退到键名，避免界面空白', () => {
        expect(translate('en', '__missing_key__')).toBe('__missing_key__');
    });

    it('关键导航文案已提供', () => {
        const keys = ['nav.compress', 'nav.rename', 'nav.settings', 'settings.languageTitle'];
        for (const key of keys) {
            expect(translate('en', key)).not.toBe(key);
        }
    });
});

describe('pluralSuffix', () => {
    it('英文按数量决定 s', () => {
        expect(pluralSuffix('en', 1)).toBe('');
        expect(pluralSuffix('en', 2)).toBe('s');
    });
});

describe('locale runtime', () => {
    it('默认语言为英文', () => {
        expect(getLocale()).toBe('en');
    });

    it('initI18n 在无保存值时使用默认语言', async () => {
        const locale = await initI18n();
        expect(locale).toBe('en');
    });

    it('setLocale 立即更新内存状态并通知订阅者', async () => {
        const seen: Locale[] = [];
        const unsub = subscribeLocale(l => seen.push(l));
        await setLocale('en');
        expect(getLocale()).toBe('en');
        expect(seen).toContain('en');
        unsub();
    });
});

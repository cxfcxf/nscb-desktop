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
        expect(normalizeLocale('zh-CN')).toBe('zh-CN');
        expect(normalizeLocale('zh-Hans')).toBe('zh-CN');
        expect(normalizeLocale('zh')).toBe('zh-CN');
        expect(normalizeLocale('ZH-cn')).toBe('zh-CN');
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
        expect(translate('zh-CN', 'nav.compress')).toBe('压缩');
    });

    it('支持占位符插值', () => {
        expect(translate('en', 'settings.backendInstalled', { version: 'v1.2.3' })).toBe('Installed: v1.2.3');
        expect(translate('zh-CN', 'batch.startLabel', { count: 3 })).toBe('开始批量合并（3）');
    });

    it('键缺失时回退到英文，再回退到键名', () => {
        // 该键只存在于中文表，用于验证回退方向
        expect(translate('zh-CN', '__missing_key__')).toBe('__missing_key__');
        expect(translate('en', 'rename.dlcOffShort')).toBe('Off');
    });

    it('两种语言的关键导航文案都已提供', () => {
        const keys = ['nav.compress', 'nav.rename', 'nav.settings', 'settings.languageTitle', 'lang.confirm'];
        for (const key of keys) {
            expect(translate('en', key)).not.toBe(key);
            expect(translate('zh-CN', key)).not.toBe(key);
        }
    });
});

describe('pluralSuffix', () => {
    it('英文按数量决定 s，中文不变', () => {
        expect(pluralSuffix('en', 1)).toBe('');
        expect(pluralSuffix('en', 2)).toBe('s');
        expect(pluralSuffix('zh-CN', 1)).toBe('');
        expect(pluralSuffix('zh-CN', 5)).toBe('');
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
        await setLocale('zh-CN');
        expect(getLocale()).toBe('zh-CN');
        expect(seen).toContain('zh-CN');
        unsub();
        // 恢复默认，避免影响其他用例
        await setLocale('en');
    });
});

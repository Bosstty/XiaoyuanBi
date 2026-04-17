const { SystemSetting } = require('@/models');

const DEFAULT_REVIEW_WORDS = [
    '代写',
    '代考',
    '辅导功课',
    '作业辅导',
    '有偿辅导',
    '代辅导',
    '替课辅导',
    '刷单',
    '兼职刷',
    '高价收',
    '低价出',
    '外挂',
    '破解',
    '翻墙',
    'vpn',
    '加微信',
    'vx',
    'qq',
    '返利',
    '套现',
];

const DEFAULT_REJECT_WORDS = [
    '毒品',
    '枪支',
    '办证',
    '假证',
    '裸聊',
    '招嫖',
    '约炮',
    '赌博',
    '私彩',
    '洗钱',
    '发票',
];

function parseWordList(value, fallback) {
    if (Array.isArray(value)) {
        const normalized = value
            .map(item => String(item || '').trim().toLowerCase())
            .filter(Boolean);
        return normalized.length ? normalized : fallback;
    }

    if (!value || !String(value).trim()) {
        return fallback;
    }

    return String(value)
        .split(/[\n,，、；;]+/)
        .map(item => item.trim().toLowerCase())
        .filter(Boolean);
}

function normalizeText(value) {
    return String(value || '')
        .toLowerCase()
        .replace(/\s+/g, ' ')
        .trim();
}

function collectTexts(payload = {}) {
    const values = [];

    ['title', 'content', 'description', 'summary', 'requirements', 'location'].forEach(key => {
        if (payload[key]) {
            values.push(String(payload[key]));
        }
    });

    ['tags', 'skills_required'].forEach(key => {
        if (Array.isArray(payload[key])) {
            values.push(payload[key].join(' '));
        }
    });

    return values.join('\n');
}

function matchWords(source, words) {
    const normalized = normalizeText(source);
    return words.filter(word => normalized.includes(word));
}

class ContentModerationService {
    static async getRuleSet() {
        let setting = null;
        try {
            setting = await SystemSetting.findOne();
        } catch (error) {
            setting = null;
        }

        return {
            reviewWords: parseWordList(
                setting?.content_review_words || process.env.CONTENT_REVIEW_WORDS,
                DEFAULT_REVIEW_WORDS
            ),
            rejectWords: parseWordList(
                setting?.content_reject_words || process.env.CONTENT_REJECT_WORDS,
                DEFAULT_REJECT_WORDS
            ),
            contentAutoReviewEnabled: setting?.content_auto_review_enabled !== false,
            taskAutoReviewEnabled: setting?.task_auto_review_enabled !== false,
        };
    }

    static async review(payload, options = {}) {
        const text = collectTexts(payload);
        const { reviewWords, rejectWords, contentAutoReviewEnabled, taskAutoReviewEnabled } =
            await ContentModerationService.getRuleSet();
        const autoReviewEnabled =
            options.scene === 'task' ? taskAutoReviewEnabled : contentAutoReviewEnabled;

        if (!autoReviewEnabled) {
            return {
                action: 'allow',
                level: 'low',
                matchedWords: [],
                reason: '',
            };
        }

        const rejectHits = matchWords(text, rejectWords);

        if (rejectHits.length) {
            return {
                action: 'reject',
                level: 'high',
                matchedWords: rejectHits,
                reason: `${options.label || '内容'}命中高风险敏感词`,
            };
        }

        const reviewHits = matchWords(text, reviewWords);
        if (reviewHits.length) {
            return {
                action: 'review',
                level: 'medium',
                matchedWords: reviewHits,
                reason: `${options.label || '内容'}命中敏感词，需人工复核`,
            };
        }

        return {
            action: 'allow',
            level: 'low',
            matchedWords: [],
            reason: '',
        };
    }

    static buildReason(result) {
        if (!result || result.action === 'allow') {
            return '';
        }

        const suffix = result.matchedWords?.length
            ? `：${result.matchedWords.slice(0, 5).join('、')}`
            : '';
        return `${result.reason}${suffix}`;
    }

    static buildUserFacingMessage(result, options = {}) {
        const label = options.label || '内容';

        if (!result || result.action === 'allow') {
            return `${label}提交成功`;
        }

        if (result.action === 'reject') {
            return `${label}包含不适宜发布的信息，请调整后重新提交`;
        }

        if (result.action === 'review') {
            return `${label}已提交，正在审核中`;
        }

        return `${label}提交失败，请稍后重试`;
    }
}

module.exports = ContentModerationService;

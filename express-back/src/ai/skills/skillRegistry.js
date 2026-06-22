const USER_SKILLS = [
    {
        name: 'general_support',
        description: '默认用户助手，处理账户、订单、任务、钱包和工单类问题。',
        match: () => true,
        toolNames: [
            'get_my_account_snapshot',
            'get_my_order_stats',
            'get_my_recent_orders',
            'get_order_detail',
            'get_my_task_stats',
            'get_my_recent_tasks',
            'get_task_detail',
            'get_my_wallet_transactions',
            'get_income_expense_summary',
            'get_my_support_ticket_summary',
            'draft_support_ticket',
        ],
        promptRules: [
            '优先回答用户个人数据，不要调用平台级统计工具。',
            '涉及具体订单号、任务号或工单号时，优先查询详情工具。',
        ],
    },
    {
        name: 'personal_finance_report',
        description: '处理收入支出、钱包流水、订单/任务汇总类分析。',
        keywords: ['收入', '支出', '汇总', '统计', '流水', '钱包', '赚了', '花了', '分析'],
        toolNames: [
            'get_my_account_snapshot',
            'get_my_order_stats',
            'get_my_task_stats',
            'get_my_wallet_transactions',
            'get_income_expense_summary',
        ],
        promptRules: [
            '优先采用“先汇总、再明细”的方式回答收支类问题。',
            '如果用户同时提到收入和支出，优先组合多个工具后再汇总，不要只查单一来源。',
        ],
    },
    {
        name: 'email_report_sender',
        description: '处理将 AI 生成的分析汇总发送到用户邮箱的场景。',
        keywords: ['发邮箱', '发送邮箱', '邮件', 'email', '邮箱', '发给我', '发送给我'],
        toolNames: [
            'get_my_account_snapshot',
            'get_my_order_stats',
            'get_my_recent_orders',
            'get_order_detail',
            'get_my_task_stats',
            'get_my_recent_tasks',
            'get_task_detail',
            'get_my_wallet_transactions',
            'get_income_expense_summary',
            'get_my_support_ticket_summary',
            'draft_support_ticket',
            'send_analysis_email',
        ],
        promptRules: [
            '如果用户要求把分析结果发到邮箱，可以先查询相关数据，再生成简洁摘要，然后调用 send_analysis_email。',
            '发送前优先使用当前登录用户绑定邮箱，且在邮件正文中保留结论和要点列表。',
            '如果邮件主题未明确，可根据问题自动生成简洁主题。',
        ],
    },
];

const ADMIN_SKILLS = [
    {
        name: 'platform_analysis',
        description: '处理平台级运营数据概览和周期对比。',
        match: () => true,
        toolNames: ['get_platform_overview', 'compare_platform_periods'],
        promptRules: ['优先使用平台级统计工具，不要回答用户个人账户数据。'],
    },
];

const normalizeText = value =>
    String(value || '')
        .trim()
        .toLowerCase();

const matchesKeywords = (input, keywords = []) => {
    const normalized = normalizeText(input);
    return keywords.some(keyword => normalized.includes(normalizeText(keyword)));
};

const getSkillsByScope = scope => (scope === 'admin' ? ADMIN_SKILLS : USER_SKILLS);

const resolveSkillContext = ({ input, scope = 'user' } = {}) => {
    const skills = getSkillsByScope(scope);
    const matchedSkills = skills.filter(skill => {
        if (typeof skill.match === 'function') {
            return skill.match(input);
        }
        if (Array.isArray(skill.keywords) && skill.keywords.length) {
            return matchesKeywords(input, skill.keywords);
        }
        return false;
    });

    const activeSkills = matchedSkills.length
        ? matchedSkills
        : skills.filter(skill => skill.name === 'general_support');
    const toolNames = [...new Set(activeSkills.flatMap(skill => skill.toolNames || []))];
    const promptRules = activeSkills.flatMap(skill => skill.promptRules || []);

    return {
        skillNames: activeSkills.map(skill => skill.name),
        toolNames,
        promptRules,
        descriptions: activeSkills.map(skill => ({
            name: skill.name,
            description: skill.description,
        })),
    };
};

module.exports = {
    resolveSkillContext,
};

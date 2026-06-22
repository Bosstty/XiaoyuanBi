const assistantConfig = require('@/ai/config/assistantConfig');
const { buildSystemPrompt } = require('@/ai/prompts/systemPrompt');
const { createAssistantTools } = require('@/ai/tools/platformTools');
const { resolveSkillContext } = require('@/ai/skills/skillRegistry');
const { requestChatCompletion, requestChatCompletionStream } = require('@/ai/services/zhipuClient');

const sanitizeMessages = messages => {
    if (!Array.isArray(messages)) return [];

    return messages
        .filter(item => item && typeof item.content === 'string' && item.content.trim())
        .slice(-assistantConfig.maxHistory)
        .map(item => ({
            role: item.role === 'assistant' ? 'assistant' : 'user',
            content: String(item.content).trim(),
        }));
};

const stringifyToolResult = result => {
    if (typeof result === 'string') return result;

    try {
        return JSON.stringify(result, null, 2);
    } catch (error) {
        return JSON.stringify({ error: 'tool_result_serialize_failed' });
    }
};

const buildToolResultPrompt = result => {
    const serialized = stringifyToolResult(result);
    return [
        '以下是工具返回的真实数据，请只提取关键结论，不要逐字段复述。',
        '输出要求：先给结论，再给 3 到 5 条要点；关键数字用 Markdown 加粗；如有多条明细，优先列表或表格。',
        '工具结果：',
        serialized,
    ].join('\n');
};

const PERIOD_LABEL_MAP = {
    day: '今日',
    week: '近 7 天',
    month: '近 30 天',
    two_months: '近 60 天',
    quarter: '近 90 天',
    half_year: '近 180 天',
};

const formatNumber = value => Number(value || 0).toLocaleString('zh-CN');

const formatMoney = value =>
    Number(value || 0).toLocaleString('zh-CN', {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
    });

const buildPlatformOverviewFallback = toolEntries => {
    const rows = toolEntries
        .map(entry => {
            const period = entry?.args?.period || entry?.result?.period || 'week';
            const overview = entry?.result?.overview || {};
            return {
                period,
                label: PERIOD_LABEL_MAP[period] || period,
                orders: Number(overview.orders_in_period || 0),
                completed: Number(overview.completed_orders_in_period || 0),
                revenue: Number(overview.commission_revenue_in_period || 0),
                newUsers: Number(overview.new_users || 0),
                activeTasks: Number(overview.active_tasks || 0),
                posts: Number(overview.forum_posts_in_period || 0),
            };
        })
        .sort(
            (left, right) =>
                ['day', 'week', 'month', 'quarter'].indexOf(left.period) -
                ['day', 'week', 'month', 'quarter'].indexOf(right.period)
        );

    if (!rows.length) return '';

    if (rows.length === 1) {
        const row = rows[0];
        return [
            '## 结论',
            `${row.label}平台概览已获取：订单 **${formatNumber(row.orders)}** 单，完成 **${formatNumber(row.completed)}** 单，平台佣金收入 **${formatMoney(row.revenue)}** 元。`,
            '',
            '## 明细',
            `- 新增用户：**${formatNumber(row.newUsers)}** 人`,
            `- 当前活跃任务：**${formatNumber(row.activeTasks)}** 个`,
            `- 社区发帖：**${formatNumber(row.posts)}** 篇`,
        ].join('\n');
    }

    const table = [
        '| 周期 | 订单数 | 完成订单 | 佣金收入 | 新增用户 | 活跃任务 | 发帖数 |',
        '| --- | --- | --- | --- | --- | --- | --- |',
        ...rows.map(
            row =>
                `| ${row.label} | **${formatNumber(row.orders)}** | **${formatNumber(row.completed)}** | **${formatMoney(row.revenue)} 元** | **${formatNumber(row.newUsers)}** | **${formatNumber(row.activeTasks)}** | **${formatNumber(row.posts)}** |`
        ),
    ].join('\n');

    const maxOrdersRow = [...rows].sort((left, right) => right.orders - left.orders)[0];
    const maxRevenueRow = [...rows].sort((left, right) => right.revenue - left.revenue)[0];

    return [
        '## 结论',
        `已获取多个时间周期的平台概览，其中订单量最高的是 **${maxOrdersRow.label}**，佣金收入最高的是 **${maxRevenueRow.label}**。`,
        '',
        '## 明细',
        table,
    ].join('\n');
};

const buildAccountSnapshotFallback = toolEntry => {
    const snapshot = toolEntry?.result?.snapshot || {};
    return [
        '## 结论',
        `你的账户概况已获取：钱包余额 **${formatMoney(snapshot.wallet_balance)}** 元，待处理订单 **${formatNumber(snapshot.pending_orders_count)}** 单，未读消息 **${formatNumber(snapshot.unread_chat_messages)}** 条。`,
        '',
        '## 明细',
        `- 积分余额：**${formatNumber(snapshot.wallet_points)}** 分`,
        `- 我的订单：**${formatNumber(snapshot.my_orders_count)}** 单`,
        `- 已发布任务：**${formatNumber(snapshot.published_tasks_count)}** 个`,
        `- 进行中会话：**${formatNumber(snapshot.open_chat_conversations)}** 个`,
    ].join('\n');
};

const buildRecentOrdersFallback = toolEntry => {
    const orders = Array.isArray(toolEntry?.result?.orders) ? toolEntry.result.orders : [];

    if (!orders.length) {
        return ['## 结论', '当前没有查到最近订单记录。'].join('\n');
    }

    const table = [
        '| 订单号 | 标题 | 状态 | 金额 |',
        '| --- | --- | --- | --- |',
        ...orders.map(
            order =>
                `| ${order.order_no || '-'} | ${order.title || '-'} | ${order.status || '-'} | **${formatMoney(order.price)} 元** |`
        ),
    ].join('\n');

    return [
        '## 结论',
        `已获取最近 **${formatNumber(orders.length)}** 条订单记录。`,
        '',
        '## 明细',
        table,
    ].join('\n');
};

const buildSupportTicketFallback = toolEntry => {
    const result = toolEntry?.result || {};
    const fields = Array.isArray(result.recommended_fields) ? result.recommended_fields : [];

    return [
        '## 结论',
        '已生成一份可继续完善的客服工单草稿。',
        '',
        '## 明细',
        `- 问题类型：**${result.issue_type || '-'}**`,
        `- 摘要：${result.summary || '-'}`,
        ...fields.map(field => `- 建议补充：${field}`),
        '',
        '## 说明',
        `- ${result.next_step || '当前仅为草稿预演，未实际创建工单。'}`,
    ].join('\n');
};

const buildEmailFallback = toolEntry => {
    const result = toolEntry?.result || {};
    if (!result.success) {
        return ['## 结论', result.message || '邮件发送失败。'].join('\n');
    }

    return [
        '## 结论',
        `分析汇总已发送到 **${result.sent_to || '-'}**。`,
        '',
        '## 明细',
        `- 邮件主题：**${result.subject || '-'}**`,
        `- 收件人：${result.recipient_name || '-'}`,
        `- 状态：${result.message || '发送成功'}`,
    ].join('\n');
};

const buildMetricListFallback = (title, items = []) => {
    const rows = items
        .filter(item => item && item.label !== undefined)
        .slice(0, 6)
        .map(item => `- ${item.label}：**${item.value ?? 0}**${item.unit ? ` ${item.unit}` : ''}`);

    if (!rows.length) return '';

    return ['## 结论', title, '', '## 明细', ...rows].join('\n');
};

const buildGenericSummaryFallback = toolEntry => {
    const result = toolEntry?.result || {};

    if (Array.isArray(result.highlights) && result.highlights.length) {
        return buildMetricListFallback('已根据工具结果整理出关键指标。', result.highlights);
    }

    if (result.summary && typeof result.summary === 'object') {
        const rows = Object.entries(result.summary)
            .slice(0, 6)
            .map(([key, value]) => ({
                label: key,
                value: typeof value === 'number' ? formatNumber(value) : String(value ?? '-'),
            }));

        return buildMetricListFallback('已根据工具结果整理出关键摘要。', rows);
    }

    return '';
};

const buildFallbackReplyFromTools = toolEntries => {
    if (!Array.isArray(toolEntries) || !toolEntries.length) {
        return '';
    }

    const platformOverviewEntries = toolEntries.filter(
        entry => entry.name === 'get_platform_overview'
    );
    if (platformOverviewEntries.length) {
        return buildPlatformOverviewFallback(platformOverviewEntries);
    }

    const accountSnapshotEntry = toolEntries.find(
        entry => entry.name === 'get_my_account_snapshot'
    );
    if (accountSnapshotEntry) {
        return buildAccountSnapshotFallback(accountSnapshotEntry);
    }

    const recentOrdersEntry = toolEntries.find(entry => entry.name === 'get_my_recent_orders');
    if (recentOrdersEntry) {
        return buildRecentOrdersFallback(recentOrdersEntry);
    }

    const supportTicketEntry = toolEntries.find(entry => entry.name === 'draft_support_ticket');
    if (supportTicketEntry) {
        return buildSupportTicketFallback(supportTicketEntry);
    }

    const emailEntry = toolEntries.find(entry => entry.name === 'send_analysis_email');
    if (emailEntry) {
        return buildEmailFallback(emailEntry);
    }

    return buildGenericSummaryFallback(toolEntries[toolEntries.length - 1]);
};

const appendToolExecutionNotice = (reply, toolEntries = []) => {
    const content = String(reply || '').trim();
    const emailEntry = toolEntries.find(entry => entry.name === 'send_analysis_email');
    if (!emailEntry) {
        return content;
    }

    const result = emailEntry.result || {};
    const notice = result.success
        ? `\n\n已发送到邮箱：**${result.sent_to || '-'}**`
        : `\n\n邮件发送失败：${result.message || '未知错误'}`;

    if (!content) {
        return result.success
            ? `已发送到邮箱：**${result.sent_to || '-'}**`
            : `邮件发送失败：${result.message || '未知错误'}`;
    }

    if (
        (result.success && content.includes(String(result.sent_to || ''))) ||
        (!result.success && content.includes('邮件发送失败'))
    ) {
        return content;
    }

    return `${content}${notice}`;
};

const resolveRuntimeContext = ({ userId, scope, input, mergedMessages }) => {
    const lastMessageContent = mergedMessages[mergedMessages.length - 1]?.content || '';
    const skillContext = resolveSkillContext({
        input: input || lastMessageContent,
        scope,
    });
    const allTools = createAssistantTools({ userId, scope });
    const tools = Array.isArray(skillContext.toolNames) && skillContext.toolNames.length
        ? allTools.filter(tool => skillContext.toolNames.includes(tool.name))
        : allTools;

    return {
        skillContext,
        tools,
        toolMap: new Map(tools.map(item => [item.name, item])),
    };
};

class AIAssistantService {
    buildRequestBody(conversation, tools) {
        const requestBody = {
            model: assistantConfig.model,
            max_tokens: assistantConfig.maxTokens,
            messages: conversation,
            tools: tools.map(item => ({
                type: 'function',
                function: {
                    name: item.name,
                    description: item.description,
                    parameters: item.parameters,
                },
            })),
            tool_choice: 'auto',
        };

        if (assistantConfig.topP === null) {
            requestBody.temperature = assistantConfig.temperature;
        } else {
            requestBody.top_p = assistantConfig.topP;
        }

        if (assistantConfig.thinkingEnabled) {
            requestBody.thinking = { type: 'enabled' };
            requestBody.reasoning_effort = assistantConfig.reasoningEffort;
        }

        return requestBody;
    }

    getMeta(scope = 'user') {
        const isAdminScope = scope === 'admin';
        return {
            enabled: assistantConfig.enabled,
            model: assistantConfig.model,
            thinking_enabled: assistantConfig.thinkingEnabled,
            reasoning_effort: assistantConfig.reasoningEffort,
            scope,
            skill_mode: 'lightweight',
            skills: isAdminScope
                ? ['platform_analysis']
                : ['general_support', 'personal_finance_report', 'email_report_sender'],
            capabilities: isAdminScope
                ? ['平台基础数据分析', '平台周期对比', '运营概览统计']
                : [
                      '用户问题咨询',
                      '我的订单/任务/钱包概览',
                      '收入支出汇总',
                      '订单/任务详情查询',
                      '分析汇总邮件发送',
                      '客服工单草稿建议',
                  ],
            suggested_questions: isAdminScope
                ? ['平台这周订单和新增用户怎么样', '对比一下本周和上周的平台数据']
                : [
                      '帮我看看最近订单情况',
                      '统计我最近两个月的接单收入和发布支出',
                      '我钱包和聊天未读消息有多少',
                      '把刚刚的分析发到我的邮箱',
                      '帮我整理一个退款工单草稿',
                  ],
        };
    }

    async chat({ userId, input, messages, scope = 'user' }) {
        if (!assistantConfig.enabled) {
            const error = new Error('AI 助手当前未启用');
            error.statusCode = 503;
            throw error;
        }

        const normalizedHistory = sanitizeMessages(messages);
        const normalizedInput = String(input || '').trim();
        const mergedMessages = normalizedInput
            ? [...normalizedHistory, { role: 'user', content: normalizedInput }]
            : normalizedHistory;

        if (!mergedMessages.length) {
            const error = new Error('请输入消息内容');
            error.statusCode = 400;
            throw error;
        }

        const { skillContext, tools, toolMap } = resolveRuntimeContext({
            userId,
            scope,
            input: normalizedInput,
            mergedMessages,
        });
        const conversation = [
            { role: 'system', content: buildSystemPrompt({ skillContext }) },
            ...mergedMessages,
        ];
        const executedTools = [];
        const executedToolEntries = [];

        for (let index = 0; index < assistantConfig.maxIterations; index += 1) {
            const response = await requestChatCompletion(
                this.buildRequestBody(conversation, tools)
            );

            const assistantMessage = response?.choices?.[0]?.message || {};
            conversation.push(assistantMessage);

            const toolCalls = Array.isArray(assistantMessage.tool_calls)
                ? assistantMessage.tool_calls
                : [];
            if (!toolCalls.length) {
                const replyContent = String(assistantMessage.content || '').trim();
                const finalReply = appendToolExecutionNotice(
                    replyContent || buildFallbackReplyFromTools(executedToolEntries),
                    executedToolEntries
                );
                return {
                    reply: finalReply || '暂时没有可返回的结果。',
                    model: assistantConfig.model,
                    skills: skillContext.skillNames,
                    tool_calls: executedTools,
                    usage: response?.usage || null,
                };
            }

            for (const toolCall of toolCalls) {
                const functionPayload = toolCall?.function || {};
                const toolName = functionPayload.name;
                const matchedTool = toolMap.get(toolName);
                if (!matchedTool) {
                    conversation.push({
                        role: 'tool',
                        tool_call_id: toolCall.id,
                        content: JSON.stringify({
                            error: `tool_not_found:${toolName}`,
                        }),
                    });
                    continue;
                }

                let toolArgs = {};
                try {
                    toolArgs = functionPayload.arguments
                        ? JSON.parse(functionPayload.arguments)
                        : {};
                } catch (error) {
                    toolArgs = {};
                }

                const toolResult = await matchedTool.execute(toolArgs);
                executedTools.push({
                    name: toolName,
                    args: toolArgs,
                });
                executedToolEntries.push({
                    name: toolName,
                    args: toolArgs,
                    result: toolResult,
                });
                conversation.push({
                    role: 'tool',
                    tool_call_id: toolCall.id,
                    content: buildToolResultPrompt(toolResult),
                });
            }
        }

        return {
            reply: '本次请求触发了过多工具调用，我先停在这里。你可以缩小问题范围后再问一次。',
            model: assistantConfig.model,
            skills: skillContext.skillNames,
            tool_calls: executedTools,
            usage: null,
        };
    }

    async chatStream({ userId, input, messages, onEvent, scope = 'user' }) {
        if (!assistantConfig.enabled) {
            const error = new Error('AI 助手当前未启用');
            error.statusCode = 503;
            throw error;
        }

        const normalizedHistory = sanitizeMessages(messages);
        const normalizedInput = String(input || '').trim();
        const mergedMessages = normalizedInput
            ? [...normalizedHistory, { role: 'user', content: normalizedInput }]
            : normalizedHistory;

        if (!mergedMessages.length) {
            const error = new Error('请输入消息内容');
            error.statusCode = 400;
            throw error;
        }

        const { skillContext, tools, toolMap } = resolveRuntimeContext({
            userId,
            scope,
            input: normalizedInput,
            mergedMessages,
        });
        const conversation = [
            { role: 'system', content: buildSystemPrompt({ skillContext }) },
            ...mergedMessages,
        ];
        const executedTools = [];
        const executedToolEntries = [];

        onEvent?.({
            type: 'status',
            message: '正在分析问题...',
        });

        for (let index = 0; index < assistantConfig.maxIterations; index += 1) {
            const response = await requestChatCompletionStream(
                this.buildRequestBody(conversation, tools),
                {
                    onReasoning: content =>
                        onEvent?.({
                            type: 'reasoning',
                            content,
                        }),
                    onContent: content =>
                        onEvent?.({
                            type: 'content',
                            content,
                        }),
                }
            );

            const assistantMessage = response?.message || {};
            conversation.push(assistantMessage);

            const toolCalls = Array.isArray(assistantMessage.tool_calls)
                ? assistantMessage.tool_calls
                : [];

            if (!toolCalls.length) {
                const replyContent = String(assistantMessage.content || '').trim();
                const finalReply = appendToolExecutionNotice(
                    replyContent || buildFallbackReplyFromTools(executedToolEntries),
                    executedToolEntries
                );
                const finalPayload = {
                    reply: finalReply || '暂时没有可返回的结果。',
                    model: assistantConfig.model,
                    skills: skillContext.skillNames,
                    tool_calls: executedTools,
                    usage: response?.usage || null,
                };

                onEvent?.({
                    type: 'done',
                    data: finalPayload,
                });
                return finalPayload;
            }

            onEvent?.({
                type: 'status',
                message: '正在调用平台工具查询数据...',
            });

            for (const toolCall of toolCalls) {
                const functionPayload = toolCall?.function || {};
                const toolName = functionPayload.name;
                const matchedTool = toolMap.get(toolName);
                if (!matchedTool) {
                    conversation.push({
                        role: 'tool',
                        tool_call_id: toolCall.id,
                        content: JSON.stringify({
                            error: `tool_not_found:${toolName}`,
                        }),
                    });
                    continue;
                }

                let toolArgs = {};
                try {
                    toolArgs = functionPayload.arguments
                        ? JSON.parse(functionPayload.arguments)
                        : {};
                } catch (error) {
                    toolArgs = {};
                }

                onEvent?.({
                    type: 'tool',
                    name: toolName,
                    label: matchedTool.display_name || toolName,
                });

                const toolResult = await matchedTool.execute(toolArgs);
                executedTools.push({
                    name: toolName,
                    args: toolArgs,
                });
                executedToolEntries.push({
                    name: toolName,
                    args: toolArgs,
                    result: toolResult,
                });
                conversation.push({
                    role: 'tool',
                    tool_call_id: toolCall.id,
                    content: buildToolResultPrompt(toolResult),
                });
            }

            onEvent?.({
                type: 'status',
                message: '正在整理结果...',
            });
        }

        const finalPayload = {
            reply: '本次请求触发了过多工具调用，我先停在这里。你可以缩小问题范围后再问一次。',
            model: assistantConfig.model,
            skills: skillContext.skillNames,
            tool_calls: executedTools,
            usage: null,
        };
        onEvent?.({
            type: 'done',
            data: finalPayload,
        });
        return finalPayload;
    }
}

module.exports = new AIAssistantService();

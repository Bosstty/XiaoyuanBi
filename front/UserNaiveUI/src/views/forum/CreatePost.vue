<template>
    <div class="create-post-page" :class="{ 'is-dark': appStore.isDark }">
        <!-- 顶部导航 -->
        <header class="top-nav">
            <button type="button" class="back-btn" @click="router.back()" aria-label="返回">
                <svg viewBox="0 0 24 24" width="24" height="24">
                    <path d="M15.41 7.41L14 6l-6 6 6 6 1.41-1.41L10.83 12z" fill="currentColor" />
                </svg>
            </button>
            <span class="nav-title">发布帖子</span>
            <div class="nav-spacer"></div>
        </header>

        <main class="page-main">
            <!-- 表单卡片 -->
            <div class="form-card">
                <!-- 分类选择 -->
                <div class="form-section">
                    <label class="form-label">选择分类</label>
                    <div class="category-grid">
                        <button
                            v-for="cat in categoryOptions"
                            :key="cat.value"
                            type="button"
                            class="category-btn"
                            :class="{ active: form.category === cat.value }"
                            @click="form.category = cat.value as any"
                        >
                            <span class="cat-dot" :data-type="cat.value"></span>
                            {{ cat.label }}
                        </button>
                    </div>
                </div>

                <!-- 标题输入 -->
                <div class="form-section">
                    <label class="form-label">
                        标题
                        <span class="required">*</span>
                    </label>
                    <NInput
                        v-model:value="form.title"
                        maxlength="200"
                        show-count
                        placeholder="输入有吸引力的标题"
                        class="title-input"
                    />
                </div>

                <!-- 摘要输入 -->
                <div class="form-section">
                    <label class="form-label">摘要</label>
                    <NInput
                        v-model:value="form.summary"
                        type="textarea"
                        :autosize="{ minRows: 2, maxRows: 4 }"
                        maxlength="500"
                        show-count
                        placeholder="选填，列表中会优先展示摘要"
                    />
                </div>

                <!-- 正文输入 -->
                <div class="form-section">
                    <label class="form-label">
                        正文
                        <span class="required">*</span>
                    </label>
                    <NInput
                        v-model:value="form.content"
                        type="textarea"
                        :autosize="{ minRows: 10, maxRows: 20 }"
                        placeholder="输入帖子正文内容..."
                        class="content-input"
                    />
                </div>

                <!-- 标签输入 -->
                <div class="form-section">
                    <label class="form-label">标签</label>
                    <NInput
                        v-model:value="tagsInput"
                        placeholder="多个标签用英文逗号分隔，例如：二手,教材,求助"
                    />
                    <div v-if="normalizeTags().length" class="tag-preview">
                        <span v-for="tag in normalizeTags()" :key="tag" class="tag-chip">
                            #{{ tag }}
                        </span>
                    </div>
                </div>

                <!-- 匿名开关 -->
                <div class="switch-row">
                    <div class="switch-label">
                        <span class="switch-title">匿名发布</span>
                        <span class="switch-desc">其他用户将看不到你的身份信息</span>
                    </div>
                    <NSwitch v-model:value="form.is_anonymous" />
                </div>

                <!-- 提示信息 -->
                <div class="tips-box">
                    <svg viewBox="0 0 24 24" width="16" height="16">
                        <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 15h-2v-6h2v6zm0-8h-2V7h2v2z" fill="currentColor" />
                    </svg>
                    <span>发布后需要审核才能显示在论坛列表中</span>
                </div>

                <!-- 操作按钮 -->
                <div class="action-row">
                    <NButton secondary @click="router.back()" class="cancel-btn">
                        取消
                    </NButton>
                    <NButton :loading="savingDraft" @click="handleSaveDraft" class="draft-btn">
                        保存草稿
                    </NButton>
                    <NButton type="primary" :loading="submitting" @click="handleSubmit" class="submit-btn">
                        发布
                    </NButton>
                </div>
            </div>
        </main>
    </div>
</template>

<script setup lang="ts">
import { computed, reactive, ref } from 'vue';
import { useRouter } from 'vue-router';
import { NButton, NInput, NSelect, NSwitch, useMessage } from 'naive-ui';
import { forumApi } from '@/api';
import { useAppStore } from '@/stores';

const router = useRouter();
const message = useMessage();
const appStore = useAppStore();

const submitting = ref(false);
const savingDraft = ref(false);
const tagsInput = ref('');
const form = reactive({
    category: 'academic' as 'academic' | 'life' | 'campus' | 'task' | 'skill',
    title: '',
    summary: '',
    content: '',
    is_anonymous: false,
});

const categoryOptions = computed(() => [
    { label: '学术交流', value: 'academic' },
    { label: '生活服务', value: 'life' },
    { label: '校园动态', value: 'campus' },
    { label: '任务互助', value: 'task' },
    { label: '技能分享', value: 'skill' },
]);

const normalizeTags = () =>
    tagsInput.value
        .split(',')
        .map(tag => tag.trim())
        .filter(Boolean);

const handleSubmit = async () => {
    if (!form.title.trim()) {
        message.warning('请输入标题');
        return;
    }

    if (!form.content.trim()) {
        message.warning('请输入正文');
        return;
    }

    submitting.value = true;
    try {
        const res = await forumApi.createPost({
            category: form.category,
            title: form.title.trim(),
            summary: form.summary.trim() || undefined,
            content: form.content.trim(),
            tags: normalizeTags(),
            is_anonymous: form.is_anonymous,
            status: 'pending_review',
        });

        if (!res.success || !res.data) {
            throw new Error(res.message || '发布失败');
        }

        message.success('发布成功');
        router.replace(`/forum/${res.data.id}`);
    } catch (error: any) {
        message.error(error?.message || '发布失败');
    } finally {
        submitting.value = false;
    }
};

const handleSaveDraft = async () => {
    if (!form.title.trim()) {
        message.warning('请输入标题');
        return;
    }

    savingDraft.value = true;
    try {
        const res = await forumApi.createPost({
            category: form.category,
            title: form.title.trim(),
            summary: form.summary.trim() || undefined,
            content: form.content.trim(),
            tags: normalizeTags(),
            is_anonymous: form.is_anonymous,
            status: 'draft',
        });

        if (!res.success || !res.data) {
            throw new Error(res.message || '保存草稿失败');
        }

        message.success('草稿保存成功');
        router.back();
    } catch (error: any) {
        message.error(error?.message || '保存草稿失败');
    } finally {
        savingDraft.value = false;
    }
};
</script>

<style scoped>
/* ===== 页面基础 ===== */
.create-post-page {
    min-height: 100vh;
    background: linear-gradient(180deg, #f8fafc 0%, #f1f5f9 100%);
    color: #1e293b;
}

.is-dark {
    background: linear-gradient(180deg, #0f172a 0%, #1e293b 100%);
    color: #e2e8f0;
}

/* ===== 顶部导航 ===== */
.top-nav {
    position: sticky;
    top: 0;
    z-index: 100;
    display: flex;
    align-items: center;
    padding: 12px 16px;
    background: rgba(255, 255, 255, 0.85);
    backdrop-filter: blur(12px);
    -webkit-backdrop-filter: blur(12px);
    border-bottom: 1px solid rgba(0, 0, 0, 0.05);
}

.is-dark .top-nav {
    background: rgba(15, 23, 42, 0.85);
    border-color: rgba(255, 255, 255, 0.08);
}

.back-btn {
    width: 40px;
    height: 40px;
    padding: 0;
    border: none;
    background: transparent;
    color: #475569;
    display: flex;
    align-items: center;
    justify-content: center;
    cursor: pointer;
    transition: color 0.2s;
}

.back-btn:hover {
    color: #1e293b;
}

.is-dark .back-btn {
    color: #94a3b8;
}

.is-dark .back-btn:hover {
    color: #e2e8f0;
}

.nav-title {
    flex: 1;
    text-align: center;
    margin-right: 40px;
    font-size: 17px;
    font-weight: 600;
}

.is-dark .nav-title {
    color: #f1f5f9;
}

.nav-spacer {
    width: 40px;
}

/* ===== 主内容区 ===== */
.page-main {
    max-width: 800px;
    margin: 0 auto;
    padding: 20px 16px 40px;
}

/* ===== 表单卡片 ===== */
.form-card {
    background: #ffffff;
    border-radius: 20px;
    padding: 24px;
    box-shadow: 0 1px 3px rgba(0, 0, 0, 0.05), 0 4px 12px rgba(0, 0, 0, 0.03);
}

.is-dark .form-card {
    background: #1e293b;
    box-shadow: 0 1px 3px rgba(0, 0, 0, 0.2);
}

/* ===== 表单区块 ===== */
.form-section {
    margin-bottom: 24px;
}

.form-label {
    display: block;
    margin-bottom: 10px;
    font-size: 14px;
    font-weight: 600;
    color: #374151;
}

.is-dark .form-label {
    color: #e2e8f0;
}

.required {
    color: #ef4444;
    margin-left: 2px;
}

/* ===== 分类选择 ===== */
.category-grid {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(100px, 1fr));
    gap: 10px;
}

.category-btn {
    display: flex;
    align-items: center;
    gap: 8px;
    padding: 12px 16px;
    border: 2px solid #e2e8f0;
    border-radius: 12px;
    background: transparent;
    font-size: 13px;
    font-weight: 500;
    color: #64748b;
    cursor: pointer;
    transition: all 0.2s;
}

.category-btn:hover {
    border-color: #3b82f6;
    color: #3b82f6;
}

.category-btn.active {
    border-color: #3b82f6;
    background: rgba(59, 130, 246, 0.08);
    color: #3b82f6;
}

.is-dark .category-btn {
    border-color: rgba(255, 255, 255, 0.1);
    color: #94a3b8;
}

.is-dark .category-btn:hover,
.is-dark .category-btn.active {
    border-color: #60a5fa;
    color: #60a5fa;
}

.cat-dot {
    width: 8px;
    height: 8px;
    border-radius: 50%;
    background: #3b82f6;
}

.cat-dot[data-type='life'] { background: #f97316; }
.cat-dot[data-type='campus'] { background: #22c55e; }
.cat-dot[data-type='task'] { background: #8b5cf6; }
.cat-dot[data-type='skill'] { background: #06b6d4; }

/* ===== 输入框 ===== */
.title-input :deep(.n-input__input-el),
.content-input :deep(.n-input__input-el) {
    font-size: 16px;
    font-weight: 500;
}

.is-dark :deep(.n-input) {
    background: rgba(255, 255, 255, 0.04);
    border-color: rgba(255, 255, 255, 0.1);
}

/* ===== 标签预览 ===== */
.tag-preview {
    display: flex;
    flex-wrap: wrap;
    gap: 8px;
    margin-top: 12px;
}

.tag-chip {
    padding: 4px 12px;
    border-radius: 12px;
    background: #f1f5f9;
    font-size: 12px;
    font-weight: 500;
    color: #64748b;
}

.is-dark .tag-chip {
    background: rgba(255, 255, 255, 0.08);
    color: #94a3b8;
}

/* ===== 匿名开关 ===== */
.switch-row {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 16px;
    margin-bottom: 20px;
    background: #f8fafc;
    border-radius: 16px;
}

.is-dark .switch-row {
    background: rgba(255, 255, 255, 0.04);
}

.switch-label {
    display: flex;
    flex-direction: column;
    gap: 2px;
}

.switch-title {
    font-size: 14px;
    font-weight: 600;
    color: #374151;
}

.is-dark .switch-title {
    color: #e2e8f0;
}

.switch-desc {
    font-size: 12px;
    color: #94a3b8;
}

/* ===== 提示框 ===== */
.tips-box {
    display: flex;
    align-items: center;
    gap: 8px;
    padding: 12px 16px;
    margin-bottom: 20px;
    background: #fef9c3;
    border-radius: 12px;
    font-size: 13px;
    color: #ca8a04;
}

.is-dark .tips-box {
    background: rgba(234, 179, 8, 0.15);
    color: #fbbf24;
}

/* ===== 操作按钮 ===== */
.action-row {
    display: flex;
    gap: 12px;
}

.action-row :deep(.n-button) {
    flex: 1;
    height: 44px;
    border-radius: 14px;
    font-weight: 600;
}

.cancel-btn {
    flex: 0.8 !important;
    background: #f1f5f9 !important;
    color: #64748b !important;
}

.is-dark .cancel-btn {
    background: rgba(255, 255, 255, 0.08) !important;
    color: #94a3b8 !important;
}

.draft-btn {
    flex: 1 !important;
}

.is-dark .draft-btn {
    background: rgba(255, 255, 255, 0.08) !important;
    border-color: rgba(255, 255, 255, 0.1) !important;
}

.submit-btn {
    flex: 1.2 !important;
    background: linear-gradient(135deg, #3b82f6 0%, #60a5fa 100%) !important;
    border: none !important;
    color: #fff !important;
}

.submit-btn:hover {
    box-shadow: 0 4px 12px rgba(59, 130, 246, 0.4);
}

/* ===== 响应式 ===== */
@media (max-width: 640px) {
    .category-grid {
        grid-template-columns: repeat(2, 1fr);
    }

    .action-row {
        flex-wrap: wrap;
    }

    .cancel-btn,
    .draft-btn,
    .submit-btn {
        flex: 1 1 calc(50% - 6px) !important;
    }
}
</style>

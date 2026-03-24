<template>
    <div class="create-post-page">
        <div class="page-header">
            <button type="button" class="back-btn" @click="router.back()">返回</button>
            <div>
                <h1>发布帖子</h1>
                <p>内容会直接提交到论坛列表</p>
            </div>
        </div>

        <div class="form-card">
            <NForm label-placement="top">
                <NFormItem label="分类">
                    <NSelect
                        v-model:value="form.category"
                        :options="categoryOptions"
                        placeholder="选择帖子分类"
                    />
                </NFormItem>

                <NFormItem label="标题">
                    <NInput
                        v-model:value="form.title"
                        maxlength="200"
                        show-count
                        placeholder="输入帖子标题"
                    />
                </NFormItem>

                <NFormItem label="摘要">
                    <NInput
                        v-model:value="form.summary"
                        type="textarea"
                        :autosize="{ minRows: 2, maxRows: 3 }"
                        maxlength="500"
                        show-count
                        placeholder="可选，列表中会优先展示摘要"
                    />
                </NFormItem>

                <NFormItem label="正文">
                    <NInput
                        v-model:value="form.content"
                        type="textarea"
                        :autosize="{ minRows: 8, maxRows: 14 }"
                        placeholder="输入帖子正文"
                    />
                </NFormItem>

                <NFormItem label="标签">
                    <NInput
                        v-model:value="tagsInput"
                        placeholder="多个标签用英文逗号分隔，例如：二手,教材,求助"
                    />
                </NFormItem>

                <div class="switch-row">
                    <span>匿名发布</span>
                    <NSwitch v-model:value="form.is_anonymous" />
                </div>

                <div class="action-row">
                    <NButton secondary @click="router.back()">取消</NButton>
                    <NButton :loading="savingDraft" @click="handleSaveDraft">保存草稿</NButton>
                    <NButton type="primary" :loading="submitting" @click="handleSubmit">
                        发布帖子
                    </NButton>
                </div>
            </NForm>
        </div>
    </div>
</template>

<script setup lang="ts">
import { computed, reactive, ref } from 'vue';
import { useRouter } from 'vue-router';
import { NButton, NForm, NFormItem, NInput, NSelect, NSwitch, useMessage } from 'naive-ui';
import { forumApi } from '@/api';

const router = useRouter();
const message = useMessage();

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
.create-post-page {
    min-height: 100vh;
    padding: 18px 16px 32px;
    background: linear-gradient(180deg, #f6f8fc 0%, #eef4fb 100%);
}

.page-header {
    display: flex;
    align-items: flex-start;
    gap: 14px;
    margin-bottom: 18px;
}

.back-btn {
    min-width: 52px;
    height: 36px;
    border: none;
    border-radius: 999px;
    background: #fff;
    color: #17304f;
    box-shadow: 0 8px 24px rgba(23, 48, 79, 0.08);
}

.page-header h1 {
    margin: 0 0 6px;
    font-size: 26px;
    color: #17304f;
}

.page-header p {
    margin: 0;
    color: #708097;
    font-size: 13px;
}

.form-card {
    padding: 18px;
    border-radius: 24px;
    background: rgba(255, 255, 255, 0.96);
    box-shadow: 0 16px 40px rgba(23, 48, 79, 0.08);
}

.switch-row,
.action-row {
    display: flex;
    align-items: center;
    justify-content: space-between;
}

.switch-row {
    margin-top: 4px;
    color: #17304f;
}

.action-row {
    margin-top: 24px;
    gap: 12px;
}

.action-row :deep(.n-button) {
    flex: 1;
    height: 42px;
    border-radius: 999px;
}
</style>

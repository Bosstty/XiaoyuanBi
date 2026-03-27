<template>
    <div class="user-profile-page" :class="{ 'is-dark': appStore.isDark }">
        <header class="profile-nav">
            <button type="button" class="back-btn" @click="router.back()" aria-label="返回">
                <svg viewBox="0 0 24 24" width="22" height="22">
                    <path d="M15.41 7.41L14 6l-6 6 6 6 1.41-1.41L10.83 12z" fill="currentColor" />
                </svg>
            </button>
            <h1>用户详情</h1>
            <div class="nav-placeholder"></div>
        </header>

        <main class="profile-shell">
            <div v-if="loading" class="state-box"><NSpin size="large" /></div>

            <template v-else-if="profileData">
                <section class="hero-card">
                    <div class="hero-main">
                        <div class="profile-avatar">
                            <img
                                v-if="resolveAvatarUrl(profileData.user.avatar)"
                                :src="resolveAvatarUrl(profileData.user.avatar)"
                                :alt="displayName"
                            />
                            <span v-else>{{ displayName.charAt(0) }}</span>
                        </div>
                        <div class="hero-copy">
                            <div class="name-row">
                                <strong>{{ displayName }}</strong>
                                <span
                                    v-if="profileData.user.student_verified"
                                    class="verified-badge"
                                >
                                    已认证
                                </span>
                            </div>
                            <p>
                                {{ profileData.user.college || '未填写学院' }}
                                <span v-if="profileData.user.major">
                                    · {{ profileData.user.major }}
                                </span>
                                <span v-if="profileData.user.grade">
                                    · {{ profileData.user.grade }}
                                </span>
                            </p>
                            <span v-if="profileData.user.bio">{{ profileData.user.bio }}</span>
                        </div>
                    </div>
                    <div class="score-panel">
                        <div class="score-item">
                            <span>综合评分</span>
                            <strong>{{ profileData.stats.overall_rating.toFixed(2) }}</strong>
                        </div>
                        <div class="score-item">
                            <span>任务评分</span>
                            <strong>{{ profileData.stats.task_rating.toFixed(2) }}</strong>
                        </div>
                        <div class="score-item">
                            <span>订单评分</span>
                            <strong>{{ profileData.stats.order_rating.toFixed(2) }}</strong>
                        </div>
                    </div>
                </section>

                <section class="stats-grid">
                    <article class="stat-card">
                        <span>接过任务</span>
                        <strong>{{ profileData.stats.completed_tasks }}</strong>
                    </article>
                    <article class="stat-card">
                        <span>接过订单</span>
                        <strong>{{ profileData.stats.completed_orders }}</strong>
                    </article>
                </section>

                <section v-if="profileData.user.skills?.length" class="section-card">
                    <div class="section-head"><h2>技能标签</h2></div>
                    <div class="skills-row">
                        <span
                            v-for="skill in profileData.user.skills"
                            :key="skill"
                            class="skill-chip"
                        >
                            {{ skill }}
                        </span>
                    </div>
                </section>

                <section class="section-card">
                    <div class="section-head">
                        <h2>任务评价</h2>
                        <span>{{ profileData.stats.total_task_reviews }}</span>
                    </div>
                    <div v-if="profileData.recent_task_reviews.length" class="review-list">
                        <article
                            v-for="review in profileData.recent_task_reviews"
                            :key="review.id"
                            class="review-card"
                        >
                            <div class="review-top">
                                <div>
                                    <strong>{{ review.title }}</strong>
                                    <p v-if="review.publisher">
                                        来自
                                        {{
                                            review.publisher.real_name || review.publisher.username
                                        }}
                                    </p>
                                </div>
                                <span class="review-score">{{ review.rating.toFixed(1) }}</span>
                            </div>
                            <div class="review-comment">
                                {{ review.comment || '该评价未填写文字内容' }}
                            </div>
                        </article>
                    </div>
                    <div v-else class="empty-box">暂无任务评价</div>
                </section>

                <section class="section-card">
                    <div class="section-head">
                        <h2>订单评价</h2>
                        <span>{{ profileData.stats.total_order_reviews }}</span>
                    </div>
                    <div v-if="profileData.recent_order_reviews.length" class="review-list">
                        <article
                            v-for="review in profileData.recent_order_reviews"
                            :key="review.id"
                            class="review-card"
                        >
                            <div class="review-top">
                                <div>
                                    <strong>{{ review.title }}</strong>
                                    <p v-if="review.reviewer">
                                        来自
                                        {{ review.reviewer.real_name || review.reviewer.username }}
                                    </p>
                                </div>
                                <span class="review-score">{{ review.rating.toFixed(1) }}</span>
                            </div>
                            <div class="review-comment">
                                {{ review.comment || '该评价未填写文字内容' }}
                            </div>
                            <div
                                v-if="review.images?.length"
                                class="review-images"
                            >
                                <button
                                    v-for="(image, index) in review.images"
                                    :key="`${review.id}-${index}`"
                                    type="button"
                                    class="review-images__item"
                                    @click="openImagePreview(review.images || [], index)"
                                >
                                    <img :src="resolveAvatarUrl(image)" alt="评价图片" />
                                </button>
                            </div>
                        </article>
                    </div>
                    <div v-else class="empty-box">暂无订单评价</div>
                </section>
            </template>

            <div v-else class="state-box">
                <p>未找到该用户</p>
                <NButton type="primary" @click="router.back()">返回</NButton>
            </div>
        </main>

        <div
            v-if="previewImage"
            class="image-preview"
            @click="closeImagePreview"
        >
            <img :src="previewImage" alt="预览图片" class="image-preview__image" />
        </div>
    </div>
</template>

<script setup lang="ts">
import { computed, onMounted, ref } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { NButton, NSpin, useMessage } from 'naive-ui';
import { UserApi } from '@/api';
import { useAppStore } from '@/stores';
import type { UserPublicProfile } from '@/types';

const route = useRoute();
const router = useRouter();
const message = useMessage();
const appStore = useAppStore();

const loading = ref(true);
const profileData = ref<UserPublicProfile | null>(null);
const previewImage = ref('');

const userId = computed(() => Number(route.params.id || 0));
const displayName = computed(
    () => profileData.value?.user.real_name || profileData.value?.user.username || '匿名用户'
);

const resolveAvatarUrl = (value?: string | null) => {
    if (!value) return undefined;
    if (/^https?:\/\//i.test(value) || value.startsWith('data:')) return value;
    if (value.startsWith('/uploads/')) return `${window.location.origin}${value}`;
    return value;
};

const openImagePreview = (images: string[], index: number) => {
    const target = images[index];
    previewImage.value = resolveAvatarUrl(target) || '';
};

const closeImagePreview = () => {
    previewImage.value = '';
};

const fetchProfile = async () => {
    if (!userId.value) {
        loading.value = false;
        return;
    }

    loading.value = true;
    try {
        const response = await UserApi.getPublicProfile(userId.value);
        if (!response.success || !response.data) {
            throw new Error(response.message || '获取用户详情失败');
        }
        profileData.value = response.data;
    } catch (error: any) {
        profileData.value = null;
        message.error(error?.message || '获取用户详情失败');
    } finally {
        loading.value = false;
    }
};

onMounted(() => {
    void fetchProfile();
});
</script>

<style scoped>
.user-profile-page {
    min-height: 100vh;
    background: linear-gradient(180deg, #f4f7fb 0%, #edf2fa 100%);
    color: #172033;
}
.is-dark {
    background: linear-gradient(180deg, #0f172a 0%, #162336 100%);
    color: #e2e8f0;
}
.profile-nav {
    position: sticky;
    top: 0;
    z-index: 20;
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 14px 16px;
    background: rgba(255, 255, 255, 0.88);
    backdrop-filter: blur(14px);
    border-bottom: 1px solid rgba(23, 32, 51, 0.06);
}
.is-dark .profile-nav {
    background: rgba(15, 23, 42, 0.88);
    border-color: rgba(255, 255, 255, 0.06);
}
.profile-nav h1 {
    margin: 0;
    font-size: 18px;
    font-weight: 700;
}
.back-btn,
.nav-placeholder {
    width: 42px;
    height: 42px;
    border-radius: 14px;
    flex-shrink: 0;
}
.back-btn {
    border: none;
    background: #fff;
    color: #4a5d79;
    display: inline-flex;
    align-items: center;
    justify-content: center;
}
.profile-shell {
    max-width: 860px;
    margin: 0 auto;
    padding: 18px 16px 32px;
    display: grid;
    gap: 16px;
}
.state-box {
    min-height: 55vh;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    gap: 12px;
    color: #738198;
}
.hero-card,
.section-card,
.stat-card {
    background: rgba(255, 255, 255, 0.96);
    border-radius: 24px;
    box-shadow: 0 16px 40px rgba(23, 48, 79, 0.08);
}
.is-dark .hero-card,
.is-dark .section-card,
.is-dark .stat-card {
    background: rgba(30, 41, 59, 0.96);
    box-shadow: none;
}
.hero-card {
    padding: 20px;
    display: grid;
    gap: 18px;
}
.hero-main {
    display: flex;
    gap: 14px;
    align-items: flex-start;
}
.profile-avatar {
    width: 68px;
    height: 68px;
    min-width: 68px;
    min-height: 68px;
    border-radius: 999px;
    overflow: hidden;
    display: inline-flex;
    align-items: center;
    justify-content: center;
    background: linear-gradient(135deg, #dbeafe, #e2e8f0);
    color: #475569;
    font-weight: 700;
    font-size: 24px;
}
.profile-avatar img {
    width: 100%;
    height: 100%;
    object-fit: cover;
    display: block;
}
.hero-copy {
    flex: 1;
    min-width: 0;
}
.name-row {
    display: flex;
    align-items: center;
    gap: 10px;
    flex-wrap: wrap;
}
.name-row strong {
    font-size: 24px;
    font-weight: 800;
}
.verified-badge {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    height: 26px;
    padding: 0 10px;
    border-radius: 999px;
    background: #dcfce7;
    color: #15803d;
    font-size: 12px;
    font-weight: 700;
}
.hero-copy p,
.hero-copy span {
    display: block;
    margin-top: 6px;
    color: #7c8ca5;
    line-height: 1.6;
}
.score-panel {
    display: grid;
    grid-template-columns: repeat(3, minmax(0, 1fr));
    gap: 10px;
}
.score-item {
    padding: 14px;
    border-radius: 18px;
    background: #f8fbff;
    border: 1px solid #e6edf7;
}
.score-item span {
    display: block;
    font-size: 12px;
    color: #8a96aa;
}
.score-item strong {
    display: block;
    margin-top: 6px;
    font-size: 20px;
    color: #1d4ed8;
}
.stats-grid {
    display: grid;
    grid-template-columns: repeat(2, minmax(0, 1fr));
    gap: 12px;
}
.stat-card {
    padding: 18px;
}
.stat-card span {
    display: block;
    font-size: 13px;
    color: #8a96aa;
}
.stat-card strong {
    display: block;
    margin-top: 8px;
    font-size: 26px;
    font-weight: 800;
}
.section-card {
    padding: 20px;
}
.section-head {
    display: flex;
    align-items: center;
    justify-content: space-between;
    margin-bottom: 14px;
}
.section-head h2 {
    margin: 0;
    font-size: 20px;
    font-weight: 800;
}
.section-head span {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    min-width: 30px;
    height: 30px;
    padding: 0 10px;
    border-radius: 999px;
    background: #dbe6f5;
    color: #5a6b86;
    font-size: 14px;
}
.skills-row,
.review-list {
    display: flex;
    flex-wrap: wrap;
    gap: 10px;
}
.skill-chip {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    padding: 8px 14px;
    border-radius: 999px;
    background: #eef4ff;
    color: #2f6bff;
    font-size: 13px;
    font-weight: 700;
}
.review-list {
    display: grid;
}
.review-card {
    padding: 16px;
    border-radius: 18px;
    background: #f8fbff;
    border: 1px solid #e6edf7;
}
.review-top {
    display: flex;
    align-items: flex-start;
    justify-content: space-between;
    gap: 12px;
}
.review-top strong {
    font-size: 15px;
}
.review-top p {
    margin: 6px 0 0;
    color: #8a96aa;
    font-size: 13px;
}
.review-score {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    min-width: 52px;
    height: 34px;
    padding: 0 12px;
    border-radius: 999px;
    background: #fff1d6;
    color: #d97706;
    font-weight: 800;
}
.review-comment {
    margin-top: 12px;
    font-size: 14px;
    line-height: 1.75;
    color: #40516a;
    white-space: pre-wrap;
    word-break: break-word;
}
.review-images {
    display: grid;
    grid-template-columns: repeat(3, minmax(0, 1fr));
    gap: 10px;
    margin-top: 12px;
}
.review-images__item {
    border: none;
    padding: 0;
    border-radius: 14px;
    overflow: hidden;
    background: #e6eefb;
    aspect-ratio: 1;
}
.review-images__item img {
    width: 100%;
    height: 100%;
    object-fit: cover;
    display: block;
}
.image-preview {
    position: fixed;
    inset: 0;
    z-index: 40;
    display: flex;
    align-items: center;
    justify-content: center;
    background: rgba(15, 23, 42, 0.82);
    padding: 24px;
}
.image-preview__image {
    max-width: min(92vw, 720px);
    max-height: 82vh;
    border-radius: 18px;
    object-fit: contain;
    box-shadow: 0 18px 48px rgba(0, 0, 0, 0.35);
}
.empty-box {
    padding: 18px;
    border-radius: 18px;
    background: #f8fbff;
    color: #8a96aa;
    text-align: center;
}
@media (max-width: 640px) {
    .profile-shell {
        padding: 14px 12px 28px;
    }
    .hero-card,
    .section-card,
    .stat-card {
        border-radius: 20px;
    }
    .score-panel,
    .stats-grid {
        grid-template-columns: repeat(2, minmax(0, 1fr));
    }
    .score-item:first-child {
        grid-column: 1 / -1;
    }
}
</style>

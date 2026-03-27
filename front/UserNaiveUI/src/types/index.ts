// 基础响应类型
export interface ApiResponse<T = any> {
    success: boolean;
    message?: string;
    data?: T;
    code?: string;
    pagination?: PaginationMeta;
}

export interface PaginationMeta {
    current_page: number;
    per_page: number;
    total: number;
    total_pages: number;
    has_next: boolean;
    has_prev: boolean;
}

// 用户相关类型
export interface User {
    id: number;
    student_id: string;
    username: string;
    email: string;
    is_deliverer?: boolean;
    deliverer_id?: number | null;
    phone?: string;
    real_name?: string;
    avatar?: string;
    gender?: 'male' | 'female' | 'other';
    birthday?: string;
    college?: string;
    major?: string;
    grade?: string;
    dormitory?: string;
    bio?: string;
    skills?: string[];
    points: number;
    level: number;
    balance: number;
    rating: number;
    completed_orders: number;
    completed_tasks: number;
    status: 'active' | 'inactive' | 'banned';
    email_verified: boolean;
    phone_verified: boolean;
    student_verified: boolean;
    student_verified_at?: string | null;
    verification_data?: {
        status?: 'pending' | 'approved' | 'rejected';
        student_card?: string | null;
        submitted_at?: string | null;
        reviewed_at?: string | null;
        review_reason?: string | null;
    } | null;
    wechat_openid?: string;
    last_login_at?: string;
    last_login_ip?: string;
    createdAt: string;
    updatedAt: string;
}

// 用户注册数据
export interface UserRegisterData {
    student_id: string;
    username: string;
    email: string;
    password: string;
    phone?: string;
    real_name?: string;
    college?: string;
    major?: string;
    grade?: string;
}

// 用户登录数据
export interface UserLoginData {
    email: string; // 邮箱或学号
    password: string;
}

// 代取订单类型
export interface PickupOrderItem {
    id?: number | null;
    order_id?: number;
    item_index: number;
    pickup_code?: string | null;
    phone_tail?: string | null;
    weight?: number | null;
    size?: string | null;
}

export interface PickupOrder {
    id: number;
    order_no: string;
    user_id: number;
    deliverer_id?: number;
    type: 'express' | 'food' | 'medicine' | 'daily';
    title: string;
    description?: string;
    pickup_location: string;
    delivery_location: string;
    pickup_locations?: string[];
    delivery_locations?: string[];
    pickup_time?: string;
    delivery_time?: string;
    contact_name: string;
    contact_phone: string;
    pickup_code?: string;
    weight?: number;
    size?: string;
    items?: PickupOrderItem[];
    price: number;
    tip: number;
    urgent: boolean;
    fragile: boolean;
    status: 'pending' | 'accepted' | 'picking' | 'delivering' | 'completed' | 'cancelled';
    payment_status: 'unpaid' | 'paid' | 'refunded';
    images?: string[];
    notes?: string;
    rating?: number;
    rating_comment?: string;
    accept_time?: string;
    pickup_complete_time?: string;
    pickup_photo?: string;
    delivery_complete_time?: string;
    delivery_photo?: string;
    cancel_reason?: string;
    cancel_time?: string;
    user?: User;
    deliverer?: User;
    delivererInfo?: any;
    createdAt: string;
    updatedAt: string;
}

// 创建代取订单数据
export interface CreatePickupOrderData {
    type: 'express' | 'food' | 'medicine' | 'daily';
    title: string;
    description?: string;
    pickup_location: string;
    delivery_location: string;
    pickup_time?: string;
    delivery_time?: string;
    contact_name: string;
    contact_phone: string;
    pickup_code?: string;
    weight?: number;
    size?: string;
    items?: PickupOrderItem[];
    price: number;
    tip?: number;
    urgent?: boolean;
    fragile?: boolean;
    is_anonymous?: boolean;
    images?: string[];
    notes?: string;
    payment_password?: string;
}

export type TaskCancellationStatus = 'none' | 'pending' | 'rejected' | 'accepted' | 'disputed';

// 任务类型
export interface Task {
    id: number;
    task_no: string;
    publisher_id: number;
    assignee_id?: number;
    category: 'study' | 'design' | 'tech' | 'writing' | 'life';
    title: string;
    description: string;
    requirements?: string;
    tags?: string[];
    skills_required?: string[];
    price: number;
    location?: string;
    start_time?: string;
    deadline: string;
    estimated_duration?: number;
    max_applicants: number;
    urgent: boolean;
    remote_work: boolean;
    status: 'pending' | 'published' | 'in_progress' | 'completed' | 'cancelled' | 'expired';
    payment_status: 'unpaid' | 'paid' | 'refunded';
    images?: string[];
    attachments?: string[];
    rating?: number;
    rating_comment?: string;
    has_reviewed?: boolean;
    accept_time?: string;
    submit_time?: string;
    complete_time?: string;
    cancel_reason?: string;
    cancellation_status?: TaskCancellationStatus;
    cancellation_initiator_id?: number | null;
    cancellation_reason?: string | null;
    cancellation_compensation?: number | null;
    cancellation_requested_at?: string | null;
    cancellation_expires_at?: string | null;
    cancellation_responded_at?: string | null;
    cancellation_ticket_id?: number | null;
    view_count: number;
    publisher?: User;
    assignee?: User;
    applications?: TaskApplication[];
    has_applied?: boolean;
    current_user_application_status?: 'pending' | 'accepted' | 'rejected' | null;
    current_user_application?: TaskApplication | null;
    createdAt: string;
    updatedAt: string;
}

// 创建任务数据
export interface CreateTaskData {
    category: 'study' | 'design' | 'tech' | 'writing' | 'life';
    title: string;
    description: string;
    requirements?: string;
    tags?: string[];
    skills_required?: string[];
    price: number;
    location?: string;
    start_time?: string;
    deadline: string;
    estimated_duration?: number;
    max_applicants?: number;
    urgent?: boolean;
    remote_work?: boolean;
    images?: string[];
    attachments?: string[];
}

// 任务申请类型
export interface TaskApplication {
    id: number;
    task_id: number;
    applicant_id: number;
    message?: string;
    expected_completion_time?: string;
    status: 'pending' | 'accepted' | 'rejected';
    applied_at: string;
    processed_at?: string;
    task?: Task;
    applicant?: User;
    applicant_profile?: UserReviewStats;
    createdAt: string;
    updatedAt: string;
}

export interface UserReviewStats {
    overall_rating: number;
    task_rating: number;
    order_rating: number;
    total_task_reviews: number;
    total_order_reviews: number;
    completed_tasks: number;
    completed_orders: number;
    published_tasks: number;
    published_orders: number;
}

export interface UserPublicProfile {
    user: User;
    stats: UserReviewStats;
    recent_task_reviews: Array<{
        id: number;
        rating: number;
        comment?: string;
        title: string;
        createdAt: string;
        publisher?: Pick<User, 'id' | 'username' | 'real_name' | 'avatar'>;
    }>;
    recent_order_reviews: Array<{
        id: number;
        rating: number;
        comment?: string;
        images?: string[];
        title: string;
        createdAt: string;
        reviewer?: Pick<User, 'id' | 'username' | 'real_name' | 'avatar'>;
    }>;
}

// 论坛帖子类型
export interface ForumPost {
    id: number;
    author_id: number;
    category: 'academic' | 'life' | 'campus' | 'task' | 'skill';
    title: string;
    content: string;
    summary?: string;
    tags?: string[];
    images?: string[];
    attachments?: string[];
    is_anonymous: boolean;
    is_pinned: boolean;
    is_hot: boolean;
    isAnonymous?: boolean;
    isPinned?: boolean;
    isHot?: boolean;
    status: 'published' | 'draft' | 'pending_review' | 'rejected' | 'hidden';
    view_count: number;
    like_count: number;
    comment_count: number;
    share_count: number;
    viewCount?: number;
    likeCount?: number;
    commentCount?: number;
    shareCount?: number;
    last_comment_time?: string;
    lastCommentTime?: string;
    reject_reason?: string;
    rejectReason?: string;
    author?: User;
    comments?: ForumComment[];
    createdAt: string;
    updatedAt: string;
    created_at?: string;
    updated_at?: string;
}

// 创建论坛帖子数据
export interface CreateForumPostData {
    category: 'academic' | 'life' | 'campus' | 'task' | 'skill';
    title: string;
    content: string;
    summary?: string;
    tags?: string[];
    images?: string[];
    attachments?: string[];
    is_anonymous?: boolean;
    status?: 'published' | 'draft' | 'pending_review';
}

// 论坛评论类型
export interface ForumComment {
    id: number;
    post_id: number;
    author_id: number;
    parent_id?: number;
    reply_to_id?: number;
    content: string;
    images?: string[];
    like_count: number;
    likeCount?: number;
    status: 'published' | 'hidden';
    author?: User;
    replyToUser?: User;
    replies?: ForumComment[];
    createdAt: string;
    updatedAt: string;
    created_at?: string;
    updated_at?: string;
}

// 用户统计数据
export interface UserStats {
    orders: {
        published: number;
        completed: number;
    };
    tasks: {
        published: number;
        completed: number;
    };
    forum: {
        posts: number;
        likes: number;
    };
}

// 分页参数
export interface PaginationParams {
    page?: number;
    limit?: number;
    sortBy?: string;
    sortOrder?: 'asc' | 'desc';
}

// 分页响应
export interface PaginatedResponse<T> {
    items: T[];
    total: number;
    page: number;
    limit: number;
    totalPages: number;
}

// 筛选参数类型
export interface PickupOrderFilters extends PaginationParams {
    type?: 'express' | 'food' | 'medicine' | 'daily';
    status?: 'pending' | 'accepted' | 'picking' | 'delivering' | 'completed' | 'cancelled';
    urgent?: boolean;
    priceMin?: number;
    priceMax?: number;
    location?: string;
}

export interface TaskFilters extends PaginationParams {
    category?: 'study' | 'design' | 'tech' | 'writing' | 'life';
    status?: 'pending' | 'published' | 'in_progress' | 'completed' | 'cancelled' | 'expired';
    urgent?: boolean;
    remote_work?: boolean;
    priceMin?: number;
    priceMax?: number;
    skills?: string[];
    location?: string;
}

export interface ForumPostFilters extends PaginationParams {
    category?: 'academic' | 'life' | 'campus' | 'task' | 'skill';
    status?: 'published' | 'draft' | 'pending_review' | 'rejected' | 'hidden';
    is_hot?: boolean;
    is_pinned?: boolean;
    author_id?: number;
    tags?: string[];
}

// 登录响应
export interface LoginResponse {
    user: User;
    token: string;
}

export interface WalletData {
    id: number;
    balance: number;
    frozen_balance: number;
    total_income: number;
    total_expense: number;
    points: number;
    status: 'active' | 'frozen' | 'suspended';
    payment_password_set: boolean;
    last_transaction_at?: string | null;
}

export interface WalletActivity {
    id: string;
    source: 'transaction' | 'pickup_order' | 'task';
    type: string;
    direction: 'in' | 'out';
    amount: number;
    title: string;
    description: string;
    time: string;
    status: string;
    related_type?: string | null;
    related_id?: number | null;
    payment_method?: string | null;
    third_party_no?: string | null;
    balance_after?: number | null;
    commission_rate?: number | null;
    commission_amount?: number | null;
    actual_amount?: number | null;
}

export interface WalletDelivererStats {
    enabled: boolean;
    deliverer_id: number | null;
    is_online: boolean;
    rating: number;
    total_orders: number;
    completed_orders: number;
    total_income: number;
    month_income: number;
    today_income: number;
    pending_income: number;
}

export interface WalletOverview {
    wallet: WalletData;
    summary: {
        available_balance: number;
        frozen_balance: number;
        total_income: number;
        total_expense: number;
        month_income: number;
        month_expense: number;
        pending_settlement: number;
        points: number;
        last_transaction_at?: string | null;
    };
    deliverer: WalletDelivererStats;
    recent_activities: WalletActivity[];
}

export interface WalletActivitiesResponse {
    items: WalletActivity[];
    summary: {
        income: number;
        expense: number;
        count: number;
    };
}

export interface DelivererApplication {
    id: number;
    user_id: number;
    real_name: string;
    phone: string;
    id_card: string;
    vehicle_type: 'bike' | 'electric' | 'walk' | 'car';
    vehicle_number?: string | null;
    emergency_contact_name: string;
    emergency_contact_phone: string;
    service_areas?: string[] | null;
    available_hours?: string[] | null;
    id_card_front?: string | null;
    id_card_back?: string | null;
    application_status: 'pending' | 'approved' | 'rejected' | 'banned';
    rejection_reason?: string | null;
    verified: boolean;
    rating: number;
    total_orders: number;
    completed_orders: number;
    total_earnings: number;
    is_online: boolean;
    status: 'active' | 'inactive' | 'suspended';
    createdAt?: string;
    updatedAt?: string;
}

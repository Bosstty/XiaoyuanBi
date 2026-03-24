# 哈尔滨学院校园综合服务平台

一个专为哈尔滨学院学生打造的校园生活服务平台，提供代取服务、任务发布、校园论坛等功能，让校园生活更便捷。

## 项目概述

本平台采用前后端分离架构，包含用户端、管理端和后端API三个主要部分：

- **用户端 (UserClient)**: 面向学生的移动端友好界面
- **管理端 (AdminClient)**: 面向管理员的后台管理系统
- **后端API (back)**: 提供完整的RESTful API服务

## 核心功能

### 🚚 代取服务模块

- **快递代取**: 快递包裹代收代取服务
- **外卖代取**: 各类外卖代取配送
- **药品代购**: 校医院药品代购服务
- **生活用品代购**: 日用品采购配送

### 💼 学生任务发布模块

- **学习类任务**: 课业辅导、笔记整理、学术研究
- **设计类任务**: 海报设计、Logo制作、视频剪辑
- **技术类任务**: 编程开发、网站建设、系统维护
- **文案类任务**: 文章撰写、方案策划、翻译服务
- **生活服务类任务**: 排队代办、文件处理、清洁服务

### 💬 校园论坛模块

- **学术交流板块**: 学术讨论和知识分享
- **生活服务板块**: 二手市场、失物招领
- **校园动态板块**: 校园新闻和活动信息
- **任务交流专区**: 任务相关讨论区
- **技能分享社区**: 技能展示和经验分享

### 👤 用户中心模块

- 用户认证和个人信息管理
- 技能认证体系
- 订单和任务管理
- 积分等级系统
- 财务管理（虚拟货币）
- 消息通知中心

### 🛠️ 管理后台模块

- 用户和配送员管理
- 订单和任务监控
- 论坛内容管理
- 系统配置设置
- 数据分析报告
- 客服系统

## 技术架构

### 前端技术栈

- **框架**: Vue 3 + Vite
- **状态管理**: Pinia
- **路由**: Vue Router 4
- **UI**: 响应式设计，移动端优先
- **构建工具**: Vite

### 后端技术栈

- **框架**: Koa.js 2.x
- **数据库**: MySQL 8.0 + Sequelize ORM
- **认证**: JWT + bcryptjs
- **缓存**: Redis
- **日志**: Winston
- **实时通信**: Socket.io

### 核心特性

- 微信OAuth集成用于学生登录
- 学生身份验证系统
- 实时订单跟踪
- 技能认证和评分系统
- 虚拟货币支付系统
- 智能任务匹配算法
- 多角色权限管理

## 快速开始

### 环境要求

- Node.js >= 16.0.0
- MySQL >= 8.0
- Redis >= 6.0 (可选)

### 1. 克隆项目

```bash
git clone <repository-url>
cd XiaoyuanBi
```

### 2. 后端设置

```bash
cd back
npm install
cp .env.example .env
# 编辑 .env 文件配置数据库等信息
npm run migrate  # 数据库迁移
npm run seed     # 创建初始数据
npm run dev      # 启动开发服务器
```

### 3. 前端设置

用户端：

```bash
cd front/UserClient
npm install
npm run dev
```

管理端：

```bash
cd front/AdminClient
npm install
npm run dev
```

### 4. 访问应用

- 用户端: http://localhost:5173
- 管理端: http://localhost:5174
- 后端API: http://localhost:3000
- API文档: http://localhost:3000/api/docs

## 项目结构

```
XiaoyuanBi/
├── back/                          # 后端API服务
│   ├── src/
│   │   ├── controllers/           # 控制器
│   │   ├── models/               # 数据模型
│   │   ├── routes/               # 路由定义
│   │   ├── middleware/           # 中间件
│   │   ├── utils/                # 工具函数
│   │   └── config/               # 配置文件
│   ├── app.js                    # 应用入口
│   └── package.json
├── front/
│   ├── UserClient/               # 用户端应用
│   │   ├── src/
│   │   │   ├── views/            # 页面组件
│   │   │   ├── components/       # 可复用组件
│   │   │   ├── stores/           # Pinia状态管理
│   │   │   ├── router/           # 路由配置
│   │   │   ├── api/              # API接口
│   │   │   └── utils/            # 工具函数
│   │   └── package.json
│   └── AdminClient/              # 管理端应用
│       ├── src/
│       │   ├── views/            # 管理页面
│       │   ├── components/       # 管理组件
│       │   └── ...
│       └── package.json
├── CLAUDE.md                     # 项目指导文档
└── README.md                     # 项目说明文档
```

## 开发指南

### 代码规范

- 遵循 ESLint 和 Prettier 配置
- 使用 TypeScript 类型注解（可选）
- 组件和文件命名采用 PascalCase
- API 接口遵循 RESTful 规范

### 数据库设计

项目采用完整的关系型数据库设计，包含：

- 用户表 (users)
- 管理员表 (admins)
- 代取订单表 (pickup_orders)
- 任务表 (tasks)
- 任务申请表 (task_applications)
- 论坛帖子表 (forum_posts)
- 论坛评论表 (forum_comments)

### API接口

后端提供完整的RESTful API，包括：

- 用户认证接口
- 代取服务接口
- 任务管理接口
- 论坛功能接口
- 管理后台接口

## 部署说明

### 生产环境部署

1. 配置生产环境变量
2. 构建前端应用
3. 配置Nginx反向代理
4. 使用PM2管理Node.js进程
5. 配置MySQL和Redis
6. 设置HTTPS和域名

### Docker部署

项目支持Docker容器化部署，可使用Docker Compose一键部署整个技术栈。

## 重要业务规则

- 所有用户必须是经过验证的哈尔滨学院学生
- 配送员需要单独的认证流程
- 任务需要通过审批工作流
- 财务交易使用虚拟货币系统
- 所有活动都有日志记录用于安全和分析
- 基于技能的任务分配系统

## 贡献指南

1. Fork 项目
2. 创建功能分支
3. 提交代码更改
4. 创建 Pull Request
5. 代码审查和合并

## 许可证

MIT License

## 联系方式

如有问题或建议，请提交 Issue 或联系开发团队。

---

**注意**: 这是一个为大学校园生活服务的平台，强调学生身份验证和安全性。该平台具有复杂的多角色系统（学生、配送员、管理员）以及与外部服务（快递公司、外卖平台）的集成能力。同时具备全面的用户评分和信誉系统。

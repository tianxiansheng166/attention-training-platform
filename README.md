# 专注力星球 - 青少年专注力训练平台

## 项目版本

本仓库包含两个版本的项目：

```
attention-training-platform/
├── v1/                          # 版本1 - 当前稳定版本
│   ├── backend/                 # 后端服务
│   ├── frontend/                # 前端静态资源
│   ├── DEPLOYMENT.md            # 部署文档
│   └── VERSION_PLAN.md          # 版本规划
│
├── v2/                          # 版本2 - 重构版本（开发中）
│   └── .gitkeep
│
├── scripts/                     # 部署脚本
├── .gitignore
├── CHANGELOG.md
├── CONTRIBUTING.md
└── README.md
```

---

## V1 - 当前稳定版本

基于认知科学的游戏化专注力训练平台，适用于3-18岁的儿童和青少年。

### 核心功能

- **八大训练游戏**：时空密码、星际拦截、密林寻踪、要塞守望、舒尔特方格、Stroop、听觉追踪、双任务训练
- **用户认证系统**：注册、登录、JWT认证
- **家长端功能**：绑定孩子账号、查看成长报告
- **智能任务工坊**：AI将复杂任务分解为小步骤
- **成长报告**：数据可视化与AI个性化评语

### 技术栈

- **前端**：HTML5 + CSS3 + JavaScript ES6+
- **后端**：Node.js + Express.js
- **数据库**：SQLite (开发) / PostgreSQL (生产)
- **进程管理**：PM2

### 快速开始

```bash
# 进入v1目录
cd v1/backend

# 安装依赖
npm install

# 配置环境变量
cp .env.example .env
# 编辑 .env 文件

# 启动服务
npm start
```

### 部署文档

详细部署指南请查看 [v1/DEPLOYMENT.md](v1/DEPLOYMENT.md)

---

## V2 - 重构版本（开发中）

正在规划中，将采用更现代化的技术栈。

---

## 许可证

本项目采用 MIT 许可证开源。

---

**当前版本**：v1.6  
**更新日期**：2026-05-20  
**维护团队**：专注力星球开发团队

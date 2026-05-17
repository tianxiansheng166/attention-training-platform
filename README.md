# 🎯 专注力星球 - 青少年专注力训练平台

## 📋 项目概述

专注力星球是一个基于认知科学的游戏化专注力训练平台，适用于3-18岁的儿童和青少年。平台整合了心理学经典实验范式与AI技术，通过有趣的游戏帮助用户提升专注力与执行功能。

## ✨ 核心功能

- **四大训练游戏**：时空密码、星际拦截、密林寻踪、要塞守望
- **智能任务工坊**：AI将复杂任务分解为小步骤
- **成长报告**：数据可视化与AI个性化评语
- **初始定级**：自适应难度匹配
- **学龄前具身训练**（开发中）

## 🏗️ 技术架构

### 整体架构

```
┌─────────────────────────────────────────┐
│              前端（静态资源）              │
│   HTML5 + CSS3 + JavaScript ES6+        │
└─────────────────────────────────────────┘
                    ↓ HTTP
┌─────────────────────────────────────────┐
│          后端服务（Node.js）              │
│   Express.js + PM2进程管理               │
└─────────────────────────────────────────┘
                    ↓
    ┌───────────────┬───────────────┐
    ↓               ↓               ↓
DeepSeek API   文件系统       Nginx反向代理
```

### 目录结构

```
attention-training-platform/
├── frontend/                  # 前端静态资源
│   ├── index.html           # 首页
│   ├── game-nback.html      # 时空密码游戏
│   ├── game-stop.html       # 星际拦截游戏
│   ├── task-workshop.html   # 智能任务工坊
│   ├── growth-report.html   # 成长报告
│   ├── css/                 # 样式文件
│   └── js/                  # JavaScript文件
├── backend/                  # 后端服务
│   ├── src/
│   │   ├── index.js        # 服务入口
│   │   ├── routes/          # API路由
│   │   └── services/        # 业务逻辑
│   ├── package.json         # 依赖配置
│   └── .env.example         # 环境变量示例
├── scripts/                  # 部署脚本
│   └── deploy.sh            # 一键部署脚本
└── README.md                 # 项目文档
```

## 🎯 阿里云宝塔面板一键部署指南

本指南专门为阿里云轻量应用服务器（宝塔Linux面板）编写，确保您能够快速、稳定地部署专注力星球平台。

---

### 📋 部署前准备

#### 1. 登录宝塔面板

服务器购买成功后，您会收到以下信息：
- 服务器公网IP地址
- 宝塔面板登录地址（通常为 https://IP:8888）
- 宝塔面板账号密码

打开浏览器访问宝塔面板登录地址，使用收到的账号密码登录。

#### 2. 首次登录配置

首次登录宝塔面板时，系统会提示您：
- 绑定宝塔账号（可跳过）
- 安装推荐软件包

**推荐安装以下软件：**
- Nginx（Web服务器）
- Node.js版本管理器（可选）

#### 3. 开放必要端口

在宝塔面板左侧菜单找到 **安全** → **防火墙**，添加以下规则：
- 端口：8888，协议：TCP（宝塔面板）
- 端口：80，协议：TCP（HTTP）
- 端口：443，协议：TCP（HTTPS）
- 端口：3000，协议：TCP（后端API）

---

### 🚀 开始部署

#### 方式一：图形化部署（推荐新手）

**第一步：上传项目文件**

1. 在宝塔面板左侧点击 **文件**
2. 导航到 `/www/wwwroot/` 目录
3. 点击 **上传**，将 `attention-training-platform` 文件夹整体上传
4. 等待上传完成

**第二步：安装Node.js**

如果服务器尚未安装Node.js：

1. 在宝塔面板左侧点击 **终端**
2. 执行以下命令安装Node.js 18.x：

```bash
# 更新系统
yum update -y

# 安装Node.js 18.x
curl -fsSL https://rpm.nodesource.com/setup_18.x | bash -
yum install -y nodejs

# 验证安装
node --version
npm --version
```

**第三步：安装PM2进程管理器**

```bash
# 安装PM2
npm install -g pm2

# 验证安装
pm2 --version
```

**第四步：配置后端**

1. 在宝塔文件管理器中打开 `/www/wwwroot/attention-training-platform/backend/`
2. 右键创建新文件 `.env`，内容如下：

```env
PORT=3000
NODE_ENV=production
DEEPSEEK_API_KEY=您的DeepSeek_API密钥
ALLOWED_ORIGINS=http://您的服务器IP或域名
```

3. 在终端中执行：

```bash
cd /www/wwwroot/attention-training-platform/backend
npm install
```

**第五步：启动后端服务**

```bash
cd /www/wwwroot/attention-training-platform/backend
pm2 start src/index.js --name attention-training
pm2 save
pm2 startup
```

**第六步：创建网站**

1. 在宝塔面板左侧点击 **网站**
2. 点击 **添加站点**
3. 配置如下：
   - 域名：填写您的服务器IP（如 1.2.3.4）或已备案域名
   - 根目录：`/www/wwwroot/attention-training-platform/frontend`
   - PHP版本：选择"纯静态"
4. 点击 **提交**

**第七步：配置反向代理**

1. 在网站列表中找到刚创建的站点，点击 **设置**
2. 点击 **反向代理** → **添加反向代理**
3. 配置：
   - 代理名称：API代理
   - 目标URL：`http://127.0.0.1:3000`
   - 发送域名：`$host`
4. 点击 **提交**

**第八步：配置静态文件缓存**

1. 在网站设置中点击 **配置文件**
2. 在 `server` 块内添加以下内容：

```nginx
# 静态资源缓存
location ~* \.(jpg|jpeg|png|gif|ico|css|js|svg|woff|woff2|ttf|eot)$ {
    expires 7d;
    add_header Cache-Control "public, immutable";
}

# Gzip压缩
gzip on;
gzip_types text/plain text/css application/json application/javascript text/xml application/xml;
gzip_min_length 1024;
```

3. 点击 **保存**

#### 方式二：自动化脚本部署

**第一步：上传项目**

使用宝塔文件管理器或SFTP将项目上传到 `/www/wwwroot/attention-training-platform/`

**第二步：执行部署脚本**

1. 在宝塔面板打开终端
2. 执行以下命令：

```bash
cd /www/wwwroot/attention-training-platform/scripts
chmod +x deploy.sh
./deploy.sh
```

3. 脚本将自动完成：系统更新 → Node.js安装 → 依赖配置 → 服务启动 → Nginx配置

**第三步：手动配置网站**

部署脚本完成后，仍需在宝塔面板手动创建网站并配置反向代理（参见方式一第五至八步）。

---

### ⚙️ 宝塔面板专项配置

#### Nginx配置优化

在网站设置 → 配置文件中，将以下内容添加到 `http` 块中：

```nginx
http {
    # 客户端上传文件大小限制
    client_max_body_size 50M;
    
    # 请求超时时间
    client_body_timeout 120s;
    
    # Gzip压缩级别
    gzip_comp_level 6;
}
```

#### PHP配置（如需）

虽然本项目为纯静态前端+Node.js后端，无需PHP，但如有其他站点需要：

1. 在宝塔面板 **软件商店** 中安装 PHP（推荐PHP 8.0）
2. 为每个站点选择对应的PHP版本

#### SSL证书配置

**方法一：宝塔一键SSL**

1. 在网站设置中点击 **SSL**
2. 选择 **Let's Encrypt**
3. 勾选域名，点击 **申请**
4. 申请成功后开启 **强制HTTPS**

**方法二：手动配置已有证书**

1. 将证书文件（.crt）和私钥（.key）上传到 `/www/ssl/`
2. 在网站SSL设置中选择 **其他证书**
3. 粘贴证书和私钥内容
4. 点击 **保存** 并开启 **强制HTTPS**

---

### 🔧 运维管理

#### 查看服务状态

```bash
pm2 status
```

预期输出：
```
┌──────┬──────────────────┬─────────┬──────┬───────┬────────┬──────────┐
│ id   │ name             │ mode    │ ↺    │ status│ cpu    │ memory   │
├──────┼──────────────────┼─────────┼──────┼───────┼────────┼──────────┤
│ 0    │ attention-training│ fork    │ 0    │ online│ 0.5%   │ 85MB     │
└──────┴──────────────────┴─────────┴──────┴───────┴────────┴──────────┘
```

#### 查看日志

```bash
pm2 logs attention-training
```

#### 重启服务

```bash
pm2 restart attention-training
```

#### 停止服务

```bash
pm2 stop attention-training
```

---

### 🛡️ 安全加固

#### 1. 修改宝塔面板端口

1. 面板设置 → 面版端口 → 修改为非8888端口
2. 同时在防火墙中删除8888端口规则

#### 2. 配置防火墙

在阿里云控制台安全组中：
- 仅开放必要端口（80、443、22）
- SSH端口建议改为非22端口
- 限制管理端口仅允许特定IP访问

#### 3. 定期更新

```bash
# 每月执行一次
yum update -y
npm update -g pm2
pm2 restart attention-training
```

---

### ❌ 常见问题排查

#### 问题1：页面显示空白

**可能原因：**
- 反向代理未正确配置
- 静态文件路径错误

**解决方法：**
1. 检查反向代理是否指向 `http://127.0.0.1:3000`
2. 确认网站根目录为 `/www/wwwroot/attention-training-platform/frontend`
3. 检查 `pm2 status` 确认服务在线

#### 问题2：API调用失败

**可能原因：**
- 后端服务未启动
- 端口3000未开放

**解决方法：**
```bash
# 检查服务状态
pm2 status

# 检查端口监听
lsof -i:3000

# 重启服务
pm2 restart attention-training
```

#### 问题3：502 Bad Gateway

**可能原因：**
- 反向代理配置错误
- 后端服务崩溃

**解决方法：**
1. 重启后端服务：`pm2 restart attention-training`
2. 检查Nginx错误日志：`tail -f /var/log/nginx/error.log`

#### 问题4：静态资源加载失败

**可能原因：**
- CSS/JS文件路径不正确
- 文件权限问题

**解决方法：**
```bash
# 修复文件权限
chown -R www:www /www/wwwroot/attention-training-platform/frontend/
chmod -R 755 /www/wwwroot/attention-training-platform/frontend/
```

---

### 📞 获取帮助

如果在部署过程中遇到问题：

1. 查看PM2日志：`pm2 logs attention-training`
2. 查看Nginx日志：`tail -f /var/log/nginx/xxx.log`
3. 确认防火墙端口已开放
4. 检查API密钥是否正确配置

---

### 📊 部署检查清单

在完成部署后，请确认以下各项：

- [ ] 服务器可访问（ping 服务器IP）
- [ ] 宝塔面板可登录
- [ ] PM2服务显示 online
- [ ] 网站可正常访问
- [ ] 静态资源正常加载
- [ ] API代理工作正常
- [ ] SSL证书已配置（如需HTTPS）
- [ ] 防火墙规则已配置
- [ ] DeepSeek API密钥已配置

---

## 🛠️ 运维管理

### 常用命令

```nginx
server {
    listen 80;
    server_name 你的域名或IP;

    # Gzip压缩
    gzip on;
    gzip_types text/plain text/css application/json application/javascript text/xml application/xml;
    gzip_min_length 1024;

    # 上传文件大小限制
    client_max_body_size 50M;

    # Node.js后端API代理
    location /api/ {
        proxy_pass http://127.0.0.1:3000;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_read_timeout 300s;
    }

    # 静态文件服务
    location / {
        root /www/wwwroot/attention-training/frontend;
        index index.html;
        try_files $uri $uri/ /index.html;
    }

    # 静态资源缓存
    location ~* \.(jpg|jpeg|png|gif|ico|css|js|svg|woff|woff2|ttf|eot)$ {
        root /www/wwwroot/attention-training/frontend;
        expires 7d;
        add_header Cache-Control "public, immutable";
    }

    # 日志配置
    access_log /var/log/nginx/attention-training-access.log;
    error_log /var/log/nginx/attention-training-error.log;
}
```

## 🔒 安全配置

### 1. 配置防火墙

```bash
# 开放必要端口
firewall-cmd --permanent --add-port=80/tcp
firewall-cmd --permanent --add-port=443/tcp
firewall-cmd --permanent --add-port=3000/tcp
firewall-cmd --reload

# 或者使用宝塔面板的防火墙功能
```

### 2. 配置SSL证书（推荐）

```bash
# 使用Let's Encrypt免费证书
# 在宝塔面板中操作：
# 网站 → 选择你的站点 → SSL → Let's Encrypt → 申请

# 或手动申请
certbot --nginx -d your-domain.com
```

### 3. 环境变量安全

```bash
# .env文件权限
chmod 600 /www/wwwroot/attention-training/backend/.env

# 确保不在代码仓库中提交.env文件
echo ".env" >> .gitignore
```

## 🛠️ 运维管理

### 常用命令

```bash
# 查看服务状态
pm2 status

# 查看日志
pm2 logs attention-training

# 重启服务
pm2 restart attention-training

# 停止服务
pm2 stop attention-training

# 重新加载（代码更新后）
pm2 reload attention-training
```

### 日志管理

```bash
# 应用日志
pm2 logs attention-training --lines 100

# Nginx访问日志
tail -f /var/log/nginx/attention-training-access.log

# Nginx错误日志
tail -f /var/log/nginx/attention-training-error.log
```

### 备份

```bash
# 备份项目文件
tar -czvf backup-$(date +%Y%m%d).tar.gz /www/wwwroot/attention-training/

# 备份PM2进程列表
pm2 save
```

## 🔧 配置说明

### 环境变量 (.env)

```env
# 服务器端口
PORT=3000

# 运行环境
NODE_ENV=production

# DeepSeek API密钥（必填）
# 获取地址：https://platform.deepseek.com
DEEPSEEK_API_KEY=your_api_key_here

# 允许的跨域来源
ALLOWED_ORIGINS=http://你的域名,https://你的域名
```

### DeepSeek API配置

1. 访问 [DeepSeek Platform](https://platform.deepseek.com)
2. 注册账号并完成认证
3. 在控制台创建API密钥
4. 将密钥填入 `.env` 文件的 `DEEPSEEK_API_KEY`

## 📊 系统要求

### 服务器配置

- **推荐配置**：2核4G内存
- **最低配置**：1核2G内存
- **操作系统**：CentOS 7+ / Ubuntu 20.04+
- **Node.js**：16.x 或 18.x

### 网络要求

- 开放80端口（HTTP）
- 开放443端口（HTTPS，可选）
- 允许外部访问API

## 🐛 故障排查

### 服务无法启动

```bash
# 检查端口占用
lsof -i:3000

# 检查Node.js版本
node --version

# 查看详细错误日志
pm2 logs attention-training --err
```

### API调用失败

```bash
# 检查API密钥配置
cat /www/wwwroot/attention-training/backend/.env

# 测试API连接
curl -X POST http://localhost:3000/api/health
```

### 页面无法访问

```bash
# 检查Nginx状态
systemctl status nginx

# 检查Nginx配置
nginx -t

# 检查防火墙
firewall-cmd --list-all
```

## 📞 技术支持

- **问题反馈**：通过GitHub Issues提交
- **功能建议**：欢迎提交Pull Request
- **社区支持**：加入项目讨论群

## 📄 许可证

本项目采用 MIT 许可证开源。

---

**版本**：1.0.0
**更新日期**：2026-05-17
**维护团队**：专注力星球开发团队

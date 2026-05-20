# 🚀 专注力星球 v1.5 - 宝塔面板完整部署指南

## 📋 目录

- [部署前准备](#部署前准备)
- [完整部署步骤](#完整部署步骤)
- [数据库配置](#数据库配置)
- [Nginx配置优化](#nginx配置优化)
- [SSL证书配置](#ssl证书配置)
- [运维管理](#运维管理)
- [故障排查](#故障排查)

***

## 🔧 部署前准备

### 1. 服务器要求

| 配置项  | 最低配置                      | 推荐配置     |
| ---- | ------------------------- | -------- |
| CPU  | 1核                        | 2核或以上    |
| 内存   | 2GB                       | 4GB或以上   |
| 硬盘   | 20GB                      | 40GB或以上  |
| 操作系统 | CentOS 7+ / Ubuntu 20.04+ | 同左       |
| 带宽   | 1Mbps                     | 5Mbps或以上 |

### 2. 需要准备的资源

- ✅ 已安装宝塔Linux面板的服务器
- ✅ 已备案的域名（可选，可用IP直接访问）
- ✅ DeepSeek API密钥（<https://platform.deepseek.com）>
- ✅ 阿里云短信服务密钥（可选，用于家长手机号绑定）

### 3. 开放端口

在宝塔面板 → 安全 → 防火墙中添加：

| 端口   | 协议  | 用途                   |
| ---- | --- | -------------------- |
| 8888 | TCP | 宝塔面板管理端口             |
| 80   | TCP | HTTP访问               |
| 443  | TCP | HTTPS访问（推荐）          |
| 3000 | TCP | 后端API服务（仅本地访问）       |
| 5432 | TCP | PostgreSQL数据库（仅本地访问） |

***

## 📦 完整部署步骤

### 第一步：服务器环境准备

#### 1.1 安装必要软件

登录宝塔面板，在「软件商店」中安装：

1. **Nginx**（必选1.20+）
2. **PostgreSQL**（必选14+）
3. **Node.js版本管理器**（可选）

#### 1.2 安装Node.js 18.x

方式一：宝塔软件商店安装

- 在软件商店搜索「Node.js」，选择Node.js 18.x安装

方式二：命令行安装（推荐）

```bash
# 登录宝塔终端
# CentOS系统
yum install -y curl

# Ubuntu/Debian系统
apt update -y && apt install -y curl

# 安装Node.js 18.x
curl -fsSL https://rpm.nodesource.com/setup_18.x | bash -
yum install -y nodejs -y

# 验证安装
node --version  # 应该显示 v18.x.x
npm --version   # 应该显示 9.x.x
```

#### 1.3 安装PM2进程管理器

```bash
npm install -g pm2
pm2 --version
```

### 第二步：上传项目文件

1. 在宝塔面板左侧点击「文件」
2. 导航到 `/www/wwwroot/` 目录
3. 点击「上传」，将 `attention-training-platform` 文件夹整体上传
4. 等待上传完成

### 第三步：数据库配置

#### 3.1 创建PostgreSQL数据库

1. 在宝塔面板左侧点击「数据库」
2. 点击「添加数据库」
3. 配置如下：
   - 数据库名：`attention_training`
   - 用户名：\`postgres （或自定义）
   - 密码：设置强密码
   - 访问权限：本地服务器
   - 点击「提交」

#### 3.2 记录数据库信息

- 数据库主机：`localhost` 或 `127.0.0.1`
- 数据库端口：`5432`
- 数据库名：`attention_training`
- 用户名：`postgres`
- 密码：刚才设置的密码

### 第四步：配置后端环境

#### 4.1 创建环境变量文件

1. 在文件管理器中打开 `/www/wwwroot/attention-training-platform/backend/`
2. 右键点击 `.env.example`，选择「复制」
3. 将复制的文件重命名为 `.env`
4. 右键点击 `.env`，选择「编辑」
5. 填写以下内容：

```env
# 服务器配置
PORT=3000
NODE_ENV=production

# DeepSeek API配置
# 请访问 https://platform.deepseek.com 获取API密钥
DEEPSEEK_API_KEY=sk-xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx

# 允许的跨域来源（多个用逗号分隔）
ALLOWED_ORIGINS=http://您的域名或IP

# JWT配置（请修改为随机32位以上的随机字符串
JWT_SECRET=请替换为32位以上的随机字符串
JWT_EXPIRES_IN=7d

# 数据库配置
DB_HOST=localhost
DB_PORT=5432
DB_NAME=attention_training
DB_USER=postgres
DB_PASSWORD=您的数据库密码

# 家长手机号绑定（阿里云短信，如不使用可留空
ALIYUN_ACCESS_KEY_ID=
ALIYUN_ACCESS_KEY_SECRET=
ALIYUN_SMS_SIGN_NAME=专注力星球
ALIYUN_SMS_TEMPLATE_CODE=
```

#### 4.2 生成JWT\_SECRET（重要）

```bash
# 在宝塔终端执行，生成32位随机字符串
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
# 将输出的字符串填入 .env 文件中的 JWT_SECRET
```

### 第五步：安装后端依赖

```bash
cd /www/wwwroot/attention-training-platform/backend
npm install
```

### 第六步：初始化数据库表结构

```bash
cd /www/wwwroot/attention-training-platform/backend
npm run db:migrate
```

预期输出：

```
数据库连接成功！
数据库表结构创建完成！
数据库初始化完成！
```

### 第七步：启动后端服务

```bash
cd /www/wwwroot/attention-training-platform/backend

# 启动服务
pm2 start src/index.js --name attention-backend

# 保存PM2进程列表
pm2 save

# 设置开机自启
pm2 startup

# 查看服务状态
pm2 status
```

预期输出：

```
┌─────┬──────────────────┬─────────┬──────┬────────┬───────┬──────────┐
│ id  │ name             │ mode    │ ↺    │ status │ cpu   │ memory   │
├─────┼──────────────────┼─────────┼──────┼────────┼───────┼──────────┤
│ 0   │ attention-backend│ fork    │ 0    │ online │ 0.5%  │ 85MB     │
└─────┴──────────────────┴─────────┴──────┴────────┴───────┴──────────┘
```

### 第八步：创建网站并配置Nginx

#### 8.1 创建站点

1. 在宝塔面板左侧点击「网站」
2. 点击「添加站点」
3. 配置如下：
   - 域名：填写您的服务器IP（如 \`1.2.3.4）或已备案域名
   - 根目录：`/www/wwwroot/attention-training-platform/frontend`
   - PHP版本：纯静态
4. 点击「提交」

#### 8.2 配置反向代理

1. 在网站列表中找到刚创建的站点，点击「设置」
2. 点击「反向代理」→「添加反向代理」
3. 配置：
   - 代理名称：`api`
   - 目标URL：`http://127.0.0.1:3000`
   - 发送域名：`$host`
   - 代理目录：`/api`
4. 点击「提交」

#### 8.3 完整Nginx配置

在网站设置 → 配置文件中，替换为以下内容：

```nginx
server {
    listen 80;
    server_name 您的域名或IP;
    
    # 日志配置
    access_log /www/wwwlogs/attention-training-access.log;
    error_log /www/wwwlogs/attention-training-error.log;
    
    # Gzip压缩
    gzip on;
    gzip_vary on;
    gzip_min_length 1024;
    gzip_comp_level 6;
    gzip_types text/plain text/css text/xml text/javascript application/x-javascript application/xml+rss application/json application/javascript;
    
    # 上传文件大小限制
    client_max_body_size 50M;
    
    # 请求超时时间
    client_body_timeout 120s;
    client_header_timeout 120s;
    send_timeout 120s;
    
    # Node.js后端API代理
    location /api/ {
        proxy_pass http://127.0.0.1:3000;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_read_timeout 300s;
        proxy_connect_timeout 300s;
        proxy_send_timeout 300s;
    }
    
    # 静态文件服务
    location / {
        root /www/wwwroot/attention-training-platform/frontend;
        index index.html;
        try_files $uri $uri/ /index.html;
        
        # 安全头
        add_header X-Frame-Options "SAMEORIGIN" always;
        add_header X-Content-Type-Options "nosniff" always;
        add_header X-XSS-Protection "1; mode=block" always;
    }
    
    # 静态资源缓存
    location ~* \.(jpg|jpeg|png|gif|ico|css|js|svg|woff|woff2|ttf|eot|webp)$ {
        root /www/wwwroot/attention-training-platform/frontend;
        expires 7d;
        add_header Cache-Control "public, immutable";
        access_log off;
    }
}
```

1. 点击「保存」

***

## 🔐 数据库配置详解

### PostgreSQL数据库备份策略

#### 1. 数据库优化配置（可选）

在宝塔面板 → 软件商店 → PostgreSQL → 设置 → 配置修改中，添加：

```ini
# 连接数
max_connections = 100

# 内存配置
shared_buffers = 256MB
effective_cache_size = 1GB
maintenance_work_mem = 64MB
checkpoint_completion_target = 0.9
wal_buffers = 8MB
default_statistics_target = 100
random_page_cost = 1.1
effective_io_concurrency = 200
work_mem = 6553kB
min_wal_size = 1GB
max_wal_size = 4GB
```

#### 2. 数据库备份

创建定时备份：

1. 在宝塔面板 → 计划任务
2. 添加任务 → 备份数据库
3. 选择 `attention_training` 数据库
4. <br />
5. 设置备份周期：每天凌晨2点
6. 保留份数：7份
7. 点击「提交」

***

## 🔒 SSL证书配置

### 方式一：宝塔一键SSL（推荐）

1. 在网站设置中点击「SSL」
2. 选择「Let's Encrypt」
3. 勾选域名，点击「申请」
4. 申请成功后开启「强制HTTPS」

### 方式二：手动配置已有证书

1. 将证书文件（.crt）和私钥（.key）上传到 `/www/ssl/`
2. 在网站SSL设置中选择「其他证书」
3. 粘贴证书和私钥内容
4. 点击「保存」并开启「强制HTTPS」

### 配置HTTPS后的Nginx配置

```nginx
server {
    listen 443 ssl http2;
    listen [::]:443 ssl http2;
    server_name 您的域名;
    
    ssl_certificate /www/ssl/您的证书.crt;
    ssl_certificate_key /www/ssl/您的证书.key;
    
    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_ciphers HIGH:!aNULL:!MD5;
    ssl_prefer_server_ciphers on;
    
    # 其他配置同上...
}

server {
    listen 80;
    server_name 您的域名;
    return 301 https://$server_name$request_uri;
}
```

***

## 🛠️ 运维管理

### 常用PM2命令

```bash
# 查看服务状态
pm2 status

# 查看日志
pm2 logs attention-backend

# 查看实时日志
pm2 logs attention-backend --lines 100

# 重启服务
pm2 restart attention-backend

# 停止服务
pm2 stop attention-backend

# 重载服务（零停机）
pm2 reload attention-backend

# 删除服务
pm2 delete attention-backend

# 监控面板
pm2 monit
```

### 数据库管理

```bash
# 连接数据库
psql -U postgres -d attention_training

# 查看表结构
\d

# 退出
\q

# 手动备份数据库
pg_dump -U postgres attention_training > backup.sql

# 恢复数据库
psql -U postgres attention_training < backup.sql
```

### Nginx管理

```bash
# 测试配置文件
nginx -t

# 重载配置
nginx -s reload

# 重启Nginx
systemctl restart nginx

# 查看Nginx状态
systemctl status nginx
```

***

## 🔍 故障排查

### 问题1：后端服务无法启动

\*\*症状：`pm2 status` 显示 `errored` 或 `stopped`

**排查步骤：**

```bash
# 1. 查看错误日志
pm2 logs attention-backend --err

# 2. 检查端口占用
lsof -i:3000

# 3. 检查Node.js版本
node --version

# 4. 检查数据库连接
psql -U postgres -d attention_training

# 5. 检查环境变量
cat /www/wwwroot/attention-training-platform/backend/.env
```

**常见原因：**

- 端口被占用：修改 `.env` 中的 `PORT` 换一个端口
- 数据库连接失败：检查数据库密码、端口配置
- 依赖未安装：重新执行 `npm install`

### 问题2：API返回502 Bad Gateway

\*\*症状：访问网站时显示502错误

**排查步骤：**

```bash
# 1. 检查后端服务状态
pm2 status

# 2. 查看Nginx错误日志
tail -f /www/wwwlogs/attention-training-error.log

# 3. 本地测试API
curl http://127.0.0.1:3000/api/health
```

**常见原因：**

- 后端服务未启动：执行 `pm2 restart attention-backend`
- 反向代理配置错误：检查Nginx配置
- 端口未开放：检查宝塔防火墙设置

### 问题3：数据库连接失败

\*\*症状：后端日志显示连接数据库错误

**排查步骤：**

```bash
# 1. 检查PostgreSQL服务状态
systemctl status postgresql

# 2. 测试数据库连接
psql -U postgres -d attention_training

# 3. 检查防火墙
firewall-cmd --list-all
```

**常见原因：**

- PostgreSQL服务未启动：`systemctl start postgresql`
- 数据库密码错误：检查 `.env` 文件
- 数据库用户权限问题：重新创建数据库用户

### 问题4：静态资源加载失败

\*\*症状：页面显示异常、游戏无法加载

**排查步骤：**

```bash
# 1. 检查文件权限
ls -la /www/wwwroot/attention-training-platform/frontend/

# 2. 修复权限
chown -R www:www /www/wwwroot/attention-training-platform/
chmod -R 755 /www/wwwroot/attention-training-platform/

# 3. 检查Nginx配置
nginx -t
```

***

## ✅ 部署检查清单

部署完成后，请逐项检查以下内容：

- [ ] 服务器可访问（ping 服务器IP）
- [ ] 宝塔面板可登录
- [ ] PostgreSQL数据库已创建
- [ ] PM2服务显示 `online`
- [ ] 网站可正常访问（HTTP）
- [ ] 静态资源正常加载
- [ ] API代理工作正常（测试 `/api/health`
- [ ] 数据库迁移成功（`pm2 logs` 无错误
- [ ] SSL证书已配置（如需HTTPS）
- [ ] 防火墙规则已配置
- [ ] DeepSeek API密钥已配置
- [ ] 数据库定时备份已设置
- [ ] PM2开机自启已配置

***

## 📞 获取帮助

如遇到问题：

1. 查看PM2日志：`pm2 logs attention-backend`
2. 查看Nginx日志：`tail -f /www/wwwlogs/attention-training-error.log`
3. 查看数据库日志：`tail -f /var/log/postgresql/*.log`
4. 确认防火墙端口已开放
5. 检查API密钥是否正确配置

***

\*\*文档版本：v1.5
\*\*更新日期：2026-05-17
\*\*维护团队：专注力星球开发团队

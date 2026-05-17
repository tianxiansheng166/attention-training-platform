#!/bin/bash
#========================================
# 专注力星球 - 一键部署脚本
# 适用于阿里云宝塔Linux面板
#========================================

# 颜色定义
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# 输出函数
print_step() {
    echo -e "${BLUE}[步骤]${NC} $1"
}

print_success() {
    echo -e "${GREEN}[成功]${NC} $1"
}

print_error() {
    echo -e "${RED}[错误]${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}[警告]${NC} $1"
}

# 检查是否为root用户
check_root() {
    if [ "$EUID" -ne 0 ]; then
        print_error "请使用root用户运行此脚本"
        exit 1
    fi
}

# 获取脚本所在目录
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_DIR="/www/wwwroot/attention-training"

print_step "开始部署专注力星球..."

# 1. 更新系统
print_step "1. 更新系统软件包..."
yum update -y

# 2. 安装Node.js
print_step "2. 安装Node.js 18.x..."
curl -fsSL https://rpm.nodesource.com/setup_18.x | bash -
yum install -y nodejs

# 检查Node.js版本
NODE_VERSION=$(node --version)
print_success "Node.js版本: $NODE_VERSION"

# 3. 安装Git（如果没有）
print_step "3. 检查Git..."
if ! command -v git &> /dev/null; then
    print_step "安装Git..."
    yum install -y git
fi

# 4. 创建项目目录
print_step "4. 创建项目目录..."
mkdir -p $PROJECT_DIR

# 5. 复制项目文件
print_step "5. 复制项目文件..."
if [ -d "$SCRIPT_DIR/backend" ]; then
    cp -r "$SCRIPT_DIR/"* "$PROJECT_DIR/"
    print_success "项目文件已复制到 $PROJECT_DIR"
else
    print_error "未找到项目文件，请确认脚本路径正确"
    exit 1
fi

# 6. 安装依赖
print_step "6. 安装Node.js依赖..."
cd $PROJECT_DIR/backend
npm install --production

if [ $? -eq 0 ]; then
    print_success "依赖安装完成"
else
    print_error "依赖安装失败"
    exit 1
fi

# 7. 配置环境变量
print_step "7. 配置环境变量..."
if [ ! -f "$PROJECT_DIR/backend/.env" ]; then
    cp "$PROJECT_DIR/backend/.env.example" "$PROJECT_DIR/backend/.env"
    print_warning "请编辑 $PROJECT_DIR/backend/.env 配置DeepSeek API密钥"
fi

# 8. 安装PM2
print_step "8. 安装PM2进程管理器..."
npm install -g pm2

# 9. 启动服务
print_step "9. 使用PM2启动服务..."
cd $PROJECT_DIR/backend
pm2 delete attention-training 2>/dev/null
pm2 start src/index.js --name attention-training

# 保存PM2进程列表
pm2 save

# 设置开机自启
pm2 startup

# 10. 配置防火墙
print_step "10. 配置防火墙..."
# 如果使用firewalld
if command -v firewall-cmd &> /dev/null; then
    firewall-cmd --permanent --add-port=3000/tcp
    firewall-cmd --reload
    print_success "防火墙端口3000已开放"
fi

# 11. 安装Nginx
print_step "11. 检查Nginx..."
if ! command -v nginx &> /dev/null; then
    print_step "安装Nginx..."
    yum install -y nginx
    systemctl enable nginx
    systemctl start nginx
fi

# 12. 配置Nginx反向代理
print_step "12. 配置Nginx反向代理..."
cat > /etc/nginx/conf.d/attention-training.conf << 'EOF'
server {
    listen 80;
    server_name _;

    # 强制HTTPS（可选）
    # return 301 https://$server_name$request_uri;
    
    # Gzip压缩
    gzip on;
    gzip_types text/plain text/css application/json application/javascript text/xml application/xml;
    gzip_min_length 1024;

    # 上传文件大小限制
    client_max_body_size 50M;

    # Node.js后端代理
    location /api/ {
        proxy_pass http://127.0.0.1:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
        proxy_read_timeout 300s;
    }

    # 静态文件服务
    location / {
        proxy_pass http://127.0.0.1:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
    }

    # 静态资源缓存
    location ~* \.(jpg|jpeg|png|gif|ico|css|js|svg|woff|woff2|ttf|eot)$ {
        proxy_pass http://127.0.0.1:3000;
        expires 7d;
        add_header Cache-Control "public, immutable";
    }

    # 日志
    access_log /var/log/nginx/attention-training-access.log;
    error_log /var/log/nginx/attention-training-error.log;
}
EOF

# 测试Nginx配置
nginx -t

# 重载Nginx
systemctl reload nginx

print_success "Nginx配置完成"

# 13. 配置SSL（可选）
print_step "13. SSL配置提示..."
print_warning "如需配置SSL证书，请在宝塔面板中操作："
echo "  1. 登录宝塔面板"
echo "  2. 网站 -> 添加站点"
echo "  3. 绑定域名"
echo "  4. 申请Let's Encrypt免费证书"
echo "  5. 开启强制HTTPS"

# 14. 完成提示
echo ""
echo "============================================"
echo -e "${GREEN}部署完成！${NC}"
echo "============================================"
echo ""
echo "访问地址：http://你的服务器IP"
echo "后端API：http://你的服务器IP/api"
echo "健康检查：http://你的服务器IP/api/health"
echo ""
echo "常用命令："
echo "  重启服务:  pm2 restart attention-training"
echo "  查看日志:  pm2 logs attention-training"
echo "  查看状态:  pm2 status"
echo ""
echo "配置文件位置："
echo "  项目目录: $PROJECT_DIR"
echo "  环境变量: $PROJECT_DIR/backend/.env"
echo "  Nginx配置: /etc/nginx/conf.d/attention-training.conf"
echo ""
echo "============================================"

# 显示PM2状态
pm2 status

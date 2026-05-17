# 版本管理规范

## 📌 分支管理策略

### 主要分支
- `main` - 生产环境代码，只接受合并，不能直接推送
- `develop` - 开发分支，所有功能开发都从这里分出

### 临时分支
- `feature/*` - 新功能开发分支
- `bugfix/*` - Bug修复分支
- `hotfix/*` - 紧急修复分支
- `release/*` - 发布准备分支

## 🔄 提交信息规范

### 提交类型
```
feat: 新功能
fix: Bug修复
docs: 文档更新
style: 代码格式（不影响功能）
refactor: 重构（不是新功能或bug修复）
perf: 性能优化
test: 测试相关
chore: 构建/工具相关
```

### 提交格式
```
<类型>: <简短描述>

[可选的详细描述]

[可选的关联Issue]
```

### 示例
```
feat: 添加用户等级系统

实现了基于游戏表现的自动定级功能
- 初级（0-20分）
- 中级（21-50分）
- 高级（51-80分）
- 大师（80+分）

Closes #123
```

## 📋 版本号规范

使用语义化版本 `主版本.次版本.修订号`

- **主版本**：重大架构调整，不兼容的API变更
- **次版本**：新增功能，向后兼容
- **修订号**：Bug修复，向后兼容

### 版本标签
```
v1.0.0 - 初始版本
v1.1.0 - 次版本更新
v1.1.1 - 修订版本
```

## 🏷️ 发布流程

1. 从 `develop` 创建 `release/x.x.x` 分支
2. 进行最终测试和修复
3. 合并到 `main` 并打标签
4. 合并回 `develop`
5. 创建GitHub Release

## 🔍 代码审查

- 所有合并到 `main` 的代码都需要Pull Request
- 至少1人审查通过才能合并
- 审查者需要检查：
  - 代码质量
  - 测试覆盖
  - 文档更新
  - 安全性

## 📝 更新日志

每次发布需要更新 `CHANGELOG.md`，格式：

```markdown
## [版本号] - 日期

### 新增
- 功能A
- 功能B

### 修复
- 问题A
- 问题B

### 优化
- 优化A
```

## 🚀 快速命令

```bash
# 查看当前分支
git branch

# 创建功能分支
git checkout -b feature/新功能名

# 提交代码
git add .
git commit -m "feat: 新功能描述"

# 推送到远程
git push -u origin feature/新功能名

# 创建Pull Request后合并
git checkout develop
git merge feature/新功能名
git push origin develop

# 创建发布标签
git tag -a v1.0.0 -m "版本描述"
git push origin v1.0.0
```

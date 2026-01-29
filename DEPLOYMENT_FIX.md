# Cloudflare Containers 部署问题解决方案

## 🚨 当前问题

GitHub Actions 部署失败，错误信息：
```
Authentication error [code: 10000]
Invalid access token [code: 9109]
```

## 🔧 根本原因

API Token 权限不足或配置不正确。需要确保 Token 具有以下权限：

## ✅ 解决方案 1：创建正确的 API Token（推荐）

### 步骤 1：访问 Cloudflare API Tokens 页面

🔗 https://dash.cloudflare.com/profile/api-tokens

### 步骤 2：创建新的 API Token

1. **点击「Create Token」**

2. **使用模板「Edit Cloudflare Workers」**
   - 这是最简单的方法，自动配置所有必需权限

3. **或者「Create Custom Token」** 并手动配置以下权限：

   **Account 级别权限（必需）：**
   ```
   ✓ Account Settings - Read
   ✓ Workers Scripts - Edit
   ✓ Workers KV Storage - Edit
   ✓ Workers R2 Storage - Edit (如果使用 R2)
   ✓ Account Analytics - Read
   ```

   **Zone 级别权限（可选）：**
   ```
   ✓ Workers Routes - Edit
   ✓ DNS - Edit
   ```

4. **Account Resources 选择：**
   ```
   选择：All accounts
   或指定：Chengqiangshang@gmail.com's Account
   ```

5. **TTL（过期时间）：**
   ```
   建议：1 year 或 Never expire（用于生产环境）
   ```

6. **点击「Continue to summary」→「Create Token」**

### 步骤 3：保存新 Token

⚠️ **重要：Token 只显示一次！立即复制保存**

```
示例格式：
abc123def456ghi789jkl012mno345pqr678stu901
```

## ✅ 解决方案 2：配置 GitHub Secrets

### 访问 GitHub 仓库 Settings

🔗 https://github.com/vps4-1/containers-template/settings/secrets/actions

### 添加以下 Secrets：

| Secret Name | Value | 说明 |
|------------|-------|------|
| `CLOUDFLARE_API_TOKEN` | `[新创建的 Token]` | **使用步骤 1 创建的新 Token** |
| `CLOUDFLARE_ACCOUNT_ID` | `e02472b1ddaf02be3ae518747eac5e83` | 已验证 ✓ |
| `FIRECRAWL_API_KEY` | `fc-15be214b2bda4d328eeda6b67eed2d45` | 已配置 ✓ |
| `OPENROUTER_API_KEY` | `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` | 已配置 ✓ |
| `CF_API_KEY` | `Fs0z_WEUr9nXqVvJX2k6NyFDRxNvUI0PQpHjcvuu` | 已配置 ✓ |

### 配置步骤：

1. 点击「New repository secret」
2. 输入 Name（如 `CLOUDFLARE_API_TOKEN`）
3. 粘贴 Value（新创建的 Token）
4. 点击「Add secret」
5. 重复以上步骤添加所有 Secrets

## ✅ 解决方案 3：通过 Cloudflare Dashboard 部署（最简单）

如果 GitHub Actions 继续遇到问题，直接使用 Dashboard 部署：

### 1. 访问 Cloudflare Dashboard

🔗 https://dash.cloudflare.com

### 2. 导航到 Workers & Pages

```
左侧菜单 → Workers & Pages → Create application
```

### 3. 选择 Workers 类型

```
Workers → Create Worker → Connect to Git
```

### 4. 连接 GitHub 仓库

```
选择：vps4-1/containers-template
分支：main（或先合并 PR #1）
```

### 5. 配置环境变量

在 Dashboard 中添加以下环境变量：

```
FIRECRAWL_API_KEY = fc-15be214b2bda4d328eeda6b67eed2d45
OPENROUTER_API_KEY = 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
CF_API_KEY = Fs0z_WEUr9nXqVvJX2k6NyFDRxNvUI0PQpHjcvuu
CF_ACCOUNT_ID = e02472b1ddaf02be3ae518747eac5e83
NODE_ENV = production
```

### 6. 点击「Save and Deploy」

Cloudflare 会自动：
- ✓ 拉取代码
- ✓ 构建 Docker 镜像
- ✓ 部署 Worker 和 Container
- ✓ 提供访问 URL

## 📋 部署后验证清单

### 1. 检查部署状态

```bash
# 访问 Worker URL
curl https://opencode-agent.[你的子域].workers.dev/health

# 预期响应
{
  "status": "healthy",
  "service": "opencode-agent-worker",
  "timestamp": "2026-01-29T12:00:00.000Z",
  "container": true,
  "level": "worker"
}
```

### 2. 检查 Container 健康

```bash
curl https://opencode-agent.[你的子域].workers.dev/api/health

# 预期响应
{
  "status": "healthy",
  "container": true,
  "instanceId": "instance-1738155600000-abc123xyz",
  "services": {
    "firecrawl": true,
    "telegram": false,
    "cloudflare": true,
    "openrouter": true
  }
}
```

### 3. 访问监控面板

```
https://opencode-agent.[你的子域].workers.dev/monitor
```

### 4. 测试数据收集

```bash
curl -X POST https://opencode-agent.[你的子域].workers.dev/api/collect \
  -H "Content-Type: application/json" \
  -d '{
    "sources": ["https://openai.com/blog/rss.xml"],
    "type": "rss"
  }'
```

## 🎯 推荐部署流程

### 方案 A：Dashboard 部署（最快速）⭐

1. ✅ 访问 https://dash.cloudflare.com
2. ✅ Workers & Pages → Create → Connect to Git
3. ✅ 选择 vps4-1/containers-template
4. ✅ 配置环境变量
5. ✅ Deploy

**优点：** 
- 无需配置 API Token
- 图形界面，简单直观
- Cloudflare 自动处理 Docker 构建
- 5 分钟完成部署

### 方案 B：GitHub Actions（自动化）

1. ✅ 创建正确权限的 API Token
2. ✅ 配置 GitHub Secrets
3. ✅ 合并 PR #1
4. ✅ 触发 workflow 自动部署

**优点：**
- 完全自动化
- CI/CD 集成
- 版本管理

## 🔗 重要链接

| 资源 | URL |
|------|-----|
| **Cloudflare Dashboard** | https://dash.cloudflare.com |
| **API Tokens 管理** | https://dash.cloudflare.com/profile/api-tokens |
| **GitHub 仓库** | https://github.com/vps4-1/containers-template |
| **Pull Request #1** | https://github.com/vps4-1/containers-template/pull/1 |
| **GitHub Secrets 设置** | https://github.com/vps4-1/containers-template/settings/secrets/actions |
| **Containers 文档** | https://developers.cloudflare.com/containers/ |

## 📞 后续支持

部署完成后，查看以下文档：
- `CONTAINER_ARCHITECTURE.md` - 架构详解
- `DATA_SOURCES.md` - 数据源配置
- `QUICK_REFERENCE.md` - 快速参考
- `PROJECT_SUMMARY.md` - 项目总结

## ✅ 部署成功标志

当看到以下内容时，说明部署成功：

1. ✓ Dashboard 显示 Worker 状态为 `Active`
2. ✓ `/health` 端点返回 `healthy`
3. ✓ `/monitor` 监控面板正常显示
4. ✓ 数据收集 API 正常工作
5. ✓ Container 自动伸缩功能正常

---

**最后更新：** 2026-01-29  
**版本：** v1.0.0  
**状态：** ✅ 准备就绪

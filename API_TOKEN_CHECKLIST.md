# 🔐 Cloudflare API Token 创建检查清单

## ⚠️ 重要提示

当前 GitHub Actions 部署失败的原因是 **API Token 权限不足**。请按照以下清单创建新的 Token。

## ✅ 创建步骤

### 1️⃣ 访问 API Tokens 页面

🔗 **直接链接：** https://dash.cloudflare.com/profile/api-tokens

### 2️⃣ 点击「Create Token」

### 3️⃣ 选择模板（推荐）

**最简单方法：使用「Edit Cloudflare Workers」模板**

✓ 自动配置所有必需权限  
✓ 无需手动选择  
✓ 适用于 Workers 和 Containers

### 4️⃣ 或者创建自定义 Token

如果需要更精细的控制，选择「Create Custom Token」：

#### 📋 必需权限清单

**Account 级别（Account Permissions）：**

```
☑️ Account Settings - Read
☑️ Workers Scripts - Edit
☑️ Workers KV Storage - Edit  
☑️ Account Analytics - Read
```

**Zone 级别（Zone Permissions - 可选）：**

```
☑️ Workers Routes - Edit
☑️ DNS - Edit
```

#### 🎯 Account Resources

```
选择：All accounts
或
选择：Include - Specific account
     然后选择：Chengqiangshang@gmail.com's Account
```

#### ⏰ TTL（过期时间）

```
推荐：1 year
或
选择：Custom
     然后设置：Never expire（用于生产环境）
```

### 5️⃣ 创建并保存 Token

1. 点击「Continue to summary」
2. 检查权限摘要
3. 点击「Create Token」
4. **立即复制 Token**（只显示一次！）

**Token 格式示例：**
```
abc123def456ghi789jkl012mno345pqr678stu901vwx234
```

## 🔧 配置 GitHub Secrets

### 访问仓库 Secrets 页面

🔗 **直接链接：** https://github.com/vps4-1/containers-template/settings/secrets/actions

### 添加或更新以下 Secrets

| # | Secret Name | Value | 状态 |
|---|------------|-------|------|
| 1 | `CLOUDFLARE_API_TOKEN` | `[步骤 5 创建的新 Token]` | ⚠️ **需要更新** |
| 2 | `CLOUDFLARE_ACCOUNT_ID` | `e02472b1ddaf02be3ae518747eac5e83` | ✅ 已知 |
| 3 | `FIRECRAWL_API_KEY` | `fc-15be214b2bda4d328eeda6b67eed2d45` | ✅ 已配置 |
| 4 | `OPENROUTER_API_KEY` | `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` | ✅ 已配置 |
| 5 | `CF_API_KEY` | `Fs0z_WEUr9nXqVvJX2k6NyFDRxNvUI0PQpHjcvuu` | ✅ 已配置 |

### 配置步骤（每个 Secret）：

1. 点击「New repository secret」
2. 输入 Name（如 `CLOUDFLARE_API_TOKEN`）
3. 粘贴 Value（新创建的 Token）
4. 点击「Add secret」

## 🧪 验证 Token 权限

创建 Token 后，可以在本地验证：

```bash
# 导出 Token（替换为你的 Token）
export CLOUDFLARE_API_TOKEN="你的新Token"

# 验证 Token
wrangler whoami

# 预期输出
# ✅ You are logged in with an API Token
# 👤 Associated with email 'chengqiangshang@gmail.com'
# 📋 Account: Chengqiangshang@gmail.com's Account
# 🆔 Account ID: e02472b1ddaf02be3ae518747eac5e83
```

如果看到错误：
```
❌ Authentication error [code: 10000]
❌ Invalid access token [code: 9109]
```

说明 Token 权限不足，需要重新创建。

## 🚀 部署流程

### 方案 A：GitHub Actions（自动化）

1. ✅ 创建正确权限的 API Token（本清单步骤 1-5）
2. ✅ 配置 GitHub Secrets（本清单步骤 6）
3. ✅ 合并 PR #1：https://github.com/vps4-1/containers-template/pull/1
4. ✅ 触发 workflow：
   - 访问：https://github.com/vps4-1/containers-template/actions
   - 选择「Deploy to Cloudflare Container」
   - 点击「Run workflow」
5. ✅ 监控部署日志

**预期时间：** 3-5 分钟

### 方案 B：Cloudflare Dashboard（推荐，最简单）

**优点：**
- ✅ 无需配置 API Token
- ✅ 图形界面操作
- ✅ Cloudflare 自动处理 Docker 构建
- ✅ 5 分钟完成部署

**步骤：**

1. 访问：https://dash.cloudflare.com
2. 左侧菜单 → **Workers & Pages**
3. 点击：**Create application**
4. 选择：**Workers** → **Create Worker** → **Connect to Git**
5. 选择仓库：**vps4-1/containers-template**
6. 选择分支：**main**（先合并 PR #1）
7. 配置环境变量（在 Dashboard 中）：
   ```
   FIRECRAWL_API_KEY = fc-15be214b2bda4d328eeda6b67eed2d45
   OPENROUTER_API_KEY = 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
   CF_API_KEY = Fs0z_WEUr9nXqVvJX2k6NyFDRxNvUI0PQpHjcvuu
   CF_ACCOUNT_ID = e02472b1ddaf02be3ae518747eac5e83
   NODE_ENV = production
   ```
8. 点击：**Save and Deploy**

## 📊 部署后验证

### 1. 检查部署状态

访问 Cloudflare Dashboard：
```
https://dash.cloudflare.com → Workers & Pages
```

应该看到：
- ✅ Worker 状态：`Active`
- ✅ 最后部署：刚刚
- ✅ URL：`https://opencode-agent.xxx.workers.dev`

### 2. 测试健康端点

```bash
# Worker 健康检查
curl https://opencode-agent.xxx.workers.dev/health

# 预期响应
{
  "status": "healthy",
  "service": "opencode-agent-worker",
  "timestamp": "2026-01-29T12:00:00.000Z",
  "container": true,
  "level": "worker"
}
```

```bash
# Container 健康检查
curl https://opencode-agent.xxx.workers.dev/api/health

# 预期响应
{
  "status": "healthy",
  "container": true,
  "instanceId": "instance-xxxxx",
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
https://opencode-agent.xxx.workers.dev/monitor
```

应该看到：
- ✅ Worker 状态卡片
- ✅ Container 状态卡片
- ✅ 环境变量检查
- ✅ API 测试
- ✅ 实时日志

### 4. 测试数据收集

```bash
# RSS 源测试
curl -X POST https://opencode-agent.xxx.workers.dev/api/collect \
  -H "Content-Type: application/json" \
  -d '{
    "sources": ["https://openai.com/blog/rss.xml"],
    "type": "rss"
  }'

# 网页抓取测试
curl -X POST https://opencode-agent.xxx.workers.dev/api/collect \
  -H "Content-Type: application/json" \
  -d '{
    "sources": ["https://www.anthropic.com/news"],
    "type": "firecrawl"
  }'
```

### 5. 测试完整管道

```bash
curl -X POST https://opencode-agent.xxx.workers.dev/api/pipeline \
  -H "Content-Type: application/json" \
  -d '{
    "sources": [
      "https://openai.com/blog/rss.xml",
      "https://deepmind.google/blog/rss.xml"
    ],
    "sourceType": "auto",
    "deduplicateThreshold": 0.9,
    "includeEnglish": true,
    "quickDedup": false
  }'
```

## ✅ 成功标志

当看到以下所有项时，部署完全成功：

- [x] Dashboard 显示 Worker 状态为 `Active`
- [x] `/health` 返回 `healthy`
- [x] `/api/health` 返回 Container 健康状态
- [x] `/monitor` 监控面板正常显示
- [x] `/api/collect` 成功收集数据
- [x] `/api/pipeline` 完整流程正常工作
- [x] Container 自动伸缩功能正常
- [x] 31 个数据源配置正确

## 🔗 快速链接

| 资源 | URL |
|------|-----|
| **创建 API Token** | https://dash.cloudflare.com/profile/api-tokens |
| **配置 GitHub Secrets** | https://github.com/vps4-1/containers-template/settings/secrets/actions |
| **查看 PR #1** | https://github.com/vps4-1/containers-template/pull/1 |
| **GitHub Actions** | https://github.com/vps4-1/containers-template/actions |
| **Cloudflare Dashboard** | https://dash.cloudflare.com |
| **Workers & Pages** | https://dash.cloudflare.com → Workers & Pages |

## 📚 相关文档

- `DEPLOYMENT_FIX.md` - 完整的部署故障排除指南
- `CONTAINER_ARCHITECTURE.md` - Containers 架构详解
- `DEPLOYMENT.md` - 部署方法详解
- `QUICK_REFERENCE.md` - 快速参考
- `PROJECT_SUMMARY.md` - 项目总结

## 💡 常见问题

### Q1: Token 创建后仍然报错？

**A:** 确保选择了「Edit Cloudflare Workers」模板，或手动添加了所有必需的 Account 级别权限。

### Q2: GitHub Actions 部署失败？

**A:** 使用 Dashboard 部署（方案 B），它更简单且无需配置 Token。

### Q3: Container 无法启动？

**A:** 检查环境变量是否全部配置正确，特别是 `FIRECRAWL_API_KEY` 和 `OPENROUTER_API_KEY`。

### Q4: 部署后访问 URL 返回 404？

**A:** 等待 2-3 分钟让 Container 完全启动（冷启动需要时间）。

---

**最后更新：** 2026-01-29  
**版本：** v1.0.0  
**状态：** ✅ 准备就绪

**下一步：** 选择部署方案（Dashboard 或 GitHub Actions）并开始部署！

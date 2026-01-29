# 🔧 环境变量配置指南 - opencode-agent

## 🚨 当前问题

Container 无法启动，所有环境变量显示「缺失」。

**原因：** Cloudflare Dashboard 中未配置环境变量。

---

## ✅ 解决方案：配置环境变量

### 步骤 1：访问 Worker 设置

1. 访问：**https://dash.cloudflare.com**
2. 导航：**Workers & Pages** → **opencode-agent**
3. 点击：**Settings** 标签
4. 滚动到：**Environment Variables** 部分

---

### 步骤 2：添加以下环境变量

**请逐个添加以下变量（每个都要单独添加）：**

#### 1. FIRECRAWL_API_KEY ⭐ 必需

```
Variable name:  FIRECRAWL_API_KEY
Value:          fc-15be214b2bda4d328eeda6b67eed2d45
Environment:    ☑ Production  ☑ Preview (可选)
```

#### 2. OPENROUTER_API_KEY ⭐ 必需

```
Variable name:  OPENROUTER_API_KEY
Value:          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
Environment:    ☑ Production  ☑ Preview (可选)
```

#### 3. CF_API_KEY ⭐ 必需

```
Variable name:  CF_API_KEY
Value:          Fs0z_WEUr9nXqVvJX2k6NyFDRxNvUI0PQpHjcvuu
Environment:    ☑ Production  ☑ Preview (可选)
```

#### 4. CF_ACCOUNT_ID ⭐ 必需

```
Variable name:  CF_ACCOUNT_ID
Value:          e02472b1ddaf02be3ae518747eac5e83
Environment:    ☑ Production  ☑ Preview (可选)
```

#### 5. NODE_ENV ⭐ 必需

```
Variable name:  NODE_ENV
Value:          production
Environment:    ☑ Production  ☐ Preview
```

#### 6. TELEGRAM_BOT_TOKEN (可选)

```
Variable name:  TELEGRAM_BOT_TOKEN
Value:          (留空或填入你的 Telegram Bot Token)
Environment:    ☑ Production  ☑ Preview (可选)
```

#### 7. RSS_BRIDGE_URL (可选)

```
Variable name:  RSS_BRIDGE_URL
Value:          (留空，暂时不使用)
Environment:    ☑ Production  ☑ Preview (可选)
```

#### 8. SELF_HOSTED_FIRECRAWL_URL (可选)

```
Variable name:  SELF_HOSTED_FIRECRAWL_URL
Value:          (留空，暂时不使用)
Environment:    ☑ Production  ☑ Preview (可选)
```

---

### 步骤 3：操作流程（每个变量）

**对于每个变量，执行以下操作：**

1. 点击「**Add variable**」按钮
2. 填写「**Variable name**」（如 `FIRECRAWL_API_KEY`）
3. 填写「**Value**」（粘贴对应的值）
4. 勾选「☑ Production」（必须）
5. 勾选「☑ Preview」（可选，推荐）
6. 点击「**Save**」
7. **重复以上步骤添加所有变量**

---

### 步骤 4：重新部署

**添加完所有变量后，必须重新部署：**

#### 选项 A：通过 Dashboard 重新部署（推荐）

1. 点击页面顶部的「**Deploy**」按钮
2. 或者：
   - 点击「**Deployments**」标签
   - 选择最新的部署
   - 点击「**Retry deployment**」

#### 选项 B：等待自动部署

- 如果 Worker 连接了 GitHub
- 推送新的 commit 会自动触发部署

---

### 步骤 5：验证环境变量

部署完成后（3-5 分钟），访问：

```
https://opencode-agent.chengqiangshang.workers.dev/api/env-check
```

**预期响应（成功）：**

```json
{
  "FIRECRAWL_API_KEY": true,
  "OPENROUTER_API_KEY": true,
  "CF_API_KEY": true,
  "CF_ACCOUNT_ID": true,
  "TELEGRAM_BOT_TOKEN": false,
  "RSS_BRIDGE_URL": false,
  "SELF_HOSTED_FIRECRAWL_URL": false
}
```

前 4 个应该是 `true`，后 3 个可以是 `false`（可选）。

---

## 🧪 完整验证清单

重新部署后，按顺序测试：

### 1. Worker 健康检查 ✅

```bash
curl https://opencode-agent.chengqiangshang.workers.dev/health
```

**预期：**
```json
{
  "status": "healthy",
  "service": "opencode-agent-worker",
  "timestamp": "2026-01-29T13:00:00.000Z",
  "container": true,
  "level": "worker"
}
```

---

### 2. 环境变量检查 ⭐

```bash
curl https://opencode-agent.chengqiangshang.workers.dev/api/env-check
```

**预期：**
```json
{
  "FIRECRAWL_API_KEY": true,
  "OPENROUTER_API_KEY": true,
  "CF_API_KEY": true,
  "CF_ACCOUNT_ID": true,
  "TELEGRAM_BOT_TOKEN": false,
  "RSS_BRIDGE_URL": false,
  "SELF_HOSTED_FIRECRAWL_URL": false
}
```

---

### 3. Container 健康检查 ⭐

```bash
curl https://opencode-agent.chengqiangshang.workers.dev/api/health
```

**预期：**
```json
{
  "status": "healthy",
  "container": true,
  "instanceId": "instance-1738155600000-abc123",
  "services": {
    "firecrawl": true,
    "telegram": false,
    "cloudflare": true,
    "openrouter": true
  }
}
```

---

### 4. 监控面板 ⭐

**浏览器访问：**
```
https://opencode-agent.chengqiangshang.workers.dev/monitor
```

**预期：**
- ✅ 完整的监控面板
- ✅ Worker 状态：绿色（健康）
- ✅ Container 状态：绿色（健康）
- ✅ 环境变量：4/7 配置（前 4 个为绿色 ✓）

---

### 5. 过滤统计 ⭐

```bash
curl https://opencode-agent.chengqiangshang.workers.dev/stats
```

**预期：**
```json
{
  "success": true,
  "timestamp": "2026-01-29T13:00:00.000Z",
  "instanceId": "instance-xxxxx",
  "firecrawl": {
    "total_requests": 0,
    "filtered_before_crawl": 0,
    "actual_crawls": 0,
    "credits_used": 0,
    "credits_saved": 0,
    "savings_rate": "0%"
  },
  "url_filter": {
    "total_urls": 0,
    "passed_urls": 0,
    "filtered_urls": { ... },
    "filter_rate": "0%",
    "credits_saved": 0
  }
}
```

---

### 6. 数据收集测试 ⭐

```bash
curl -X POST https://opencode-agent.chengqiangshang.workers.dev/api/collect \
  -H "Content-Type: application/json" \
  -d '{
    "sources": ["https://openai.com/blog/rss.xml"],
    "type": "rss"
  }'
```

**预期：** 返回文章列表

---

### 7. 完整管道测试 ⭐

```bash
curl -X POST https://opencode-agent.chengqiangshang.workers.dev/api/pipeline \
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

**预期：** 返回收集、去重、编辑后的结果

---

## 🔍 故障排查

### 问题 1：环境变量仍显示缺失

**解决方案：**
1. 确认在 Dashboard 中已添加所有变量
2. 确认勾选了「Production」
3. 点击「Deploy」重新部署
4. 等待 3-5 分钟让部署完成

### 问题 2：Container 仍无法启动

**检查 Dashboard 日志：**
1. Workers & Pages → opencode-agent
2. 点击「Logs」标签
3. 查看「Real-time Logs」

**常见错误：**
- `Missing API key` → 环境变量未正确配置
- `Dockerfile not found` → 构建问题
- `Container timeout` → 启动超时（等待更久）

### 问题 3：API 返回错误

**示例错误：**
```json
{
  "success": false,
  "error": "API key not configured"
}
```

**解决方案：**
- 检查对应的环境变量是否正确
- 验证 API key 是否有效
- 重新部署

---

## 📋 环境变量快速复制

**为了方便，这里是所有变量的纯文本格式：**

```
FIRECRAWL_API_KEY=fc-15be214b2bda4d328eeda6b67eed2d45
OPENROUTER_API_KEY=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
CF_API_KEY=Fs0z_WEUr9nXqVvJX2k6NyFDRxNvUI0PQpHjcvuu
CF_ACCOUNT_ID=e02472b1ddaf02be3ae518747eac5e83
NODE_ENV=production
TELEGRAM_BOT_TOKEN=
RSS_BRIDGE_URL=
SELF_HOSTED_FIRECRAWL_URL=
```

**注意：** 在 Dashboard 中，每个变量要单独添加，不能一次性粘贴所有。

---

## 🎯 成功标志

当看到以下所有项时，说明配置成功：

- [x] Dashboard 显示所有环境变量已添加
- [x] `/health` 返回 `healthy`
- [x] `/api/env-check` 前 4 个变量为 `true`
- [x] `/api/health` 返回 Container 健康状态
- [x] `/monitor` 显示完整面板，环境变量 4/7 为绿色
- [x] `/api/collect` 成功收集数据
- [x] `/api/pipeline` 完整流程正常
- [x] `/stats` 显示过滤统计

---

## 🔗 快速链接

| 资源 | URL |
|------|-----|
| **Cloudflare Dashboard** | https://dash.cloudflare.com |
| **opencode-agent Worker** | Workers & Pages → opencode-agent → Settings |
| **监控面板** | https://opencode-agent.chengqiangshang.workers.dev/monitor |
| **环境变量检查** | https://opencode-agent.chengqiangshang.workers.dev/api/env-check |

---

## 📞 需要帮助？

如果遇到问题，请提供：
1. Dashboard 中环境变量的截图
2. `/api/env-check` 的响应
3. Dashboard → Logs 中的错误信息

---

**下一步：** 立即前往 Dashboard 添加环境变量！

**预计时间：** 5-10 分钟（添加变量 + 重新部署）

**完成后：** 所有功能将正常工作，包括：
- ✅ 数据收集（31 个数据源）
- ✅ 语义去重
- ✅ AI 批量编辑
- ✅ URL 前置过滤（节省 50-60% credits）
- ✅ 实时监控

---

**最后更新：** 2026-01-29  
**状态：** ⚠️ 等待环境变量配置

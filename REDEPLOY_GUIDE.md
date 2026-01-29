# 🚀 重新部署指南 - 使环境变量生效

## 📊 当前状态

✅ **环境变量已添加** - 在 Dashboard 中配置完成  
❌ **环境变量未生效** - `/api/env-check` 显示全部 `false`  
❌ **Container 未启动** - 需要重新部署

---

## ⚡ 立即重新部署（3种方法）

### 方法 1：Dashboard 手动部署（最快，推荐）⭐

#### 步骤：

1. **访问 Cloudflare Dashboard**
   ```
   https://dash.cloudflare.com
   ```

2. **导航到 Worker**
   ```
   Workers & Pages → opencode-agent
   ```

3. **触发重新部署**
   
   **选项 A - 从 Settings 页面：**
   - 在 Settings → Environment Variables 页面
   - 点击页面顶部的蓝色「**Deploy**」按钮
   
   **选项 B - 从 Deployments 页面：**
   - 点击「**Deployments**」标签
   - 找到最新的部署（第一行）
   - 点击右侧的「**⋯**」（三点菜单）
   - 选择「**Redeploy**」或「**Retry deployment**」

4. **等待部署完成**
   - ⏰ 预计时间：3-5 分钟
   - 状态显示：Building → Deploying → Success

---

### 方法 2：通过 Git Push 触发自动部署

如果 Worker 已连接到 GitHub 仓库：

```bash
cd /home/user/webapp

# 创建一个空提交触发部署
git commit --allow-empty -m "trigger: Redeploy to apply environment variables"

# 推送到 main 分支（如果 PR 已合并）
git checkout main
git pull origin main
git push origin main

# 或推送到 genspark_ai_developer 分支
git checkout genspark_ai_developer
git push origin genspark_ai_developer
```

**注意：** 这需要 Worker 配置了自动部署。

---

### 方法 3：使用 Wrangler CLI（需要 Docker）

⚠️ **警告：** 沙箱环境没有 Docker，此方法仅供参考。

```bash
# 设置 API Token
export CLOUDFLARE_API_TOKEN="iDHyGIkz2sG17J1y-kQWYrFy-ph_JByroBtRVYnA"

# 部署
cd /home/user/webapp
npm run deploy
```

---

## 🧪 部署后验证

### 1️⃣ 检查部署状态

**在 Dashboard 中：**
- Deployments 标签
- 最新部署应显示「**Success**」（绿色勾号）
- 部署时间应该是刚刚（几分钟前）

---

### 2️⃣ 验证环境变量生效

```bash
curl https://opencode-agent.chengqiangshang.workers.dev/api/env-check
```

**预期响应（成功）：**
```json
{
  "FIRECRAWL_API_KEY": true,      ✅
  "OPENROUTER_API_KEY": true,     ✅
  "CF_API_KEY": true,             ✅
  "CF_ACCOUNT_ID": true,          ✅
  "TELEGRAM_BOT_TOKEN": false,    ⚠️ 可选
  "RSS_BRIDGE_URL": false,        ⚠️ 可选
  "SELF_HOSTED_FIRECRAWL_URL": false  ⚠️ 可选
}
```

**如果仍然全部为 `false`：**
- 等待 1-2 分钟（部署可能还在进行）
- 检查 Dashboard 部署状态是否真的完成
- 查看 Dashboard → Logs 寻找错误信息

---

### 3️⃣ 验证 Container 启动

```bash
curl https://opencode-agent.chengqiangshang.workers.dev/api/health
```

**预期响应（成功）：**
```json
{
  "status": "healthy",
  "container": true,
  "instanceId": "instance-1738155600000-abc123",
  "services": {
    "firecrawl": true,        ✅
    "telegram": false,        ⚠️ 可选
    "cloudflare": true,       ✅
    "openrouter": true        ✅
  }
}
```

**如果仍返回错误：**
```
Failed to start container: The container is not running
```

**可能原因：**
1. 部署还未完成（等待更久）
2. Docker 镜像构建失败（查看 Build logs）
3. 环境变量配置错误（检查拼写）

---

### 4️⃣ 访问监控面板

**浏览器打开：**
```
https://opencode-agent.chengqiangshang.workers.dev/monitor
```

**预期看到：**

#### Worker 状态卡片
```
✅ 状态：健康
📊 服务：opencode-agent-worker
🕐 时间：2026-01-29T13:30:00.000Z
🔧 Container：是
```

#### Container 状态卡片
```
✅ 状态：健康
🆔 实例 ID：instance-xxxxx
✓ Firecrawl：已配置
✓ Cloudflare：已配置
✓ OpenRouter：已配置
✗ Telegram：未配置（可选）
```

#### 环境变量检查
```
✓ FIRECRAWL_API_KEY
✓ OPENROUTER_API_KEY
✓ CF_API_KEY
✓ CF_ACCOUNT_ID
✗ TELEGRAM_BOT_TOKEN
✗ RSS_BRIDGE_URL
✗ SELF_HOSTED_FIRECRAWL_URL
```

---

### 5️⃣ 测试数据收集（RSS）

```bash
curl -X POST https://opencode-agent.chengqiangshang.workers.dev/api/collect \
  -H "Content-Type: application/json" \
  -d '{
    "sources": ["https://openai.com/blog/rss.xml"],
    "type": "rss"
  }'
```

**预期：** 返回 OpenAI 博客文章列表

---

### 6️⃣ 测试 URL 过滤统计

```bash
curl https://opencode-agent.chengqiangshang.workers.dev/stats
```

**预期响应：**
```json
{
  "success": true,
  "timestamp": "2026-01-29T13:30:00.000Z",
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
    "filtered_urls": {
      "by_url_pattern": 0,
      "by_metadata": 0,
      "by_duplicate": 0,
      "total": 0
    },
    "filter_rate": "0%",
    "credits_saved": 0,
    "cache_size": 0,
    "cache_hit_rate": "0%"
  }
}
```

---

### 7️⃣ 测试完整管道

```bash
curl -X POST https://opencode-agent.chengqiangshang.workers.dev/api/pipeline \
  -H "Content-Type: application/json" \
  -d '{
    "sources": [
      "https://openai.com/blog/rss.xml"
    ],
    "sourceType": "rss",
    "deduplicateThreshold": 0.9,
    "includeEnglish": true,
    "quickDedup": true
  }'
```

**预期：** 返回收集、去重、编辑后的文章

---

## 🔍 故障排查

### 问题 1：环境变量仍未生效

**症状：** `/api/env-check` 仍返回全部 `false`

**排查步骤：**

1. **确认变量已保存**
   - Dashboard → Settings → Environment Variables
   - 检查所有 5 个必需变量是否都显示在列表中
   - 确认「Production」列有勾号

2. **确认已重新部署**
   - Dashboard → Deployments
   - 最新部署时间应该是添加变量之后
   - 状态应该是「Success」

3. **查看部署日志**
   - 点击最新的部署
   - 查看「Build logs」和「Function logs」
   - 寻找环境变量相关的错误

4. **强制刷新部署**
   - 在 Deployments 页面
   - 点击「Create deployment」创建新部署
   - 选择 Production branch
   - 点击「Deploy」

---

### 问题 2：Container 无法启动

**症状：** `/api/health` 返回 "Failed to start container"

**可能原因和解决方案：**

#### A. Docker 镜像构建失败

**检查：**
- Dashboard → Deployments → 最新部署 → Build logs
- 寻找 `Dockerfile` 相关错误

**解决：**
- 确认 `container_src/Dockerfile` 存在
- 检查 Dockerfile 语法是否正确

#### B. Container 启动超时

**症状：**
- Build logs 显示成功
- Function logs 显示 Container 启动超时

**解决：**
- 等待更久（冷启动可能需要 5-10 秒）
- 刷新页面重试

#### C. 环境变量在 Container 中不可用

**检查：**
- Dashboard → Settings → Environment Variables
- 确认所有变量都勾选了「Production」

**解决：**
- 取消勾选再重新勾选「Production」
- 保存后重新部署

---

### 问题 3：部署卡在 "Building" 状态

**症状：** 部署一直显示 "Building"，超过 10 分钟

**解决方案：**

1. **刷新页面**
   - 有时 Dashboard 显示不更新

2. **取消并重新部署**
   - 点击「Cancel」取消当前部署
   - 点击「Create deployment」创建新部署

3. **检查账户状态**
   - 确认 Cloudflare 账户没有超出限制
   - 检查是否有服务中断通知

---

## 📊 部署状态检查清单

使用此清单确认部署成功：

### Dashboard 检查
- [ ] Settings → Environment Variables 显示 5 个变量
- [ ] 所有变量都勾选了「Production」
- [ ] Deployments 显示最新部署为「Success」
- [ ] 部署时间在添加变量之后

### API 端点检查
- [ ] `/health` 返回 `healthy`
- [ ] `/api/env-check` 前 4 个为 `true`
- [ ] `/api/health` 返回 Container 健康状态
- [ ] `/monitor` 显示完整面板

### 功能检查
- [ ] `/api/collect` 成功收集 RSS 数据
- [ ] `/stats` 返回统计数据
- [ ] `/metrics` 返回 Prometheus 指标

---

## 🎯 下一步行动

**立即执行：**

1. ✅ 访问 Dashboard：https://dash.cloudflare.com
2. ✅ 进入：Workers & Pages → opencode-agent
3. ✅ 点击：Settings → Environment Variables
4. ✅ 点击页面顶部的「**Deploy**」按钮
5. ⏰ 等待 3-5 分钟
6. ✅ 测试：`curl https://opencode-agent.chengqiangshang.workers.dev/api/env-check`
7. ✅ 验证：访问 `/monitor` 面板

---

## 🔗 快速链接

| 资源 | URL |
|------|-----|
| **Cloudflare Dashboard** | https://dash.cloudflare.com |
| **Worker 设置** | Dashboard → Workers & Pages → opencode-agent → Settings |
| **部署页面** | Dashboard → Workers & Pages → opencode-agent → Deployments |
| **监控面板** | https://opencode-agent.chengqiangshang.workers.dev/monitor |
| **环境变量检查** | https://opencode-agent.chengqiangshang.workers.dev/api/env-check |
| **Container 健康** | https://opencode-agent.chengqiangshang.workers.dev/api/health |

---

**当前状态：** ⚠️ 环境变量已添加，等待重新部署  
**下一步：** 点击「Deploy」按钮  
**预计时间：** 5 分钟  
**完成后：** 系统完全可用！🎉

---

**需要帮助？** 
- 提供 Dashboard → Deployments 的截图
- 提供 `/api/env-check` 的响应
- 查看 Dashboard → Logs 中的错误信息

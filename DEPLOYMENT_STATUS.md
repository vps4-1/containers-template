# 🚀 部署状态说明与更新步骤

## 📊 当前状态

您的 Worker URL：https://containers-template.chengqiangshang.workers.dev

**问题：** 当前部署的是 Cloudflare Containers 默认模板，不是我们的 OpenCode Agent 项目。

**证据：** 访问根路径显示的是模板的默认端点：
```
GET /container/<ID>
GET /lb
GET /error
GET /singleton
```

**我们的项目应该显示：**
```
GET /health - Worker 健康检查
GET /api/health - Container 健康检查
GET /monitor - 监控面板
POST /api/collect - 数据收集
POST /api/pipeline - 完整管道
```

---

## 🔧 解决方案：重新部署正确的代码

### 方案 A：通过 Cloudflare Dashboard 更新部署（推荐）

#### 步骤 1：访问现有 Worker

1. 前往：https://dash.cloudflare.com
2. 左侧菜单 → **Workers & Pages**
3. 找到并点击：**containers-template** 或 **opencode-agent**

#### 步骤 2：检查部署设置

在 Worker 详情页面：
- **Settings** → **Builds & Deployments**
- 检查：
  - ✅ 是否连接到 GitHub 仓库？
  - ✅ 连接的是哪个分支？

#### 步骤 3：更新部署

有两个选项：

**选项 1：如果已连接 GitHub**
1. 确保 PR #1 已合并到 main 分支
2. 在 Dashboard 中点击「Deployments」→「Retry deployment」
3. 或等待 Git push 触发自动部署

**选项 2：如果未连接 GitHub（需要重新部署）**
1. 删除现有的 `containers-template` Worker
2. 创建新的 Worker：
   - Workers & Pages → **Create application**
   - **Workers** → **Connect to Git**
   - 选择仓库：`vps4-1/containers-template`
   - 选择分支：`main`（建议先合并 PR #1）
   - 项目名称：`opencode-agent`

#### 步骤 4：配置环境变量

在 Worker Settings → **Environment Variables** 中添加：

```
FIRECRAWL_API_KEY = fc-15be214b2bda4d328eeda6b67eed2d45
OPENROUTER_API_KEY = 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
CF_API_KEY = Fs0z_WEUr9nXqVvJX2k6NyFDRxNvUI0PQpHjcvuu
CF_ACCOUNT_ID = e02472b1ddaf02be3ae518747eac5e83
NODE_ENV = production
```

⚠️ **重要：** 每个环境变量都要单独添加！

#### 步骤 5：触发重新部署

- 点击「Save and Deploy」
- 等待 3-5 分钟（包括 Docker 镜像构建时间）

---

### 方案 B：通过 Wrangler CLI 部署（需要 Docker）

⚠️ **注意：** 由于我们的沙箱环境没有 Docker，此方法需要在本地机器上执行。

如果您有本地 Docker 环境：

```bash
# 1. 克隆仓库
git clone https://github.com/vps4-1/containers-template.git
cd containers-template

# 2. 切换到 main 分支（或先合并 PR）
git checkout main

# 3. 安装依赖
npm install

# 4. 配置环境变量
cat > .dev.vars << 'EOF'
FIRECRAWL_API_KEY=fc-15be214b2bda4d328eeda6b67eed2d45
OPENROUTER_API_KEY=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
CF_API_KEY=Fs0z_WEUr9nXqVvJX2k6NyFDRxNvUI0PQpHjcvuu
CF_ACCOUNT_ID=e02472b1ddaf02be3ae518747eac5e83
NODE_ENV=production
EOF

# 5. 设置 API Token
export CLOUDFLARE_API_TOKEN="iDHyGIkz2sG17J1y-kQWYrFy-ph_JByroBtRVYnA"

# 6. 部署
npm run deploy
```

---

### 方案 C：合并 PR 并触发自动部署

#### 步骤 1：合并 Pull Request

1. 访问：https://github.com/vps4-1/containers-template/pull/1
2. 检查所有更改
3. 点击「Merge pull request」
4. 确认合并

#### 步骤 2：配置 GitHub Secrets（如果使用 GitHub Actions）

1. 访问：https://github.com/vps4-1/containers-template/settings/secrets/actions
2. 确保已添加所有必需的 Secrets（见 `API_TOKEN_CHECKLIST.md`）

#### 步骤 3：触发 Workflow

1. 访问：https://github.com/vps4-1/containers-template/actions
2. 选择「Deploy to Cloudflare Container」
3. 点击「Run workflow」
4. 选择 branch: `main`
5. 点击绿色的「Run workflow」按钮

---

## 🧪 部署后验证

完成重新部署后（大约 3-5 分钟），执行以下测试：

### 1. Worker 健康检查

```bash
curl https://containers-template.chengqiangshang.workers.dev/health
```

**预期响应：**
```json
{
  "status": "healthy",
  "service": "opencode-agent-worker",
  "timestamp": "2026-01-29T12:00:00.000Z",
  "container": true,
  "level": "worker"
}
```

**如果仍返回 404：** 说明还没有部署我们的代码。

### 2. 访问监控面板

```
https://containers-template.chengqiangshang.workers.dev/monitor
```

**预期：** 看到完整的监控面板，包括：
- Worker 状态卡片
- Container 状态卡片
- 环境变量检查
- API 测试界面
- 实时日志面板

**如果看到 404：** 需要重新部署。

### 3. Container 健康检查

```bash
curl https://containers-template.chengqiangshang.workers.dev/api/health
```

**预期响应：**
```json
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

### 4. 测试数据收集

```bash
curl -X POST https://containers-template.chengqiangshang.workers.dev/api/collect \
  -H "Content-Type: application/json" \
  -d '{
    "sources": ["https://openai.com/blog/rss.xml"],
    "type": "rss"
  }'
```

**预期：** 返回收集到的文章列表。

---

## 📋 检查清单

在开始之前，请确认：

- [ ] PR #1 已合并到 main 分支
- [ ] 在 Cloudflare Dashboard 中找到现有的 Worker
- [ ] 确认 Worker 连接到正确的 GitHub 仓库
- [ ] 确认部署使用的是 main 分支的最新代码
- [ ] 已配置所有必需的环境变量
- [ ] Docker 镜像构建成功（在 Dashboard 查看部署日志）

---

## 🔍 调试步骤

如果部署后仍然看到旧的端点：

### 1. 检查 Cloudflare Dashboard

```
https://dash.cloudflare.com → Workers & Pages → [Your Worker]
```

查看：
- **Deployments** 标签：最新部署时间、状态
- **Logs** 标签：构建和运行时日志
- **Settings** → **Builds & Deployments**：构建配置

### 2. 检查部署日志

在 Dashboard 的 Deployments 页面：
- 点击最新的部署
- 查看「Build logs」
- 查看「Function logs」

**常见问题：**
- ❌ Docker 构建失败 → 检查 Dockerfile 语法
- ❌ 环境变量未设置 → 在 Settings 中添加
- ❌ 部署的是错误的分支 → 更改 Git 连接设置

### 3. 检查 GitHub 仓库状态

```bash
# 访问仓库
https://github.com/vps4-1/containers-template

# 检查 main 分支的内容
# 确保包含我们的更改：
# - src/index.ts (更新的 Worker 代码)
# - container_src/server.js (Container 代码)
# - container_src/data/*.json (数据源配置)
```

---

## 💡 快速解决方案

**最快的方法（如果 Dashboard 不起作用）：**

1. 删除现有的 `containers-template` Worker
2. 重新创建，使用 Git 连接到 `vps4-1/containers-template`
3. 选择 main 分支（确保 PR #1 已合并）
4. 配置环境变量
5. 部署

**时间：** 约 5-10 分钟

---

## 🔗 快速链接

| 资源 | URL |
|------|-----|
| **Worker Dashboard** | https://dash.cloudflare.com → Workers & Pages |
| **Current Worker** | https://containers-template.chengqiangshang.workers.dev |
| **GitHub PR #1** | https://github.com/vps4-1/containers-template/pull/1 |
| **GitHub Repo** | https://github.com/vps4-1/containers-template |
| **API Token** | https://dash.cloudflare.com/profile/api-tokens |

---

## 📞 需要帮助？

查看这些文档：
- `API_TOKEN_CHECKLIST.md` - Token 配置
- `DEPLOYMENT_FIX.md` - 部署故障排除
- `CONTAINER_ARCHITECTURE.md` - 架构说明

---

**下一步行动：**

1. ✅ 访问 Cloudflare Dashboard
2. ✅ 找到现有 Worker 或创建新的
3. ✅ 确保使用最新的 main 分支代码
4. ✅ 配置环境变量
5. ✅ 重新部署
6. ✅ 访问 `/monitor` 验证部署

**预期完成时间：** 5-10 分钟

---

**最后更新：** 2026-01-29  
**状态：** 等待重新部署正确的代码

# 🚨 紧急部署修复指南

## 📊 问题诊断

**症状：**
- ✅ Worker 在线：https://containers-template.chengqiangshang.workers.dev
- ❌ `/monitor` 返回 404
- ❌ 显示旧模板端点（`/container/<ID>`, `/lb`, `/error`, `/singleton`）

**根本原因：**
- Main 分支还是旧代码（commit: eaca4f8）
- Genspark_ai_developer 分支有新代码（commit: 5406a50，包括 31 个数据源）
- **PR #1 尚未合并**

**解决方案：** 立即合并 PR #1 并重新部署

---

## ⚡ 快速修复步骤（5 分钟）

### 步骤 1：合并 Pull Request

**🔗 直接访问：** https://github.com/vps4-1/containers-template/pull/1

**操作：**
1. 点击绿色的「**Merge pull request**」按钮
2. 点击「**Confirm merge**」
3. 等待合并完成（几秒钟）

✅ **完成后：** Main 分支会更新到最新代码（31 个数据源 + 监控面板）

---

### 步骤 2：触发重新部署

有 3 个选项，选择最方便的：

#### 选项 A：Cloudflare Dashboard 手动触发（推荐）

1. **访问：** https://dash.cloudflare.com
2. **导航：** Workers & Pages → `containers-template`
3. **触发：** Deployments 标签 → 最新部署 → **Retry deployment**
4. **等待：** 3-5 分钟（Docker 构建 + 部署）

#### 选项 B：GitHub Actions 自动部署

1. **访问：** https://github.com/vps4-1/containers-template/actions
2. **选择：** Deploy to Cloudflare Container workflow
3. **运行：** Run workflow → Branch: `main` → Run workflow
4. **监控：** 查看运行日志

⚠️ **前提：** GitHub Secrets 已正确配置（见下方）

#### 选项 C：从本地推送触发（如果 Dashboard 配置了 Git hook）

```bash
# 如果 Worker 已连接到 GitHub 仓库
# 合并 PR 后，可能会自动触发部署
# 等待 5-10 分钟并检查
```

---

### 步骤 3：配置环境变量（如果尚未配置）

**访问：** https://dash.cloudflare.com → Workers & Pages → `containers-template` → Settings → **Environment Variables**

**添加以下变量：**

| Variable Name | Value | Production | Preview |
|--------------|-------|------------|---------|
| `FIRECRAWL_API_KEY` | `fc-15be214b2bda4d328eeda6b67eed2d45` | ✅ | ✅ |
| `OPENROUTER_API_KEY` | `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` | ✅ | ✅ |
| `CF_API_KEY` | `Fs0z_WEUr9nXqVvJX2k6NyFDRxNvUI0PQpHjcvuu` | ✅ | ✅ |
| `CF_ACCOUNT_ID` | `e02472b1ddaf02be3ae518747eac5e83` | ✅ | ✅ |
| `NODE_ENV` | `production` | ✅ | ❌ |

**操作：**
1. 点击「Add variable」
2. 输入 Variable name
3. 输入 Value
4. 勾选「Production」（和「Preview」如果需要）
5. 点击「Save」
6. 重复以上步骤添加所有变量
7. 最后点击页面顶部的「**Deploy**」按钮

---

### 步骤 4：验证部署成功

**等待 3-5 分钟后，测试以下端点：**

#### 1️⃣ Worker 健康检查

```bash
curl https://containers-template.chengqiangshang.workers.dev/health
```

**预期响应（成功）：**
```json
{
  "status": "healthy",
  "service": "opencode-agent-worker",
  "timestamp": "2026-01-29T...",
  "container": true,
  "level": "worker"
}
```

**如果仍返回 404：** 部署还未完成或失败，检查 Dashboard 日志

#### 2️⃣ 监控面板

**浏览器访问：**
```
https://containers-template.chengqiangshang.workers.dev/monitor
```

**预期看到：**
- ✅ 标题：「OpenCode Agent 监控面板」
- ✅ Worker 状态卡片（绿色）
- ✅ Container 状态卡片
- ✅ 环境变量检查（5 个变量）
- ✅ 混合抓取测试
- ✅ API 测试按钮
- ✅ 实时日志面板

**如果仍返回 404：**
- ❌ 部署失败或使用了错误的分支
- 🔍 检查 Dashboard → Deployments → 查看错误日志

#### 3️⃣ Container 健康检查

```bash
curl https://containers-template.chengqiangshang.workers.dev/api/health
```

**预期响应（成功）：**
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

**如果返回错误：**
- 检查环境变量是否正确配置
- 查看 Container 日志（Dashboard → Logs）

#### 4️⃣ 测试数据收集

```bash
curl -X POST https://containers-template.chengqiangshang.workers.dev/api/collect \
  -H "Content-Type: application/json" \
  -d '{
    "sources": ["https://openai.com/blog/rss.xml"],
    "type": "rss"
  }'
```

**预期：** 返回文章列表（可能需要等待 Container 冷启动 2-5 秒）

---

## 🔧 如果部署仍然失败

### 检查 Dashboard 部署日志

1. **访问：** https://dash.cloudflare.com → Workers & Pages → `containers-template`
2. **查看：** Deployments 标签 → 最新部署 → 点击查看详情
3. **检查：**
   - ✅ Build logs：Docker 镜像构建是否成功？
   - ✅ Function logs：Worker 启动是否成功？
   - ✅ Status：显示「Success」还是「Failed」？

### 常见错误及解决方案

#### 错误 1：Docker 构建失败

**症状：** Build logs 显示 Docker 错误

**解决方案：**
```bash
# 检查 Dockerfile 语法
cat container_src/Dockerfile

# 确保 package.json 存在
ls -la container_src/package.json
```

#### 错误 2：环境变量未设置

**症状：** Container 启动失败，日志显示「Missing API keys」

**解决方案：**
- 在 Dashboard → Settings → Environment Variables 中添加所有变量
- 点击「Deploy」重新部署

#### 错误 3：Git 连接问题

**症状：** 部署使用了旧代码

**解决方案：**
1. Settings → Builds & Deployments
2. 确认 Git repository：`vps4-1/containers-template`
3. 确认 Production branch：`main`
4. 如果不正确，断开并重新连接 Git

---

## 🔄 备用方案：重新创建 Worker

如果上述方法都不起作用，重新创建 Worker：

### 步骤：

1. **删除现有 Worker**
   - Dashboard → Workers & Pages → `containers-template`
   - Settings → Delete

2. **创建新 Worker**
   - Workers & Pages → **Create application**
   - **Workers** → **Connect to Git**
   
3. **配置 Git**
   - Repository：`vps4-1/containers-template`
   - Branch：`main`（确保 PR #1 已合并！）
   - Root directory：`/`

4. **配置构建设置**
   - Build command：（留空）
   - Build output directory：（留空）
   - Framework preset：None

5. **配置环境变量**
   - 添加所有必需的环境变量（见步骤 3）

6. **部署**
   - 点击「Save and Deploy」
   - 等待 3-5 分钟

---

## 📋 部署成功检查清单

完成部署后，确认以下所有项：

- [ ] PR #1 已成功合并到 main 分支
- [ ] Cloudflare Dashboard 显示部署成功
- [ ] `/health` 返回 `{ "status": "healthy", "service": "opencode-agent-worker" }`
- [ ] `/monitor` 显示完整的监控面板（不是 404）
- [ ] `/api/health` 返回 Container 健康状态
- [ ] 监控面板显示 5 个环境变量配置正确
- [ ] 数据收集 API 正常工作
- [ ] 31 个数据源配置正确（15 RSS + 16 网页抓取）

---

## 🎯 推荐执行顺序

**最快的路径（总共 5-10 分钟）：**

```
1. 合并 PR #1 (30 秒)
   ↓
2. Dashboard → Retry deployment (5 分钟等待)
   ↓
3. 配置环境变量（如果未配置）(2 分钟)
   ↓
4. 验证所有端点 (2 分钟)
   ↓
5. ✅ 完成！
```

---

## 🔗 快速链接

| 资源 | URL | 用途 |
|------|-----|------|
| **合并 PR** | https://github.com/vps4-1/containers-template/pull/1 | 第一步：合并代码 |
| **Worker Dashboard** | https://dash.cloudflare.com | 触发部署 |
| **GitHub Actions** | https://github.com/vps4-1/containers-template/actions | 自动部署 |
| **监控面板** | https://containers-template.chengqiangshang.workers.dev/monitor | 验证部署 |

---

## 📞 获取帮助

如果遇到问题，查看这些文档：

- `DEPLOYMENT_STATUS.md` - 详细的状态分析
- `API_TOKEN_CHECKLIST.md` - Token 配置
- `DEPLOYMENT_FIX.md` - 故障排除
- `CONTAINER_ARCHITECTURE.md` - 架构说明

或在 Cloudflare Dashboard 查看部署日志获取具体错误信息。

---

**最后更新：** 2026-01-29  
**当前状态：** ⚠️ PR #1 待合并，等待重新部署  
**预计完成时间：** 5-10 分钟

---

## 🎬 立即开始

**👉 第一步：** 访问 https://github.com/vps4-1/containers-template/pull/1 并点击「Merge pull request」

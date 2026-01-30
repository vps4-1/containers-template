# 🔍 环境变量未生效诊断报告

## 📊 当前状态（2026-01-30 04:19）

### ✅ Worker 层
```json
{
  "status": "healthy",
  "service": "opencode-agent-worker",
  "timestamp": "2026-01-30T04:19:38.237Z",
  "container": true,
  "level": "worker"
}
```
✅ Worker 正常运行

### ❌ 环境变量
```json
{
  "FIRECRAWL_API_KEY": false,
  "OPENROUTER_API_KEY": false,
  "CF_API_KEY": false,
  "CF_ACCOUNT_ID": false,
  ...
}
```
❌ 所有环境变量仍显示 `false`

### ❌ Container
```
Failed to start container: The container is not running
```
❌ Container 无法启动（因为缺少环境变量）

---

## 🔍 问题诊断

### 可能原因 1：部署未完成

**Git push 已触发，但部署可能还在构建中。**

**检查方法：**
1. 访问：https://dash.cloudflare.com
2. Workers & Pages → opencode-agent → Deployments
3. 查看最新部署的状态

**预期看到：**
- 正在构建... (Building) - 等待
- 正在部署... (Deploying) - 等待
- 成功 ✓ (Success) - 环境变量应该生效

**如果状态是「失败」（Failed）：**
- 点击该部署查看日志
- 查找错误信息

---

### 可能原因 2：环境变量配置问题

**虽然在 Dashboard 添加了变量，但可能：**
1. 未勾选「Production」环境
2. 变量名拼写错误
3. 变量值为空

**解决方案：**

在 Dashboard → Settings → Environment Variables 中，确认：

| 变量名 | 值（部分） | Production |
|--------|-----------|-----------|
| `FIRECRAWL_API_KEY` | `fc-15be214b2bda...` | ☑️ |
| `OPENROUTER_API_KEY` | `sk-or-v1-8b4e84...` | ☑️ |
| `CF_API_KEY` | `Fs0z_WEUr9nXqV...` | ☑️ |
| `CF_ACCOUNT_ID` | `e02472b1ddaf02...` | ☑️ |
| `NODE_ENV` | `production` | ☑️ |

**每个变量的「Production」列必须有勾号 ☑️**

---

### 可能原因 3：需要手动触发部署

**即使推送了代码，有时 Cloudflare 不会自动部署。**

**解决方案：在 Dashboard 手动触发**

#### 方法 A：从 Settings 页面
1. Workers & Pages → opencode-agent → Settings
2. 滚动到 Environment Variables
3. 点击页面右上角的「**Deploy**」按钮

#### 方法 B：从 Deployments 页面
1. Workers & Pages → opencode-agent → Deployments
2. 点击「**Create deployment**」
3. 选择 branch: `main`
4. 点击「**Deploy**」

---

## ⚡ 立即解决方案

### 步骤 1：确认环境变量配置

访问：https://dash.cloudflare.com → Workers & Pages → opencode-agent → Settings

**检查清单：**
- [ ] 看到 5 个环境变量（FIRECRAWL_API_KEY, OPENROUTER_API_KEY, CF_API_KEY, CF_ACCOUNT_ID, NODE_ENV）
- [ ] 每个变量的「Production」列都有勾号 ☑️
- [ ] 变量值不为空（显示为 •••）

**如果任何一项不符合，请：**
1. 编辑或重新添加该变量
2. 确保勾选「Production」
3. 保存

---

### 步骤 2：手动触发部署

**在 Settings → Environment Variables 页面：**

找到页面右上角的「**Deploy**」按钮（蓝色），点击它。

**或者在 Deployments 页面：**
1. 点击「Create deployment」
2. Branch: main
3. 点击「Deploy」

---

### 步骤 3：等待部署完成

⏰ **预计时间：3-5 分钟**

**在 Deployments 页面监控进度：**
```
Building... (约 2-3 分钟)
  ↓
Deploying... (约 1-2 分钟)
  ↓
Success ✓ (完成)
```

---

### 步骤 4：验证环境变量生效

**部署完成后，测试：**

```bash
# 1. 环境变量检查
curl https://opencode-agent.chengqiangshang.workers.dev/api/env-check

# 预期结果（前 4 个应该是 true）
{
  "FIRECRAWL_API_KEY": true,
  "OPENROUTER_API_KEY": true,
  "CF_API_KEY": true,
  "CF_ACCOUNT_ID": true,
  ...
}

# 2. Container 健康检查
curl https://opencode-agent.chengqiangshang.workers.dev/api/health

# 预期结果
{
  "status": "healthy",
  "container": true,
  "services": {
    "firecrawl": true,
    "cloudflare": true,
    "openrouter": true
  }
}

# 3. 监控面板
# 浏览器访问：
https://opencode-agent.chengqiangshang.workers.dev/monitor
```

---

## 🎯 使用您提供的 API Token

您提供了 API Token：`Z8X7LZcqTX9E9TY9YERHpvElI0TZh_SaOX0pd9W6`

这个 Token 是用于「containers-template build token」，通常用于 CI/CD 构建。

**如果需要通过 Wrangler CLI 部署：**

```bash
# 设置 Token
export CLOUDFLARE_API_TOKEN="Z8X7LZcqTX9E9TY9YERHpvElI0TZh_SaOX0pd9W6"

# 部署
cd /home/user/webapp
npm run deploy
```

**但是：** 沙箱环境没有 Docker，无法构建 Container 镜像。

**推荐：** 仍然使用 Dashboard 手动部署。

---

## 📋 快速检查清单

**现在请执行：**

- [ ] 访问 https://dash.cloudflare.com
- [ ] 进入 Workers & Pages → opencode-agent → Settings
- [ ] 确认 Environment Variables 中有 5 个变量，且都勾选了 Production
- [ ] 点击页面右上角的「Deploy」按钮
- [ ] 等待 3-5 分钟
- [ ] 刷新监控面板：https://opencode-agent.chengqiangshang.workers.dev/monitor
- [ ] 验证环境变量显示为绿色 ✓

---

## 🔗 快速链接

| 操作 | URL |
|------|-----|
| **Dashboard 设置** | https://dash.cloudflare.com → Workers & Pages → opencode-agent → Settings |
| **部署页面** | https://dash.cloudflare.com → Workers & Pages → opencode-agent → Deployments |
| **监控面板** | https://opencode-agent.chengqiangshang.workers.dev/monitor |
| **环境变量检查** | https://opencode-agent.chengqiangshang.workers.dev/api/env-check |

---

## 💡 关键提示

**环境变量配置的两个关键步骤：**
1. ✅ 在 Dashboard 添加变量
2. ⚠️ **手动点击「Deploy」按钮触发部署** ← 您可能漏了这一步

**添加变量后不会自动生效，必须重新部署！**

---

## 🆘 如果仍然不工作

请提供以下信息：
1. Dashboard → Deployments 页面的截图（最新部署的状态）
2. Dashboard → Settings → Environment Variables 的截图
3. 如果部署失败，点击该部署查看日志并提供错误信息

---

**下一步：** 立即访问 Dashboard，点击「Deploy」按钮！

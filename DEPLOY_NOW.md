# 🚨 紧急：重新部署以应用环境变量

## 当前状态
✅ 环境变量已在 Dashboard 添加  
❌ 环境变量未生效（仍显示全部「缺失」）  
❌ **原因：添加后未重新部署**

---

## ⚡ 立即操作（2分钟）

### 步骤 1：访问部署页面

1. 打开：**https://dash.cloudflare.com**
2. 点击：**Workers & Pages**
3. 点击：**opencode-agent**

---

### 步骤 2：触发重新部署 ⭐

**在 opencode-agent 页面，有两个方法：**

#### 方法 A：从 Settings 页面（最简单）

1. 点击顶部的「**Settings**」标签
2. 滚动到「**Environment Variables**」部分
3. 确认看到你添加的 5 个变量：
   - FIRECRAWL_API_KEY
   - OPENROUTER_API_KEY
   - CF_API_KEY
   - CF_ACCOUNT_ID
   - NODE_ENV
4. **点击页面右上角的蓝色「Deploy」按钮**

#### 方法 B：从 Deployments 页面

1. 点击顶部的「**Deployments**」标签
2. 找到最新的部署（第一行）
3. 点击该行右侧的「**···**」（三点菜单）
4. 选择「**Retry deployment**」或「**Redeploy**」

---

### 步骤 3：等待部署完成

- ⏰ **预计时间：3-5 分钟**
- 📊 **状态变化：** Building → Deploying → Success
- ✅ **完成标志：** 状态显示绿色「Success」勾号

**在等待期间，你会看到：**
```
Building...  (约 2-3 分钟)
  ↓
Deploying... (约 1-2 分钟)
  ↓
Success ✓    (完成)
```

---

### 步骤 4：验证环境变量生效

**等待部署完成后（看到 Success），测试：**

```bash
curl https://opencode-agent.chengqiangshang.workers.dev/api/env-check
```

**应该看到（成功）：**
```json
{
  "FIRECRAWL_API_KEY": true,      ← 应该是 true
  "OPENROUTER_API_KEY": true,     ← 应该是 true
  "CF_API_KEY": true,             ← 应该是 true
  "CF_ACCOUNT_ID": true,          ← 应该是 true
  "TELEGRAM_BOT_TOKEN": false,
  "RSS_BRIDGE_URL": false,
  "SELF_HOSTED_FIRECRAWL_URL": false
}
```

**或者直接刷新监控面板：**
```
https://opencode-agent.chengqiangshang.workers.dev/monitor
```

环境变量检查部分应该显示前 4 个为绿色 ✓

---

## 🔍 如果仍然不工作

### 检查 1：确认变量已保存

在 Dashboard → Settings → Environment Variables 中，应该看到：

| Variable Name | Environment | Value (hidden) |
|---------------|-------------|----------------|
| FIRECRAWL_API_KEY | ☑ Production | ••••••••••••• |
| OPENROUTER_API_KEY | ☑ Production | ••••••••••••• |
| CF_API_KEY | ☑ Production | ••••••••••••• |
| CF_ACCOUNT_ID | ☑ Production | e02472b1... |
| NODE_ENV | ☑ Production | production |

**如果没有看到这些，说明变量没有保存成功，需要重新添加。**

---

### 检查 2：确认部署完成

在 Dashboard → Deployments 中：
- 最新部署的时间应该是刚刚（几分钟前）
- 状态应该是「Success」（绿色勾号）
- 如果是「Failed」（红色），点击查看错误日志

---

### 检查 3：查看部署日志

如果部署失败：
1. Dashboard → Deployments
2. 点击最新的（失败的）部署
3. 查看「Build logs」寻找错误
4. 常见错误：
   - Docker 构建失败
   - 依赖安装失败
   - 内存不足

---

## 📸 截图示例

**你应该在 Dashboard 看到：**

### Settings → Environment Variables
```
Environment Variables

Add variable

Variable Name              Environment
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
FIRECRAWL_API_KEY         ☑ Production  ☐ Preview
OPENROUTER_API_KEY        ☑ Production  ☐ Preview
CF_API_KEY                ☑ Production  ☐ Preview
CF_ACCOUNT_ID             ☑ Production  ☐ Preview
NODE_ENV                  ☑ Production  ☐ Preview

[Deploy] 按钮在页面右上角 ←← 点击这个！
```

### Deployments
```
Deployments

Create deployment

Date                Status      Commit
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
2026-01-29 13:45   Success ✓   feat: Add env vars  ←← 应该是 Success
2026-01-29 13:30   Success ✓   Previous deployment
```

---

## ✅ 成功验证清单

部署完成后，确认：

- [ ] Dashboard → Deployments 显示最新部署为「Success」
- [ ] 部署时间是添加环境变量之后
- [ ] `curl .../api/env-check` 前 4 个为 `true`
- [ ] `/monitor` 面板环境变量检查显示 4 个绿色 ✓
- [ ] `/api/health` 返回 Container 健康状态
- [ ] `/api/collect` 可以成功收集数据

---

## 🎯 立即行动

**现在就做：**

1. 🔗 打开 https://dash.cloudflare.com
2. 📂 Workers & Pages → opencode-agent → Settings
3. 🔍 确认看到 5 个环境变量
4. 🚀 **点击右上角的「Deploy」按钮**
5. ⏰ 等待 3-5 分钟
6. ✅ 刷新 https://opencode-agent.chengqiangshang.workers.dev/monitor

---

## 🆘 需要帮助？

如果完成上述步骤后仍然不工作，请提供：
1. Dashboard → Settings → Environment Variables 的截图
2. Dashboard → Deployments 最新部署的状态
3. 部署日志中的任何错误信息

---

**关键点：添加环境变量后，必须点击「Deploy」按钮才能生效！**

现在就去点击「Deploy」按钮吧！🚀

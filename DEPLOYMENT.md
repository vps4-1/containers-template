# Cloudflare 部署指南

## 当前项目状态 ✅

### 已完成的配置

1. ✅ **Worker 代码** (src/index.ts)
2. ✅ **Container 代码** (container_src/*)
3. ✅ **数据源配置** (31 个 AI 数据源)
4. ✅ **环境变量模板** (.dev.vars)
5. ✅ **Wrangler 配置** (wrangler.jsonc)
6. ✅ **Dockerfile** (Container 镜像)
7. ✅ **所有依赖** (package.json)

### 项目信息

- **Worker 名称**: opencode-agent
- **已部署 URL**: https://containers-template.chengqiangshang.workers.dev
- **GitHub 仓库**: https://github.com/vps4-1/containers-template
- **最新 PR**: https://github.com/vps4-1/containers-template/pull/1

## 部署方式

### 方式 1: 使用 Cloudflare Dashboard (推荐) 🌟

#### 步骤 1: 准备代码

```bash
# 确保在项目目录
cd /home/user/webapp

# 验证代码完整性
bash check-status.sh
```

#### 步骤 2: 登录 Cloudflare Dashboard

1. 访问: https://dash.cloudflare.com
2. 进入 **Workers & Pages**
3. 找到现有的 Worker: `opencode-agent` 或 `containers-template`

#### 步骤 3: 配置环境变量

在 Worker 设置中添加以下环境变量：

```
FIRECRAWL_API_KEY = fc-15be214b2bda4d328eeda6b67eed2d45
OPENROUTER_API_KEY = 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
CF_API_KEY = Fs0z_WEUr9nXqVvJX2k6NyFDRxNvUI0PQpHjcvuu
CF_ACCOUNT_ID = (从 Dashboard 右侧获取)
NODE_ENV = production
```

#### 步骤 4: 部署新版本

**选项 A: 通过 GitHub 集成**
1. 确保 PR #1 已合并到 main 分支
2. Cloudflare 会自动检测到更新并部署

**选项 B: 手动上传**
1. 打包代码：`npm run build` (如果有)
2. 在 Dashboard 上传新代码
3. 部署

### 方式 2: 使用 Wrangler CLI 🔧

#### 前置要求

需要 Cloudflare API Token，获取方式：

1. 访问: https://dash.cloudflare.com/profile/api-tokens
2. 创建 Token (使用 "Edit Cloudflare Workers" 模板)
3. 复制 Token

#### 部署命令

```bash
# 方法 A: 使用环境变量
export CLOUDFLARE_API_TOKEN="your_api_token_here"
cd /home/user/webapp
npm run deploy

# 方法 B: 使用 wrangler login
cd /home/user/webapp
wrangler login
npm run deploy

# 方法 C: 直接使用 wrangler
cd /home/user/webapp
wrangler deploy --env production
```

### 方式 3: 使用部署脚本 📜

```bash
cd /home/user/webapp
bash deploy-now.sh
```

## 部署后验证

### 1. 检查 Worker 健康状态

```bash
curl https://containers-template.chengqiangshang.workers.dev/health
```

预期输出：
```json
{
  "status": "healthy",
  "service": "opencode-agent-worker",
  "timestamp": "2025-01-29T...",
  "container": true,
  "level": "worker"
}
```

### 2. 检查 Container 健康状态

```bash
curl https://containers-template.chengqiangshang.workers.dev/api/health
```

预期输出：
```json
{
  "status": "healthy",
  "service": "opencode-agent-container",
  "instanceId": "instance-xxx",
  "services": {
    "firecrawl": true,
    "telegram": false,
    "cloudflare": true,
    "openrouter": true
  }
}
```

### 3. 访问监控面板

```bash
# 在浏览器打开
https://containers-template.chengqiangshang.workers.dev/monitor
```

### 4. 测试数据收集

```bash
# 测试 RSS 收集
curl -X POST https://containers-template.chengqiangshang.workers.dev/api/collect \
  -H "Content-Type: application/json" \
  -d '{
    "sources": ["https://openai.com/blog/rss.xml"],
    "type": "rss"
  }'

# 测试网页抓取
curl -X POST https://containers-template.chengqiangshang.workers.dev/api/collect \
  -H "Content-Type: application/json" \
  -d '{
    "sources": ["https://www.anthropic.com/news"],
    "type": "firecrawl"
  }'
```

### 5. 测试完整流水线

```bash
curl -X POST https://containers-template.chengqiangshang.workers.dev/api/pipeline \
  -H "Content-Type: application/json" \
  -d '{
    "sources": [
      "https://openai.com/blog/rss.xml",
      "https://www.anthropic.com/news",
      "https://ai.meta.com/blog"
    ],
    "sourceType": "auto",
    "deduplicateThreshold": 0.9,
    "includeEnglish": true
  }'
```

## 常见问题

### Q1: 部署失败，提示权限错误

**解决方案**:
- 确保 API Token 有 "Edit Cloudflare Workers" 权限
- 检查 Account ID 是否正确
- 确认 Token 未过期

### Q2: Container 无法启动

**解决方案**:
- 检查环境变量是否配置正确
- 查看 Cloudflare Dashboard 日志
- 确认 Dockerfile 语法正确

### Q3: API 调用失败

**解决方案**:
- 检查 API Keys 配额
- 验证 API Keys 有效性
- 查看 Worker 日志：`wrangler tail`

### Q4: 404 错误

**解决方案**:
- 确认 Worker 已成功部署
- 检查路由配置
- 验证 Container 绑定正确

## 回滚步骤

如果新部署有问题，可以快速回滚：

### 使用 Dashboard
1. Workers & Pages → Your Worker
2. Deployments → History
3. 选择之前的版本 → Rollback

### 使用 CLI
```bash
wrangler deployments list
wrangler rollback [deployment-id]
```

## 监控和调试

### 实时日志

```bash
# 查看实时日志
wrangler tail

# 过滤错误日志
wrangler tail --format json | jq 'select(.outcome == "exception")'
```

### Dashboard 日志

1. Workers & Pages → Your Worker
2. 点击 "Logs" 选项卡
3. 查看实时日志流

### 性能监控

1. Workers & Pages → Your Worker
2. Analytics → 查看请求统计、错误率、延迟等

## 下一步

部署成功后：

1. ✅ 合并 PR #1 到 main 分支
2. ✅ 配置 GitHub Actions 自动部署（如果需要）
3. ✅ 设置 Cloudflare 告警（CPU/内存使用率）
4. ✅ 定期检查 API 配额使用情况
5. ✅ 根据实际使用调整 Container 配置

## 联系和支持

- GitHub 仓库: https://github.com/vps4-1/containers-template
- Pull Request: https://github.com/vps4-1/containers-template/pull/1
- Cloudflare 文档: https://developers.cloudflare.com/containers/

---

**部署状态**: 等待 Cloudflare 认证
**最后更新**: 2025-01-29
**版本**: v1.0.0

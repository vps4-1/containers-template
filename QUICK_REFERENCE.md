# 🚀 快速参考 - Cloudflare Containers 项目

## 📊 项目概览

- **项目名称**: OpenCode Agent (AI News Aggregator)
- **架构**: Cloudflare Workers + Containers
- **数据源**: 31 个 AI 公司和研究机构
- **Worker URL**: https://containers-template.chengqiangshang.workers.dev
- **GitHub**: https://github.com/vps4-1/containers-template
- **PR**: https://github.com/vps4-1/containers-template/pull/1

## 🎯 核心架构

```
用户 → Worker (路由) → Container (业务逻辑) → 外部 API
       (Hono)          (Express + 5 服务)     (Firecrawl, OpenRouter, Workers AI)
```

## 📁 关键文件

| 文件 | 说明 | 字数 |
|------|------|------|
| `CONTAINER_ARCHITECTURE.md` | 完整架构文档 | 17000+ |
| `DATA_SOURCES.md` | 数据源列表和使用 | 5000+ |
| `DEPLOYMENT.md` | 部署指南 | 4700+ |
| `PROJECT_SUMMARY.md` | 项目总结 | 5800+ |
| `README.md` | 主文档 | - |
| `check-status.sh` | 状态检查脚本 | - |

## 🔑 环境变量

```bash
FIRECRAWL_API_KEY=fc-15be214b2bda4d328eeda6b67eed2d45
OPENROUTER_API_KEY=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
CF_API_KEY=Fs0z_WEUr9nXqVvJX2k6NyFDRxNvUI0PQpHjcvuu
CF_ACCOUNT_ID=(从 Dashboard 获取)
```

## 🛠️ 常用命令

### 本地开发
```bash
cd /home/user/webapp
npm install
npm run dev
# 访问: http://localhost:8787/monitor
```

### 状态检查
```bash
bash check-status.sh
```

### 部署
```bash
# 方式 1: Dashboard
# https://dash.cloudflare.com → Workers & Pages

# 方式 2: CLI (需要 API Token)
export CLOUDFLARE_API_TOKEN="your_token"
npm run deploy

# 方式 3: GitHub Actions
# 合并 PR 后自动触发
```

## 📡 API 端点速查

| 端点 | 方法 | 说明 |
|------|------|------|
| `/health` | GET | Worker 健康检查 |
| `/api/health` | GET | Container 健康检查 |
| `/monitor` | GET | 监控面板 (可视化) |
| `/api/collect` | POST | 数据收集 (RSS/Web) |
| `/api/deduplicate` | POST | 语义去重 |
| `/api/edit` | POST | 批量 AI 编辑 |
| `/api/pipeline` | POST | 完整流水线 |

## 🧪 快速测试

### 健康检查
```bash
curl https://containers-template.chengqiangshang.workers.dev/health
curl https://containers-template.chengqiangshang.workers.dev/api/health
```

### 数据收集
```bash
# RSS
curl -X POST https://containers-template.chengqiangshang.workers.dev/api/collect \
  -H "Content-Type: application/json" \
  -d '{"sources": ["https://openai.com/blog/rss.xml"], "type": "rss"}'

# Web 抓取
curl -X POST https://containers-template.chengqiangshang.workers.dev/api/collect \
  -H "Content-Type: application/json" \
  -d '{"sources": ["https://www.anthropic.com/news"], "type": "firecrawl"}'
```

### 完整流水线
```bash
curl -X POST https://containers-template.chengqiangshang.workers.dev/api/pipeline \
  -H "Content-Type: application/json" \
  -d '{
    "sources": ["https://openai.com/blog/rss.xml", "https://www.anthropic.com/news"],
    "sourceType": "auto",
    "deduplicateThreshold": 0.9
  }'
```

## 📚 数据源速查

### RSS 源 (15 个)
OpenAI, DeepMind, NVIDIA, NVIDIA Dev, Hugging Face, Cohere, Stability AI, EleutherAI, LangChain, Google AI, TechCrunch AI, The Verge AI, Wired AI, MIT TR AI, arXiv CS.AI

### 网页抓取 (16 个)
Anthropic, Meta AI, Mistral, Replicate, Perplexity, Cursor, xAI, AMD, **Genspark**, Manus, Lindy, Relevance, Aisera, Moveworks, Adept, Simular

## 🔧 故障排查

### Container 无法启动
```bash
# 检查日志
wrangler tail

# 验证环境变量
curl https://containers-template.chengqiangshang.workers.dev/api/env-check
```

### API 调用失败
- 检查 API Key 配额
- 验证环境变量配置
- 查看 Dashboard 日志

### 404 错误
- 确认 Worker 已部署
- 检查路由配置
- 重新部署

## 💡 关键概念

### Worker vs Container
- **Worker**: < 1ms 启动, V8 Isolate, 快速路由
- **Container**: 2-5s 启动, Docker, 复杂业务逻辑

### 混合抓取 (L0/L1/L2)
1. **L0**: RSS-Bridge (社交媒体转 RSS)
2. **L1**: 自建 Firecrawl (可选)
3. **L2**: 托管 Firecrawl (降级)

### Container 生命周期
- **活跃**: 处理请求
- **休眠**: 10 分钟无请求后自动休眠
- **唤醒**: 新请求自动唤醒 (冷启动 2-5s)
- **实例**: 最多 10 个并发

## 🔗 重要链接

- **GitHub**: https://github.com/vps4-1/containers-template
- **PR**: https://github.com/vps4-1/containers-template/pull/1
- **Worker**: https://containers-template.chengqiangshang.workers.dev
- **Dashboard**: https://dash.cloudflare.com
- **文档**: https://developers.cloudflare.com/containers/

## ✅ 部署检查清单

- [ ] 合并 PR #1
- [ ] 配置环境变量 (Cloudflare Dashboard)
- [ ] 部署到生产 (选择一种方式)
- [ ] 验证健康检查通过
- [ ] 测试 API 端点
- [ ] 访问监控面板
- [ ] 配置告警 (可选)

## 📞 获取帮助

查看详细文档:
```bash
cat CONTAINER_ARCHITECTURE.md  # 架构详解
cat DATA_SOURCES.md            # 数据源文档
cat DEPLOYMENT.md              # 部署指南
cat PROJECT_SUMMARY.md         # 项目总结
```

---

**版本**: v1.0.0  
**状态**: ✅ 开发完成, ⏳ 等待部署  
**最后更新**: 2025-01-29

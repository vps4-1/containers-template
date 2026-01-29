# AI 新闻数据源配置说明

## 数据源概览

本项目集成了多个 AI 领域的重要信息源，分为两类：

### 1. 有 RSS 的站点（15 个）

配置文件：`container_src/data/rss_feeds.json`

| 站点名称 | RSS URL | 优先级 |
|---------|---------|--------|
| OpenAI Blog | https://openai.com/blog/rss.xml | High |
| Google DeepMind | https://deepmind.google/blog/rss.xml | High |
| NVIDIA Blog | https://blogs.nvidia.com/feed/ | High |
| NVIDIA Developer Blog | https://developer.nvidia.com/blog/feed/ | High |
| Hugging Face Blog | https://huggingface.co/blog/feed.xml | High |
| Cohere Blog | https://cohere.com/blog/rss.xml | High |
| Stability AI News | https://stability.ai/news/rss | High |
| EleutherAI Blog | https://blog.eleuther.ai/rss/ | High |
| LangChain Blog | https://blog.langchain.dev/rss/ | High |
| Google AI Blog | https://ai.googleblog.com/feeds/posts/default | High |
| TechCrunch AI | https://techcrunch.com/tag/artificial-intelligence/feed/ | Normal |
| The Verge AI | https://www.theverge.com/ai-artificial-intelligence/rss/index.xml | Normal |
| Wired AI | https://www.wired.com/feed/tag/ai/latest/rss | Normal |
| MIT Technology Review AI | https://www.technologyreview.com/topic/artificial-intelligence/feed | High |
| arXiv CS.AI | http://export.arxiv.org/rss/cs.AI | Normal |

### 2. 无 RSS 的站点（16 个）

配置文件：`container_src/data/no_rss_sites.json`

这些站点需要使用 Firecrawl 或其他抓取方式：

| 站点名称 | URL | 优先级 |
|---------|-----|--------|
| Anthropic News | https://www.anthropic.com/news | High |
| Meta AI Blog | https://ai.meta.com/blog | High |
| Mistral AI News | https://mistral.ai/news | High |
| Replicate Blog | https://replicate.com/blog | Medium |
| Perplexity AI Blog | https://www.perplexity.ai/hub/blog | High |
| Cursor Blog | https://cursor.com/en-US/blog | Medium |
| xAI Blog | https://x.ai/blog | High |
| AMD AI Blogs | https://www.amd.com/zh-cn/blogs.html | Medium |
| Genspark AI | https://www.genspark.ai/ | High |
| Manus AI Blog | https://manus.im/blog | Medium |
| Lindy AI Blog | https://lindy.ai/blog | Medium |
| Relevance AI Blog | https://relevance.ai/blog | Medium |
| Aisera Blog | https://aisera.com/blog | Medium |
| Moveworks Blog | https://www.moveworks.com/us/en/resources/blog | Medium |
| Adept Blog | https://www.adept.ai/blog | High |
| Simular AI Blog | https://www.simular.ai/blog | Medium |

## 混合抓取架构

项目使用三级抓取策略：

1. **L0 (RSS-Bridge)**: 优先使用 RSS-Bridge 抓取
2. **L1 (自建 Firecrawl)**: 如果配置了自建 Firecrawl，则使用自建服务
3. **L2 (托管 Firecrawl)**: 最后使用托管的 Firecrawl API

## 使用方法

### 通过 RSS 收集数据

```bash
curl -X POST https://your-worker.workers.dev/api/collect \
  -H "Content-Type: application/json" \
  -d '{
    "sources": ["https://openai.com/blog/rss.xml"],
    "type": "rss"
  }'
```

### 通过 Firecrawl 收集数据

```bash
curl -X POST https://your-worker.workers.dev/api/collect \
  -H "Content-Type: application/json" \
  -d '{
    "sources": ["https://www.anthropic.com/news"],
    "type": "firecrawl"
  }'
```

### 自动检测类型

```bash
curl -X POST https://your-worker.workers.dev/api/collect \
  -H "Content-Type: application/json" \
  -d '{
    "sources": [
      "https://openai.com/blog/rss.xml",
      "https://www.anthropic.com/news"
    ],
    "type": "auto"
  }'
```

### 完整流水线（收集 + 去重 + 编辑）

```bash
curl -X POST https://your-worker.workers.dev/api/pipeline \
  -H "Content-Type: application/json" \
  -d '{
    "sources": [
      "https://openai.com/blog/rss.xml",
      "https://www.anthropic.com/news",
      "https://ai.meta.com/blog"
    ],
    "sourceType": "auto",
    "deduplicateThreshold": 0.9,
    "includeEnglish": true,
    "quickDedup": false
  }'
```

## 环境变量配置

确保在 Cloudflare Workers 中配置以下环境变量：

```bash
# 必需
FIRECRAWL_API_KEY=your_firecrawl_api_key
OPENROUTER_API_KEY=your_openrouter_api_key
CF_API_KEY=your_cloudflare_api_key
CF_ACCOUNT_ID=your_account_id

# 可选
TELEGRAM_BOT_TOKEN=your_telegram_bot_token
RSS_BRIDGE_URL=http://your-rss-bridge-url
SELF_HOSTED_FIRECRAWL_URL=http://your-firecrawl-url
```

## 监控面板

访问 `https://your-worker.workers.dev/monitor` 查看监控面板，可以：

- 检查 Worker 和 Container 健康状态
- 测试环境变量配置
- 测试混合抓取功能
- 查看实时日志

## 更新数据源

### 添加新的 RSS 源

编辑 `container_src/data/rss_feeds.json`：

```json
{
  "name": "New AI Blog",
  "url": "https://example.com/blog/rss.xml",
  "category": "official",
  "priority": "high",
  "website": "https://example.com/blog"
}
```

### 添加新的无 RSS 站点

编辑 `container_src/data/no_rss_sites.json`：

```json
{
  "name": "New AI Site",
  "url": "https://example.com/news",
  "category": "official",
  "priority": "high",
  "description": "Description of the site"
}
```

同时更新 `container_src/data/sites.txt`：

```
example.com/news
```

## 注意事项

1. **API 配额**: Firecrawl 和 OpenRouter 都有 API 调用限制，请合理控制抓取频率
2. **去重策略**: 建议对大量数据使用 `quickDedup: true` 快速去重
3. **批量编辑**: 默认批量编辑并行度为 3，可根据 API 限制调整
4. **Container 休眠**: Container 在 10 分钟无活动后自动休眠，节省资源

## 部署

使用提供的脚本一键部署：

```bash
bash deploy-now.sh
```

或手动部署：

```bash
npm install
npm run deploy
```

## 故障排查

如果遇到问题：

1. 检查环境变量是否正确配置
2. 访问监控面板查看服务状态
3. 检查 Cloudflare Workers 日志
4. 确保 API Keys 有足够的配额

## 许可证

参考项目根目录的 LICENSE 文件。

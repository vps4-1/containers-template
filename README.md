# OpenCode Agent - AI News Aggregator

[![Deploy to Cloudflare](https://deploy.workers.cloudflare.com/button)](https://deploy.workers.cloudflare.com/?url=https://github.com/cloudflare/templates/tree/main/containers-template)

![Containers Template Preview](https://imagedelivery.net/_yJ02hpOMj_EnGvsU2aygw/5aba1fb7-b937-46fd-fa67-138221082200/public)

<!-- dash-content-start -->

An intelligent AI news aggregator powered by [Cloudflare Containers](https://developers.cloudflare.com/containers/). 

This project demonstrates:
- **Container configuration** for running Node.js services
- **Hybrid scraping architecture** (RSS-Bridge, self-hosted Firecrawl, managed Firecrawl)
- **31 AI data sources** (15 RSS feeds + 16 web scraping sources)
- **Semantic deduplication** using Cloudflare Workers AI
- **Batch editing** with OpenRouter API
- **Real-time monitoring** dashboard

<!-- dash-content-end -->

## 🎯 Features

- **📰 Comprehensive Data Collection**: 31 AI industry data sources including OpenAI, Anthropic, Meta AI, Google DeepMind, NVIDIA, Mistral, and more
- **🔄 Hybrid Scraping**: Three-tier scraping strategy (L0: RSS-Bridge, L1: Self-hosted Firecrawl, L2: Managed Firecrawl)
- **🧹 Smart Deduplication**: Semantic deduplication using Cloudflare Workers AI embeddings
- **✏️ Batch Editing**: Automated content editing and translation via OpenRouter
- **📊 Monitoring Dashboard**: Real-time service health monitoring and testing
- **⚡ Auto-scaling**: Containers auto-sleep after 10 minutes of inactivity

## 📦 Data Sources

See [DATA_SOURCES.md](./DATA_SOURCES.md) for complete list of:
- 15 RSS feeds from major AI companies and research institutions
- 16 web scraping sources for sites without RSS feeds

Quick stats check:
```bash
bash check-status.sh
```

## 🚀 Getting Started

### Prerequisites

- Node.js 18+
- Cloudflare account with Workers enabled
- API Keys:
  - Firecrawl API Key
  - OpenRouter API Key
  - Cloudflare Workers AI API Key

### Installation

1. Clone and install dependencies:

```bash
git clone <your-repo-url>
cd containers-template
npm install
```

2. Configure environment variables:

```bash
# Copy example file
cp .env.example .dev.vars

# Edit .dev.vars with your API keys
```

Required environment variables:
- `FIRECRAWL_API_KEY`: For web scraping
- `OPENROUTER_API_KEY`: For content editing
- `CF_API_KEY`: Cloudflare Workers AI key
- `CF_ACCOUNT_ID`: Your Cloudflare account ID

### Development

Run the development server:

```bash
npm run dev
```

Open [http://localhost:8787](http://localhost:8787) with your browser.

### Check Project Status

Verify all configurations and data sources:

```bash
bash check-status.sh
```

This will show:
- ✓ All required files exist
- ✓ JSON configurations are valid
- ✓ 31 data sources are configured (15 RSS + 16 web scraping)
- ✓ Environment variables are set

## 📡 API Endpoints

### Health Check
```bash
GET /health
```

### Monitoring Dashboard
```bash
GET /monitor
```

### Data Collection
```bash
POST /api/collect
{
  "sources": ["https://openai.com/blog/rss.xml"],
  "type": "auto"  // or "rss", "firecrawl"
}
```

### Semantic Deduplication
```bash
POST /api/deduplicate
{
  "articles": [...],
  "threshold": 0.9,
  "quick": false
}
```

### Batch Editing
```bash
POST /api/edit
{
  "articles": [...],
  "includeEnglish": true,
  "batchSize": 10
}
```

### Full Pipeline
```bash
POST /api/pipeline
{
  "sources": [
    "https://openai.com/blog/rss.xml",
    "https://www.anthropic.com/news"
  ],
  "sourceType": "auto",
  "deduplicateThreshold": 0.9,
  "includeEnglish": true
}
```

See [DATA_SOURCES.md](./DATA_SOURCES.md) for detailed API usage examples.

## 🏗️ Architecture

```
┌─────────────────────────────────────────┐
│   Cloudflare Worker (Hono Router)      │
│                                         │
│  - Health checks                        │
│  - Request routing                      │
│  - Monitoring dashboard                 │
└─────────────┬───────────────────────────┘
              │
              ▼
┌─────────────────────────────────────────┐
│  Cloudflare Container (Express Server)  │
│                                         │
│  ┌─────────────────────────────────┐   │
│  │  Services                       │   │
│  │  - Firecrawl Scraper            │   │
│  │  - RSS Feed Parser              │   │
│  │  - Hybrid Scraper (L0/L1/L2)    │   │
│  │  - Semantic Deduplicator        │   │
│  │  - Batch Editor (OpenRouter)    │   │
│  └─────────────────────────────────┘   │
│                                         │
│  Data: 31 AI sources configured         │
│  - 15 RSS feeds                         │
│  - 16 web scraping targets              │
└─────────────────────────────────────────┘
```

### Hybrid Scraping Strategy

1. **L0 (RSS-Bridge)**: Use RSS-Bridge for sites without native RSS
2. **L1 (Self-hosted Firecrawl)**: Use self-hosted Firecrawl if available
3. **L2 (Managed Firecrawl)**: Fallback to managed Firecrawl API

## 📂 Project Structure

```
.
├── src/
│   └── index.ts              # Worker entry point
├── container_src/
│   ├── server.js             # Container Express server
│   ├── package.json          # Container dependencies
│   ├── data/
│   │   ├── rss_feeds.json    # 15 RSS data sources
│   │   ├── no_rss_sites.json # 16 web scraping sources
│   │   └── sites.txt         # Domain list for scraping
│   └── services/
│       ├── firecrawl.js      # Firecrawl integration
│       ├── rss.js            # RSS parser
│       ├── hybrid_scraper.js # Multi-tier scraping
│       ├── deduplicator.js   # Semantic deduplication
│       └── editor.js         # Batch editing
├── wrangler.jsonc            # Cloudflare configuration
├── Dockerfile                # Container image
├── DATA_SOURCES.md           # Complete data source documentation
└── check-status.sh           # Project status checker
```

## 🔧 Configuration Files

- **wrangler.jsonc**: Cloudflare Workers and Containers configuration
- **.dev.vars**: Local development environment variables
- **container_src/data/rss_feeds.json**: RSS feed sources (15 feeds)
- **container_src/data/no_rss_sites.json**: Web scraping sources (16 sites)
- **container_src/data/sites.txt**: Domain list for Firecrawl

## 🚢 Deploying To Production

### Quick Deploy

```bash
npm run deploy
```

Or use the one-click deploy script:

```bash
bash deploy-now.sh
```

### Environment Variables (Production)

Set these in your Cloudflare Dashboard (Workers & Pages > Your Worker > Settings > Variables):

| Variable | Description | Required |
|----------|-------------|----------|
| `FIRECRAWL_API_KEY` | Firecrawl API key | ✓ |
| `OPENROUTER_API_KEY` | OpenRouter API key | ✓ |
| `CF_API_KEY` | Cloudflare Workers AI key | ✓ |
| `CF_ACCOUNT_ID` | Cloudflare account ID | ✓ |
| `TELEGRAM_BOT_TOKEN` | Telegram bot token | Optional |
| `RSS_BRIDGE_URL` | RSS-Bridge URL | Optional |
| `SELF_HOSTED_FIRECRAWL_URL` | Self-hosted Firecrawl URL | Optional |

### Deployment Checklist

- [ ] Configure all environment variables in Cloudflare Dashboard
- [ ] Run `npm run deploy` to deploy Worker and Container
- [ ] Visit `https://your-worker.workers.dev/monitor` to verify deployment
- [ ] Test data collection: `POST /api/collect`
- [ ] Check Container health: `GET /api/health`

## 📊 Monitoring

Access the monitoring dashboard at:
```
https://your-worker.workers.dev/monitor
```

Features:
- Worker and Container health status
- Environment variable validation
- API endpoint testing
- Hybrid scraper testing (L0/L1/L2)
- Real-time logs

## 🧪 Testing

### Test RSS Collection
```bash
curl -X POST https://your-worker.workers.dev/api/collect \
  -H "Content-Type: application/json" \
  -d '{"sources": ["https://openai.com/blog/rss.xml"], "type": "rss"}'
```

### Test Web Scraping
```bash
curl -X POST https://your-worker.workers.dev/api/collect \
  -H "Content-Type: application/json" \
  -d '{"sources": ["https://www.anthropic.com/news"], "type": "firecrawl"}'
```

### Test Full Pipeline
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
    "deduplicateThreshold": 0.9
  }'
```

## 📚 Documentation

- [DATA_SOURCES.md](./DATA_SOURCES.md) - Complete data source documentation
- [Cloudflare Containers Documentation](https://developers.cloudflare.com/containers/)
- [Cloudflare Workers AI Documentation](https://developers.cloudflare.com/workers-ai/)

## 🛠️ Troubleshooting

### Container not starting
- Check environment variables are configured
- Verify API keys are valid
- Check Cloudflare Workers logs

### Data collection failing
- Verify Firecrawl API key has quota remaining
- Check if source URLs are accessible
- Try different scraping levels (L0/L1/L2)

### Deduplication errors
- Ensure CF_API_KEY is configured correctly
- Check Workers AI quota
- Use `quick: true` for faster, simpler deduplication

### Batch editing not working
- Verify OpenRouter API key
- Check API quota and rate limits
- Reduce `batchSize` or `parallel` settings

Run status check for comprehensive diagnostics:
```bash
bash check-status.sh
```

## 🤝 Contributing

Contributions are welcome! Please:
1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Test thoroughly
5. Submit a pull request

## 📄 License

See LICENSE file for details.

## 🔗 Resources

To learn more about Containers, take a look at the following resources:

- [Container Documentation](https://developers.cloudflare.com/containers/) - learn about Containers
- [Container Class](https://github.com/cloudflare/containers) - learn about the Container helper class

Your feedback and contributions are welcome!

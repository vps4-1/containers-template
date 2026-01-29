const express = require('express');
const FirecrawlService = require('./services/firecrawl');
const { RSSService, TelegramService } = require('./services/rss');
const DeduplicatorService = require('./services/deduplicator');
const EditorService = require('./services/editor');
const HybridScraper = require('./services/hybrid_scraper');

const app = express();
const PORT = process.env.PORT || 3000;

// 生成实例 ID
const INSTANCE_ID = process.env.INSTANCE_ID || `instance-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

// 中间件
app.use(express.json({ limit: '50mb' }));

// 请求日志中间件
app.use((req, res, next) => {
  console.log(`[${new Date().toISOString()}] ${req.method} ${req.path}`);
  next();
});

// 初始化服务
const firecrawl = new FirecrawlService(process.env.FIRECRAWL_API_KEY);
const rss = new RSSService();
const telegram = process.env.TELEGRAM_BOT_TOKEN ? new TelegramService(process.env.TELEGRAM_BOT_TOKEN) : null;
const deduplicator = new DeduplicatorService(process.env.CF_ACCOUNT_ID, process.env.CF_API_KEY);
const editor = new EditorService(process.env.OPENROUTER_API_KEY);
const hybridScraper = new HybridScraper({
  firecrawlService: firecrawl,
  rssService: rss,
  rssBridgeUrl: process.env.RSS_BRIDGE_URL,
  selfHostedFirecrawlUrl: process.env.SELF_HOSTED_FIRECRAWL_URL
});

// 将实例 ID 传递给环境
process.env.INSTANCE_ID = INSTANCE_ID;

// 健康检查
app.get('/health', (req, res) => {
  res.json({
    status: 'healthy',
    service: 'opencode-agent-container',
    timestamp: new Date().toISOString(),
    container: true,
    level: 'container',
    instanceId: process.env.INSTANCE_ID || 'unknown',
    services: {
      firecrawl: !!process.env.FIRECRAWL_API_KEY,
      telegram: !!process.env.TELEGRAM_BOT_TOKEN,
      cloudflare: !!process.env.CF_API_KEY,
      openrouter: !!process.env.OPENROUTER_API_KEY
    }
  });
});

// 根路径
app.get('/', (req, res) => {
  res.json({
    message: 'OpenCode Agent Container',
    version: '1.0.0',
    status: 'online',
    level: 'container',
    endpoints: {
      health: '/health',
      stats: '/stats',
      metrics: '/metrics',
      collect: '/api/collect',
      deduplicate: '/api/deduplicate',
      edit: '/api/edit',
      pipeline: '/api/pipeline'
    }
  });
});

// 统计数据端点
app.get('/stats', (req, res) => {
  try {
    const stats = firecrawl.getStats();
    res.json({
      success: true,
      timestamp: new Date().toISOString(),
      instanceId: INSTANCE_ID,
      ...stats
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// Prometheus 监控指标端点
app.get('/metrics', (req, res) => {
  try {
    const metrics = firecrawl.getPrometheusMetrics();
    res.set('Content-Type', 'text/plain; version=0.0.4');
    res.send(metrics);
  } catch (error) {
    res.status(500).send(`# Error generating metrics: ${error.message}`);
  }
});

// 数据收集端点
app.post('/api/collect', async (req, res) => {
  try {
    const { sources, type = 'auto' } = req.body;
    
    if (!sources || !Array.isArray(sources) || sources.length === 0) {
      return res.status(400).json({
        success: false,
        error: 'sources array is required'
      });
    }

    const results = [];

    // 根据类型收集数据
    for (const source of sources) {
      let result;
      
      if (type === 'firecrawl' || (type === 'auto' && source.startsWith('http'))) {
        // 混合抓取逻辑
        result = await hybridScraper.smartScrape(source, {
          maxArticles: 30
        });
      } else if (type === 'rss' || (type === 'auto' && source.includes('rss'))) {
        // RSS 抓取
        result = await rss.fetchFeed(source);
      } else if (type === 'telegram') {
        // Telegram 抓取
        if (telegram) {
          result = await telegram.getChannelMessages(source, { limit: 100 });
        } else {
          result = {
            success: false,
            error: 'Telegram bot token not configured'
          };
        }
      } else {
        result = {
          success: false,
          error: 'Unknown source type'
        };
      }
      
      results.push({
        source,
        ...result
      });
    }

    // 汇总所有文章
    const allArticles = [];
    for (const result of results) {
      if (result.success) {
        if (result.articles) {
          allArticles.push(...result.articles);
        } else if (result.items) {
          allArticles.push(...result.items);
        } else if (result.messages) {
          allArticles.push(...result.messages);
        }
      }
    }

    res.json({
      success: true,
      message: 'Data collection completed',
      sources: results.length,
      totalArticles: allArticles.length,
      results,
      articles: allArticles
    });
  } catch (error) {
    console.error('Collection error:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// 语义去重端点
app.post('/api/deduplicate', async (req, res) => {
  try {
    const { articles, threshold = 0.9, quick = false } = req.body;
    
    if (!articles || !Array.isArray(articles) || articles.length === 0) {
      return res.status(400).json({
        success: false,
        error: 'articles array is required'
      });
    }

    let result;
    
    if (quick) {
      // 快速去重（仅URL+标题）
      result = deduplicator.quickDeduplicate(articles);
    } else {
      // 语义去重
      result = await deduplicator.deduplicate(articles, {
        threshold,
        compareField: 'content'
      });
    }

    res.json({
      success: true,
      message: 'Deduplication completed',
      ...result
    });
  } catch (error) {
    console.error('Deduplication error:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// 批量编辑端点
app.post('/api/edit', async (req, res) => {
  try {
    const { articles, includeEnglish = true, batchSize = 10 } = req.body;
    
    if (!articles || !Array.isArray(articles) || articles.length === 0) {
      return res.status(400).json({
        success: false,
        error: 'articles array is required'
      });
    }

    const result = await editor.batchEdit(articles, {
      includeEnglish,
      batchSize,
      parallel: 3
    });

    res.json({
      success: true,
      message: 'Batch editing completed',
      ...result
    });
  } catch (error) {
    console.error('Editing error:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// 完整流水线端点
app.post('/api/pipeline', async (req, res) => {
  try {
    const {
      sources,
      sourceType = 'auto',
      deduplicateThreshold = 0.9,
      includeEnglish = true,
      quickDedup = false
    } = req.body;
    
    if (!sources || !Array.isArray(sources) || sources.length === 0) {
      return res.status(400).json({
        success: false,
        error: 'sources array is required'
      });
    }

    console.log('=== Pipeline Start ===');
    console.log(`Sources: ${sources.length}`);

    // 步骤 1: 数据收集
    console.log('Step 1: Collecting data...');
    const collectionResults = [];
    const allArticles = [];

    for (const source of sources) {
      let result;
      
      if (sourceType === 'firecrawl' || (sourceType === 'auto' && source.startsWith('http'))) {
        result = await firecrawl.smartScrape(source, { maxArticles: 30 });
      } else if (sourceType === 'rss') {
        result = await rss.fetchFeed(source);
      } else if (sourceType === 'telegram' && telegram) {
        result = await telegram.getChannelMessages(source, { limit: 100 });
      }
      
      if (result && result.success) {
        collectionResults.push(result);
        if (result.articles) allArticles.push(...result.articles);
        if (result.items) allArticles.push(...result.items);
        if (result.messages) allArticles.push(...result.messages);
      }
    }

    console.log(`Collected ${allArticles.length} articles`);

    if (allArticles.length === 0) {
      return res.json({
        success: true,
        message: 'No articles collected',
        pipeline: {
          collected: 0,
          deduplicated: 0,
          edited: 0
        },
        results: []
      });
    }

    // 步骤 2: 去重
    console.log('Step 2: Deduplicating...');
    let dedupResult;
    
    if (quickDedup) {
      dedupResult = deduplicator.quickDeduplicate(allArticles);
    } else {
      dedupResult = await deduplicator.deduplicate(allArticles, {
        threshold: deduplicateThreshold
      });
    }

    const uniqueArticles = dedupResult.unique || dedupResult.articles;
    console.log(`After dedup: ${uniqueArticles.length} unique articles`);

    // 步骤 3: 批量编辑
    console.log('Step 3: Batch editing...');
    const editResult = await editor.batchEdit(uniqueArticles, {
      includeEnglish,
      batchSize: 10,
      parallel: 3
    });

    console.log(`Edited ${editResult.successful} articles`);
    console.log('=== Pipeline Complete ===');

    res.json({
      success: true,
      message: 'Pipeline completed successfully',
      pipeline: {
        collected: allArticles.length,
        deduplicated: uniqueArticles.length,
        edited: editResult.successful
      },
      results: editResult.results,
      errors: editResult.errors,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('Pipeline error:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// 404 处理
app.use((req, res) => {
  console.log(`[404] ${req.method} ${req.path} 未找到`);
  res.status(404).json({
    error: 'Not Found',
    path: req.path,
    availableEndpoints: ['/', '/health', '/api/collect', '/api/deduplicate', '/api/edit', '/api/pipeline']
  });
});

// 错误处理
app.use((err, req, res, next) => {
  console.error(`[Error] ${err.message}`);
  console.error(err.stack);
  res.status(500).json({
    error: 'Internal Server Error',
    message: err.message,
    timestamp: new Date().toISOString()
  });
});

// 启动前的健康检查
function performStartupChecks() {
  const checks = {
    'FIRECRAWL_API_KEY': !!process.env.FIRECRAWL_API_KEY,
    'OPENROUTER_API_KEY': !!process.env.OPENROUTER_API_KEY,
    'CF_API_KEY': !!process.env.CF_API_KEY,
    'CF_ACCOUNT_ID': !!process.env.CF_ACCOUNT_ID,
  };
  
  console.log('[Startup] ==================== 启动检查 ====================');
  let allOk = true;
  for (const [key, status] of Object.entries(checks)) {
    const icon = status ? '✓' : '✗';
    console.log(`[Startup] ${icon} ${key}: ${status ? '已配置' : '⚠️  缺失'}`);
    if (!status && ['FIRECRAWL_API_KEY', 'OPENROUTER_API_KEY'].includes(key)) {
      allOk = false;
    }
  }
  console.log('[Startup] ================================================');
  
  if (!allOk) {
    console.warn('[Startup] ⚠️  警告: 某些关键 API Key 未配置，部分功能可能不可用');
  }
  
  return checks;
}

// 启动服务器
const server = app.listen(PORT, '0.0.0.0', () => {
  console.log(`[Server] 🚀 OpenCode Agent Container 启动成功`);
  console.log(`[Server] 监听端口: ${PORT}`);
  console.log(`[Server] 环境: ${process.env.NODE_ENV || 'development'}`);
  
  const checks = performStartupChecks();
  
  console.log('[Server] 已初始化的服务:');
  console.log(`  - Firecrawl: ${checks.FIRECRAWL_API_KEY ? '✓' : '✗'}`);
  console.log(`  - OpenRouter: ${checks.OPENROUTER_API_KEY ? '✓' : '✗'}`);
  console.log(`  - Cloudflare: ${checks.CF_API_KEY ? '✓' : '✗'}`);
  console.log('[Server] 容器已就绪，等待请求...');
});

// 优雅关闭
process.on('SIGTERM', () => {
  console.log('[Server] 收到 SIGTERM 信号，开始优雅关闭...');
  server.close(() => {
    console.log('[Server] 服务器已关闭');
    process.exit(0);
  });
});

process.on('SIGINT', () => {
  console.log('[Server] 收到 SIGINT 信号，开始优雅关闭...');
  server.close(() => {
    console.log('[Server] 服务器已关闭');
    process.exit(0);
  });
});

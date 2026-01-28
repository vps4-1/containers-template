const express = require('express');
const FirecrawlService = require('./services/firecrawl');
const { RSSService, TelegramService } = require('./services/rss');
const DeduplicatorService = require('./services/deduplicator');
const EditorService = require('./services/editor');

const app = express();
const PORT = process.env.PORT || 3000;

// 中间件
app.use(express.json({ limit: '50mb' }));

// 初始化服务
const firecrawl = new FirecrawlService(process.env.FIRECRAWL_API_KEY);
const rss = new RSSService();
const telegram = process.env.TELEGRAM_BOT_TOKEN ? new TelegramService(process.env.TELEGRAM_BOT_TOKEN) : null;
const deduplicator = new DeduplicatorService(process.env.CF_ACCOUNT_ID, process.env.CF_API_KEY);
const editor = new EditorService(process.env.OPENROUTER_API_KEY);

// 健康检查
app.get('/health', (req, res) => {
  res.json({
    status: 'healthy',
    service: 'opencode-agent',
    timestamp: new Date().toISOString(),
    container: true,
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
    endpoints: {
      health: '/health',
      collect: '/api/collect',
      deduplicate: '/api/deduplicate',
      edit: '/api/edit',
      pipeline: '/api/pipeline'
    }
  });
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
        // Firecrawl 抓取
        result = await firecrawl.smartScrape(source, {
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
  res.status(404).json({
    error: 'Not Found',
    path: req.path
  });
});

// 错误处理
app.use((err, req, res, next) => {
  console.error('Server error:', err);
  res.status(500).json({
    error: 'Internal Server Error',
    message: err.message
  });
});

// 启动服务器
app.listen(PORT, '0.0.0.0', () => {
  console.log(`OpenCode Agent Container listening on port ${PORT}`);
  console.log(`Environment: ${process.env.NODE_ENV || 'development'}`);
  console.log('Services initialized:');
  console.log(`  - Firecrawl: ${!!process.env.FIRECRAWL_API_KEY}`);
  console.log(`  - Telegram: ${!!process.env.TELEGRAM_BOT_TOKEN}`);
  console.log(`  - Cloudflare AI: ${!!process.env.CF_API_KEY}`);
  console.log(`  - OpenRouter: ${!!process.env.OPENROUTER_API_KEY}`);
});

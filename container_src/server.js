const express = require('express');
const app = express();
const PORT = process.env.PORT || 3000;

// 中间件
app.use(express.json());

// 健康检查
app.get('/health', (req, res) => {
  res.json({
    status: 'healthy',
    service: 'opencode-agent',
    timestamp: new Date().toISOString(),
    container: true
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
      edit: '/api/edit'
    }
  });
});

// 数据收集端点
app.post('/api/collect', async (req, res) => {
  try {
    const { sources } = req.body;
    
    // TODO: 实现 Firecrawl/RSS/TG 数据收集
    res.json({
      success: true,
      message: 'Data collection started',
      sources: sources || []
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// 语义去重端点
app.post('/api/deduplicate', async (req, res) => {
  try {
    const { articles } = req.body;
    
    // TODO: 实现语义去重逻辑
    res.json({
      success: true,
      message: 'Deduplication completed',
      unique_articles: articles || []
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// 批量编辑端点
app.post('/api/edit', async (req, res) => {
  try {
    const { articles } = req.body;
    
    // TODO: 实现批量 AI 编辑
    res.json({
      success: true,
      message: 'Batch editing completed',
      edited_articles: articles || []
    });
  } catch (error) {
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
});

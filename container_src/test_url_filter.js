/**
 * URL 过滤器测试和演示
 * 展示三道关卡如何降低 Firecrawl credit 消耗
 */

const URLFilterService = require('./services/url_filter');

// 测试 URL 集合
const testUrls = {
  // ✅ 应该通过的文章页
  validArticles: [
    'https://openai.com/blog/gpt-4-turbo',
    'https://www.anthropic.com/news/claude-3-opus',
    'https://deepmind.google/discover/blog/gemini-1.5-flash',
    'https://huggingface.co/blog/transformers-agents',
    'https://blog.langchain.dev/introducing-langsmith',
    'https://blog.eleuther.ai/year-one',
    'https://cohere.com/blog/command-r-plus',
    'https://stability.ai/news/stable-diffusion-3',
    'https://replicate.com/blog/run-llama-3-with-an-api',
    'https://www.perplexity.ai/hub/blog/introducing-pplx-api'
  ],
  
  // ❌ 应该被过滤的非文章页
  invalidPages: [
    // 首页
    'https://openai.com/',
    'https://www.anthropic.com/',
    
    // 列表页
    'https://openai.com/blog',
    'https://openai.com/blog/',
    'https://www.anthropic.com/news',
    
    // 分类页
    'https://example.com/category/ai',
    'https://example.com/categories/machine-learning',
    
    // 标签页
    'https://example.com/tag/gpt',
    'https://example.com/tags/llm',
    
    // 作者页
    'https://example.com/author/john-doe',
    'https://example.com/authors/jane-smith',
    
    // 搜索页
    'https://example.com/search?q=ai',
    'https://example.com/?s=machine+learning',
    
    // 分页
    'https://example.com/blog/page/2',
    'https://example.com/posts?page=3',
    
    // 归档页
    'https://example.com/archive',
    'https://example.com/archives/2024',
    
    // 静态资源
    'https://example.com/style.css',
    'https://example.com/script.js',
    'https://example.com/image.jpg',
    'https://example.com/document.pdf',
    
    // 锚点链接
    'https://example.com/blog/article#comments',
    'https://example.com/post#section-2'
  ],
  
  // ⚠️ 需要元数据检查的边缘案例
  edgeCases: [
    'https://example.com/post-123',
    'https://example.com/article',
    'https://example.com/2024/01/some-title',
    'https://example.com/blog/what-is-ai',
    'https://news.ycombinator.com/item?id=39846524'
  ]
};

async function runDemo() {
  console.log('🚀 URL Filter Service Demo\n');
  console.log('=' .repeat(80));
  console.log('三道关卡降低 Firecrawl Credit 消耗');
  console.log('关卡 1：URL 规则过滤（极轻量，正则匹配）');
  console.log('关卡 2：元数据预检（HEAD 请求 + 轻量 GET）');
  console.log('关卡 3：统计追踪（Prometheus 监控）');
  console.log('=' .repeat(80));
  console.log('');

  const filter = new URLFilterService({
    enableCache: true,
    enableMetadataCheck: true, // 设为 false 可跳过元数据检查（仅演示）
    enableStats: true
  });

  // 测试 1：有效文章页
  console.log('📝 测试 1：有效文章页（应该全部通过）');
  console.log('-'.repeat(80));
  
  const validResults = await filter.filterUrls(testUrls.validArticles);
  console.log(`总计：${validResults.stats.total} 个 URL`);
  console.log(`通过：${validResults.stats.passed} 个 ✅`);
  console.log(`过滤：${validResults.stats.filtered} 个 ❌`);
  console.log(`过滤率：${validResults.stats.filter_rate}`);
  console.log(`节省 Credits：${validResults.stats.credits_saved}`);
  console.log(`处理速度：${validResults.stats.throughput}`);
  console.log('');

  // 测试 2：无效页面
  console.log('🚫 测试 2：无效页面（应该大部分被过滤）');
  console.log('-'.repeat(80));
  
  const invalidResults = await filter.filterUrls(testUrls.invalidPages);
  console.log(`总计：${invalidResults.stats.total} 个 URL`);
  console.log(`通过：${invalidResults.stats.passed} 个 ✅`);
  console.log(`过滤：${invalidResults.stats.filtered} 个 ❌`);
  console.log(`过滤率：${invalidResults.stats.filter_rate}`);
  console.log(`节省 Credits：${invalidResults.stats.credits_saved}`);
  console.log('');

  // 显示部分被过滤的 URL 及原因
  console.log('被过滤的示例（前 5 个）：');
  invalidResults.filtered.slice(0, 5).forEach((item, i) => {
    console.log(`  ${i + 1}. ${item.url}`);
    console.log(`     原因：${item.reason}`);
    if (item.detail) console.log(`     详情：${item.detail}`);
  });
  console.log('');

  // 测试 3：边缘案例（需要元数据检查）
  console.log('⚠️  测试 3：边缘案例（需要元数据检查）');
  console.log('-'.repeat(80));
  
  const edgeResults = await filter.filterUrls(testUrls.edgeCases);
  console.log(`总计：${edgeResults.stats.total} 个 URL`);
  console.log(`通过：${edgeResults.stats.passed} 个 ✅`);
  console.log(`过滤：${edgeResults.stats.filtered} 个 ❌`);
  console.log(`过滤率：${edgeResults.stats.filter_rate}`);
  console.log('');

  // 测试 4：缓存效果
  console.log('💾 测试 4：缓存效果（重复 URL）');
  console.log('-'.repeat(80));
  
  // 重复测试相同的 URL
  const duplicateUrls = [...testUrls.invalidPages, ...testUrls.invalidPages];
  const cacheResults = await filter.filterUrls(duplicateUrls);
  
  console.log(`总计：${cacheResults.stats.total} 个 URL`);
  console.log(`通过：${cacheResults.stats.passed} 个 ✅`);
  console.log(`过滤：${cacheResults.stats.filtered} 个 ❌`);
  console.log(`缓存命中率：预期 ~50%（第二次请求走缓存）`);
  console.log('');

  // 总体统计
  console.log('📊 总体统计');
  console.log('='.repeat(80));
  const overallStats = filter.getStats();
  console.log(JSON.stringify(overallStats, null, 2));
  console.log('');

  // Prometheus 指标
  console.log('📈 Prometheus 监控指标');
  console.log('='.repeat(80));
  console.log(filter.getPrometheusMetrics());
  console.log('');

  // 实际场景模拟
  console.log('🎯 实际场景模拟：OpenAI Blog');
  console.log('='.repeat(80));
  
  // 模拟从 OpenAI blog 首页提取的链接（包含各种页面）
  const openAILinks = [
    'https://openai.com/blog',
    'https://openai.com/blog/gpt-4-turbo',
    'https://openai.com/blog/sora',
    'https://openai.com/blog/new-embedding-models',
    'https://openai.com/category/research',
    'https://openai.com/blog/page/2',
    'https://openai.com/search?q=gpt',
    'https://openai.com/blog/chatgpt-plugins',
    'https://openai.com/blog/dall-e-3',
    'https://openai.com/blog#latest'
  ];
  
  const scenarioResults = await filter.filterUrls(openAILinks);
  
  console.log('假设场景：');
  console.log('  - 没有过滤：需要爬取 10 个 URL = 10 credits');
  console.log('  - 使用过滤：只爬取通过的 URL');
  console.log('');
  console.log('结果：');
  console.log(`  总 URL：${scenarioResults.stats.total}`);
  console.log(`  通过（需爬取）：${scenarioResults.stats.passed} 个`);
  console.log(`  过滤（节省）：${scenarioResults.stats.filtered} 个`);
  console.log(`  节省 Credits：${scenarioResults.stats.credits_saved}`);
  console.log(`  节省比例：${scenarioResults.stats.filter_rate}`);
  console.log('');

  console.log('通过的 URL（将调用 Firecrawl）：');
  scenarioResults.passed.forEach((item, i) => {
    console.log(`  ${i + 1}. ${item.url}`);
  });
  console.log('');

  console.log('被过滤的 URL（节省 credits）：');
  scenarioResults.filtered.forEach((item, i) => {
    console.log(`  ${i + 1}. ${item.url} → ${item.reason}`);
  });
  console.log('');

  // 估算年度节省
  console.log('💰 年度成本节省估算');
  console.log('='.repeat(80));
  console.log('假设：');
  console.log('  - 每天处理 1000 个 URL');
  console.log(`  - 过滤率：${scenarioResults.stats.filter_rate}`);
  console.log('  - Firecrawl 价格：$1 = 1000 credits');
  console.log('');
  
  const dailyUrls = 1000;
  const filterRate = parseInt(scenarioResults.stats.filter_rate) / 100;
  const dailySavings = dailyUrls * filterRate;
  const yearlySavings = dailySavings * 365;
  const costSavings = (yearlySavings / 1000).toFixed(2);
  
  console.log('估算结果：');
  console.log(`  每天节省：${dailySavings} credits`);
  console.log(`  每年节省：${yearlySavings} credits`);
  console.log(`  年度成本节省：$${costSavings}`);
  console.log('');

  console.log('✅ 演示完成！');
  console.log('');
  console.log('关键优势：');
  console.log('  1. 极轻量：URL 规则匹配 < 1ms');
  console.log('  2. 零依赖：仅使用 Node.js 内置模块');
  console.log('  3. 高效率：过滤率通常 > 50%');
  console.log('  4. 可监控：Prometheus 指标实时追踪');
  console.log('  5. 可扩展：支持 Redis 缓存（生产环境）');
  console.log('');
  console.log('集成到 Firecrawl Service 后：');
  console.log('  - 所有 scrapeUrls() 调用自动过滤');
  console.log('  - smartScrape() 在链接提取后过滤');
  console.log('  - 大幅降低 credit 消耗');
  console.log('  - 提升整体抓取效率');
}

// 运行演示
if (require.main === module) {
  runDemo().catch(console.error);
}

module.exports = { testUrls };

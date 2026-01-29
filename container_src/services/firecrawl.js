/**
 * Firecrawl 数据抓取服务
 * 集成前置 URL 过滤，大幅降低 credit 消耗
 */

const URLFilterService = require('./url_filter');

class FirecrawlService {
  constructor(apiKey, options = {}) {
    this.apiKey = apiKey;
    this.baseUrl = 'https://api.firecrawl.dev/v1';
    
    // 初始化 URL 过滤器
    this.urlFilter = new URLFilterService({
      enableCache: options.enableCache !== false,
      enableMetadataCheck: options.enableMetadataCheck !== false,
      enableStats: options.enableStats !== false
    });
    
    // 统计数据
    this.stats = {
      totalRequests: 0,
      filteredRequests: 0,
      actualCrawls: 0,
      creditsUsed: 0,
      creditsSaved: 0
    };
  }

  /**
   * 抓取单个URL
   */
  async scrapeUrl(url, options = {}) {
    try {
      const response = await fetch(`${this.baseUrl}/scrape`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.apiKey}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          url,
          formats: ['markdown', 'html'],
          onlyMainContent: true,
          ...options
        })
      });

      if (!response.ok) {
        throw new Error(`Firecrawl API error: ${response.status} ${response.statusText}`);
      }

      const data = await response.json();
      
      return {
        success: true,
        url,
        title: data.data?.metadata?.title || '',
        content: data.data?.markdown || data.data?.html || '',
        metadata: data.data?.metadata || {},
        timestamp: new Date().toISOString()
      };
    } catch (error) {
      console.error(`Firecrawl scrape error for ${url}:`, error);
      return {
        success: false,
        url,
        error: error.message
      };
    }
  }

  /**
   * 批量抓取URL列表（带前置过滤）
   */
  async scrapeUrls(urls, options = {}) {
    const { 
      maxConcurrent = 5,
      skipFilter = false // 允许跳过过滤（用于已知有效 URL）
    } = options;
    
    let urlsToScrape = urls;
    let filterResults = null;
    
    // 前置过滤（三道关卡）
    if (!skipFilter) {
      console.log(`[Firecrawl] Pre-filtering ${urls.length} URLs...`);
      filterResults = await this.urlFilter.filterUrls(urls);
      
      urlsToScrape = filterResults.passed.map(p => p.url);
      
      console.log(`[Firecrawl] Filter results: ${filterResults.passed.length} passed, ${filterResults.filtered.length} filtered`);
      console.log(`[Firecrawl] Credits saved: ${filterResults.stats.credits_saved}`);
      
      // 更新统计
      this.stats.totalRequests += urls.length;
      this.stats.filteredRequests += filterResults.filtered.length;
      this.stats.creditsSaved += filterResults.stats.credits_saved;
    }
    
    const results = [];
    
    // 分批处理通过过滤的 URL
    for (let i = 0; i < urlsToScrape.length; i += maxConcurrent) {
      const batch = urlsToScrape.slice(i, i + maxConcurrent);
      const batchResults = await Promise.all(
        batch.map(url => this.scrapeUrl(url, options))
      );
      results.push(...batchResults);
      
      // 更新统计
      this.stats.actualCrawls += batch.length;
      this.stats.creditsUsed += batch.length;
      
      // 避免频率限制
      if (i + maxConcurrent < urlsToScrape.length) {
        await this.sleep(1000);
      }
    }
    
    // 将过滤掉的 URL 添加到结果中（标记为 filtered）
    if (filterResults && filterResults.filtered.length > 0) {
      for (const filtered of filterResults.filtered) {
        results.push({
          success: false,
          url: filtered.url,
          filtered: true,
          filterReason: filtered.reason,
          filterDetail: filtered.detail
        });
      }
    }
    
    return results;
  }

  /**
   * 抓取并提取链接（用于列表页）
   */
  async scrapeWithLinks(url, options = {}) {
    try {
      const response = await fetch(`${this.baseUrl}/scrape`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.apiKey}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          url,
          formats: ['markdown', 'links'],
          onlyMainContent: true,
          ...options
        })
      });

      if (!response.ok) {
        throw new Error(`Firecrawl API error: ${response.status}`);
      }

      const data = await response.json();
      
      return {
        success: true,
        url,
        content: data.data?.markdown || '',
        links: data.data?.links || [],
        metadata: data.data?.metadata || {}
      };
    } catch (error) {
      console.error(`Firecrawl scrape with links error:`, error);
      return {
        success: false,
        url,
        error: error.message
      };
    }
  }

  /**
   * 智能抓取：自动识别列表页并深入抓取（带前置过滤）
   */
  async smartScrape(url, options = {}) {
    const { 
      maxDepth = 2, 
      maxArticles = 30,
      skipFilter = false
    } = options;
    
    // 第一步：抓取主页面
    const mainPage = await this.scrapeWithLinks(url, options);
    
    if (!mainPage.success) {
      return {
        success: false,
        error: mainPage.error
      };
    }

    const articles = [];
    
    // 检查是否是列表页（有多个链接）
    if (mainPage.links && mainPage.links.length > 0) {
      console.log(`Found ${mainPage.links.length} links, extracting articles...`);
      
      // 过滤相关链接
      const relevantLinks = this.filterRelevantLinks(mainPage.links, url);
      
      // 【关键优化】在调用 Firecrawl 之前先过滤一遍
      let linksToScrape = relevantLinks;
      if (!skipFilter) {
        console.log(`[SmartScrape] Pre-filtering ${relevantLinks.length} links...`);
        const filterResults = await this.urlFilter.filterUrls(relevantLinks);
        linksToScrape = filterResults.passed.map(p => p.url);
        
        console.log(`[SmartScrape] Filter: ${linksToScrape.length} passed, ${filterResults.filtered.length} filtered`);
        console.log(`[SmartScrape] Credits saved: ${filterResults.stats.credits_saved}`);
      }
      
      // 限制数量
      const limitedLinks = linksToScrape.slice(0, maxArticles);
      
      // 抓取文章详情（已经过滤，使用 skipFilter: true）
      const articleResults = await this.scrapeUrls(limitedLinks, { 
        ...options, 
        skipFilter: true // 已经过滤过了
      });
      articles.push(...articleResults.filter(r => r.success));
    } else {
      // 单篇文章
      articles.push(mainPage);
    }
    
    return {
      success: true,
      source: url,
      articlesCount: articles.length,
      articles,
      stats: this.getStats()
    };
  }

  /**
   * 过滤相关链接
   */
  filterRelevantLinks(links, baseUrl) {
    const baseDomain = new URL(baseUrl).hostname;
    
    return links
      .filter(link => {
        try {
          const linkUrl = new URL(link, baseUrl);
          // 同域名
          if (linkUrl.hostname !== baseDomain) return false;
          // 排除常见非文章页面
          const excludePatterns = ['/tag/', '/category/', '/author/', '/page/', '/search/', '#'];
          if (excludePatterns.some(p => link.includes(p))) return false;
          return true;
        } catch {
          return false;
        }
      })
      .slice(0, 50); // 最多50个链接
  }

  /**
   * 辅助：延迟函数
   */
  sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * 获取 Firecrawl 服务统计数据
   */
  getStats() {
    const urlFilterStats = this.urlFilter.getStats();
    
    return {
      firecrawl: {
        total_requests: this.stats.totalRequests,
        filtered_before_crawl: this.stats.filteredRequests,
        actual_crawls: this.stats.actualCrawls,
        credits_used: this.stats.creditsUsed,
        credits_saved: this.stats.creditsSaved,
        savings_rate: this.stats.totalRequests > 0 
          ? `${((this.stats.creditsSaved / this.stats.totalRequests) * 100).toFixed(2)}%`
          : '0%'
      },
      url_filter: urlFilterStats
    };
  }

  /**
   * 获取 Prometheus 监控指标
   */
  getPrometheusMetrics() {
    const urlFilterMetrics = this.urlFilter.getPrometheusMetrics();
    
    return `
${urlFilterMetrics}

# HELP firecrawl_total_requests Total Firecrawl requests attempted
# TYPE firecrawl_total_requests counter
firecrawl_total_requests ${this.stats.totalRequests}

# HELP firecrawl_actual_crawls Actual Firecrawl API calls made
# TYPE firecrawl_actual_crawls counter
firecrawl_actual_crawls ${this.stats.actualCrawls}

# HELP firecrawl_credits_used Firecrawl credits consumed
# TYPE firecrawl_credits_used counter
firecrawl_credits_used ${this.stats.creditsUsed}

# HELP firecrawl_credits_saved Credits saved by pre-filtering
# TYPE firecrawl_credits_saved counter
firecrawl_credits_saved ${this.stats.creditsSaved}
`.trim();
  }

  /**
   * 重置统计数据
   */
  resetStats() {
    this.stats = {
      totalRequests: 0,
      filteredRequests: 0,
      actualCrawls: 0,
      creditsUsed: 0,
      creditsSaved: 0
    };
    this.urlFilter.resetStats();
  }
}

module.exports = FirecrawlService;

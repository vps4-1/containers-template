/**
 * Firecrawl 数据抓取服务
 */

class FirecrawlService {
  constructor(apiKey) {
    this.apiKey = apiKey;
    this.baseUrl = 'https://api.firecrawl.dev/v1';
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
   * 批量抓取URL列表
   */
  async scrapeUrls(urls, options = {}) {
    const { maxConcurrent = 5 } = options;
    const results = [];
    
    // 分批处理
    for (let i = 0; i < urls.length; i += maxConcurrent) {
      const batch = urls.slice(i, i + maxConcurrent);
      const batchResults = await Promise.all(
        batch.map(url => this.scrapeUrl(url, options))
      );
      results.push(...batchResults);
      
      // 避免频率限制
      if (i + maxConcurrent < urls.length) {
        await this.sleep(1000);
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
   * 智能抓取：自动识别列表页并深入抓取
   */
  async smartScrape(url, options = {}) {
    const { maxDepth = 2, maxArticles = 30 } = options;
    
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
      const limitedLinks = relevantLinks.slice(0, maxArticles);
      
      // 抓取文章详情
      const articleResults = await this.scrapeUrls(limitedLinks, options);
      articles.push(...articleResults.filter(r => r.success));
    } else {
      // 单篇文章
      articles.push(mainPage);
    }
    
    return {
      success: true,
      source: url,
      articlesCount: articles.length,
      articles
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
}

module.exports = FirecrawlService;

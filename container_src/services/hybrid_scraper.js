/**
 * 混合抓取服务 (Hybrid Scraper)
 * 实现 L0 (RSS-Bridge), L1 (自建 Firecrawl), L2 (托管 Firecrawl) 的分级逻辑
 */

class HybridScraper {
  constructor(config) {
    this.firecrawlService = config.firecrawlService;
    this.rssService = config.rssService;
    this.rssBridgeUrl = config.rssBridgeUrl || 'http://localhost:8080'; // 假设 RSS-Bridge 运行在本地或容器内
    this.selfHostedFirecrawlUrl = config.selfHostedFirecrawlUrl;
  }

  /**
   * 智能抓取入口
   */
  async smartScrape(url, options = {}) {
    console.log(`[HybridScraper] 正在处理 URL: ${url}`);

    // 1. 尝试 L0: RSS-Bridge (如果已配置且适用)
    if (this.isRssBridgeCandidate(url)) {
      console.log(`[HybridScraper] 尝试 L0: RSS-Bridge...`);
      const rssResult = await this.rssService.fetchFeed(`${this.rssBridgeUrl}/?action=display&bridge=Zhihu&url=${encodeURIComponent(url)}&format=Atom`);
      if (rssResult.success && rssResult.items.length > 0) {
        return { level: 'L0', ...rssResult };
      }
    }

    // 2. 尝试 L1: 自建 Firecrawl (如果配置了自建地址)
    if (this.selfHostedFirecrawlUrl) {
      console.log(`[HybridScraper] 尝试 L1: 自建 Firecrawl...`);
      try {
        const response = await fetch(`${this.selfHostedFirecrawlUrl}/v0/scrape`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ url, ...options })
        });
        if (response.ok) {
          const data = await response.json();
          return { level: 'L1', success: true, data };
        }
      } catch (e) {
        console.warn(`[HybridScraper] L1 抓取失败: ${e.message}`);
      }
    }

    // 3. 降级到 L2: 托管 Firecrawl
    console.log(`[HybridScraper] 降级到 L2: 托管 Firecrawl...`);
    const l2Result = await this.firecrawlService.smartScrape(url, options);
    return { level: 'L2', ...l2Result };
  }

  /**
   * 判断是否适合使用 RSS-Bridge
   */
  isRssBridgeCandidate(url) {
    const candidates = ['zhihu.com', 'weibo.com', 'twitter.com', 'x.com'];
    return candidates.some(domain => url.includes(domain));
  }
}

module.exports = HybridScraper;

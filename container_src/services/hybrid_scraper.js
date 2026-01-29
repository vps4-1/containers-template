const fetch = require('node-fetch');
const cheerio = require('cheerio');

class HybridScraper {
    constructor({ firecrawlService, rssService, rssBridgeUrl, selfHostedFirecrawlUrl }) {
        this.firecrawlService = firecrawlService;
        this.rssService = rssService;
        this.rssBridgeUrl = rssBridgeUrl;
        this.selfHostedFirecrawlUrl = selfHostedFirecrawlUrl;
        this.stats = {
            totalAttempts: 0,
            filteredByUrl: 0,
            filteredByMetadata: 0,
            filteredByIncremental: 0,
            scrapedSuccess: 0,
            scrapedFailed: 0,
        };
    }

    // --- 核心前置过滤逻辑 ---

    /**
     * 1. URL 规则过滤
     * @param {string} url 
     * @returns {boolean} true if URL is valuable, false otherwise
     */
    isValuableUrl(url) {
        this.stats.totalAttempts++;
        const junkPatterns = [
            /login|signup|register|account|profile/i, // 登录/注册页面
            /\.(pdf|zip|rar|exe|jpg|png|gif|mp4|mp3)$/i, // 媒体文件
            /cart|checkout|purchase|subscribe/i, // 购物/订阅流程
            /tag|category|author\//i, // 索引页（通常不需要深度抓取）
        ];

        const isJunk = junkPatterns.some(pattern => pattern.test(url));
        if (isJunk) {
            this.stats.filteredByUrl++;
            console.log(`[PreCheck] ✗ URL Filtered: ${url}`);
        }
        return !isJunk;
    }

    /**
     * 2. 元数据预检
     * @param {string} url 
     * @returns {Promise<boolean>} true if metadata looks valuable, false otherwise
     */
    async metadataPrecheck(url) {
        try {
            const response = await fetch(url, { timeout: 5000 }); // 5秒超时
            if (!response.ok) {
                console.warn(`[PreCheck] Metadata fetch failed for ${url}: ${response.status}`);
                return false; // 抓取失败，跳过
            }

            const html = await response.text();
            const $ = cheerio.load(html);
            const title = $('title').text().trim();
            const description = $('meta[name="description"]').attr('content') || '';

            // 检查标题和描述的长度
            if (title.length < 10 || description.length < 20) {
                this.stats.filteredByMetadata++;
                console.log(`[PreCheck] ✗ Metadata Filtered (Too short): ${url}`);
                return false;
            }

            // 检查是否包含常见无效关键词
            const junkKeywords = /404|not found|error|login|subscribe|maintenance/i;
            if (junkKeywords.test(title) || junkKeywords.test(description)) {
                this.stats.filteredByMetadata++;
                console.log(`[PreCheck] ✗ Metadata Filtered (Junk keywords): ${url}`);
                return false;
            }

            console.log(`[PreCheck] ✓ Metadata Passed: ${title.substring(0, 30)}...`);
            return true;
        } catch (error) {
            console.error(`[PreCheck] Metadata check error for ${url}: ${error.message}`);
            return false; // 发生错误，跳过
        }
    }

    /**
     * 3. 增量检查 (Placeholder)
     * 实际的去重逻辑应该依赖于 Durable Objects 或 KV 存储。
     * @param {string} url 
     * @returns {Promise<boolean>} true if new, false if already processed
     */
    async incrementalCheck(url) {
        // TODO: 实际实现需要调用 DeduplicatorService 或 KV 存储进行哈希检查
        // 假设这里总是返回 true，直到 DeduplicatorService 介入
        // if (await this.deduplicatorService.isProcessed(url)) {
        //     this.stats.filteredByIncremental++;
        //     return false;
        // }
        return true;
    }

    /**
     * 综合前置检查
     * @param {string} url 
     * @returns {Promise<boolean>} true if the URL is worth scraping
     */
    async preCheck(url) {
        if (!this.isValuableUrl(url)) {
            return false;
        }
        if (!(await this.incrementalCheck(url))) {
            return false;
        }
        if (!(await this.metadataPrecheck(url))) {
            return false;
        }
        return true;
    }

    // --- 混合抓取逻辑 ---

    /**
     * 智能抓取入口
     */
    async smartScrape(url, options = {}) {
        console.log(`[HybridScraper] 正在处理 URL: ${url}`);

        // 0. 前置检查：判断是否值得抓取
        if (!(await this.preCheck(url))) {
            return { level: 'Filtered', success: false, reason: 'Pre-check failed' };
        }

        // 1. 尝试 L0: RSS-Bridge (如果已配置且适用)
        if (this.isRssBridgeCandidate(url)) {
            console.log(`[HybridScraper] 尝试 L0: RSS-Bridge...`);
            // 假设 rssService.fetchFeed 已经实现了对 RSS-Bridge 的调用
            const rssResult = await this.rssService.fetchFeed(`${this.rssBridgeUrl}/?action=display&bridge=Zhihu&url=${encodeURIComponent(url)}&format=Atom`);
            if (rssResult.success && rssResult.items && rssResult.items.length > 0) {
                this.stats.scrapedSuccess++;
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
                    this.stats.scrapedSuccess++;
                    return { level: 'L1', success: true, data };
                }
            } catch (e) {
                console.warn(`[HybridScraper] L1 抓取失败: ${e.message}`);
            }
        }

        // 3. 降级到 L2: 托管 Firecrawl
        console.log(`[HybridScraper] 降级到 L2: 托管 Firecrawl...`);
        try {
            const l2Result = await this.firecrawlService.smartScrape(url, options);
            if (l2Result.success) {
                this.stats.scrapedSuccess++;
            } else {
                this.stats.scrapedFailed++;
            }
            return { level: 'L2', ...l2Result };
        } catch (error) {
            this.stats.scrapedFailed++;
            console.error(`[Scraper] L2 (Managed Firecrawl) failed for ${url}: ${error.message}`);
            return { level: 'L2', success: false, reason: error.message };
        }
    }

    /**
     * 判断是否适合使用 RSS-Bridge
     */
    isRssBridgeCandidate(url) {
        const candidates = ['zhihu.com', 'weibo.com', 'twitter.com', 'x.com'];
        return candidates.some(domain => url.includes(domain));
    }

    getStats() {
        return this.stats;
    }
}

module.exports = HybridScraper;

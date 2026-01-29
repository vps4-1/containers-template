/**
 * URL 前置过滤服务
 * 三道关卡降低 Firecrawl credit 消耗
 * 1. URL 规则过滤（极轻量，正则匹配）
 * 2. 元数据预检（HEAD 请求 + 轻量 GET）
 * 3. 统计追踪（Prometheus 监控）
 */

const { URL } = require('url');

class URLFilterService {
  constructor(options = {}) {
    this.options = {
      enableCache: true,
      enableMetadataCheck: true,
      enableStats: true,
      ...options
    };
    
    // 统计数据
    this.stats = {
      total: 0,
      filtered: {
        urlPattern: 0,
        robotsTxt: 0,
        metadata: 0,
        duplicate: 0
      },
      passed: 0,
      credits_saved: 0
    };
    
    // 简单内存缓存（生产环境应使用 Redis）
    this.cache = new Map();
    this.cacheExpiry = 3600 * 1000; // 1 小时
  }

  /**
   * 主过滤方法：三道关卡
   */
  async filterUrls(urls) {
    const startTime = Date.now();
    const results = {
      passed: [],
      filtered: [],
      stats: {}
    };

    for (const url of urls) {
      this.stats.total++;
      
      // 检查缓存
      if (this.options.enableCache) {
        const cached = this.getCached(url);
        if (cached !== null) {
          this.stats.filtered.duplicate++;
          results.filtered.push({
            url,
            reason: 'duplicate',
            cached: true
          });
          continue;
        }
      }

      // 关卡 1：URL 规则过滤（最轻量）
      const urlCheck = this.checkUrlPattern(url);
      if (!urlCheck.pass) {
        this.stats.filtered.urlPattern++;
        this.stats.credits_saved += 1; // 每次拦截节省 1 credit
        results.filtered.push({
          url,
          reason: 'url_pattern',
          detail: urlCheck.reason
        });
        this.setCache(url, false);
        continue;
      }

      // 关卡 2：元数据预检（轻量 HTTP 请求）
      if (this.options.enableMetadataCheck) {
        const metaCheck = await this.checkMetadata(url);
        if (!metaCheck.pass) {
          this.stats.filtered.metadata++;
          this.stats.credits_saved += 1;
          results.filtered.push({
            url,
            reason: 'metadata',
            detail: metaCheck.reason,
            metadata: metaCheck.metadata
          });
          this.setCache(url, false);
          continue;
        }
      }

      // 通过所有关卡
      this.stats.passed++;
      results.passed.push({
        url,
        confidence: 'high',
        metadata: {}
      });
      this.setCache(url, true);
    }

    // 关卡 3：统计追踪
    const duration = Date.now() - startTime;
    results.stats = {
      total: urls.length,
      passed: results.passed.length,
      filtered: results.filtered.length,
      filter_rate: ((results.filtered.length / urls.length) * 100).toFixed(2) + '%',
      credits_saved: this.stats.credits_saved,
      duration_ms: duration,
      throughput: (urls.length / (duration / 1000)).toFixed(2) + ' urls/s'
    };

    return results;
  }

  /**
   * 关卡 1：URL 规则过滤
   * 基于 URL 模式快速判断是否为文章页
   */
  checkUrlPattern(urlString) {
    try {
      const url = new URL(urlString);
      const pathname = url.pathname.toLowerCase();
      const search = url.search.toLowerCase();

      // 排除规则 1：首页
      if (pathname === '/' || pathname === '') {
        return { pass: false, reason: 'homepage' };
      }

      // 排除规则 2：列表页/分类页/标签页
      const excludePatterns = [
        /^\/category\//i,
        /^\/categories\//i,
        /^\/tag\//i,
        /^\/tags\//i,
        /^\/archive\//i,
        /^\/archives\//i,
        /^\/page\/\d+/i,
        /^\/author\//i,
        /^\/authors\//i,
        /^\/search/i,
        /^\/index\.html?$/i,
        /^\/blog\/?$/i,
        /^\/news\/?$/i,
        /^\/posts\/?$/i,
        /^\/articles\/?$/i
      ];

      for (const pattern of excludePatterns) {
        if (pattern.test(pathname)) {
          return { pass: false, reason: `exclude_pattern: ${pattern.source}` };
        }
      }

      // 排除规则 3：查询参数（搜索、分页等）
      const excludeQueryParams = ['page', 'p', 's', 'search', 'q', 'query', 'filter', 'category', 'tag'];
      for (const param of excludeQueryParams) {
        if (search.includes(`${param}=`)) {
          return { pass: false, reason: `query_param: ${param}` };
        }
      }

      // 排除规则 4：静态资源
      const staticExtensions = ['.jpg', '.jpeg', '.png', '.gif', '.svg', '.css', '.js', '.json', '.xml', '.pdf', '.zip'];
      for (const ext of staticExtensions) {
        if (pathname.endsWith(ext)) {
          return { pass: false, reason: `static_file: ${ext}` };
        }
      }

      // 排除规则 5：锚点链接
      if (url.hash && url.hash.length > 1) {
        return { pass: false, reason: 'anchor_link' };
      }

      // 包含规则 1：明确的文章路径模式
      const articlePatterns = [
        /\/blog\/[\w-]+/i,
        /\/post\/[\w-]+/i,
        /\/article\/[\w-]+/i,
        /\/news\/[\w-]+/i,
        /\/\d{4}\/\d{2}\/[\w-]+/i, // 日期路径：/2024/01/article-name
        /\/[\w-]+-\d+\.html?$/i,   // 标题-ID.html
      ];

      for (const pattern of articlePatterns) {
        if (pattern.test(pathname)) {
          return { pass: true, reason: `article_pattern: ${pattern.source}`, confidence: 'high' };
        }
      }

      // 包含规则 2：路径深度（文章通常有一定深度）
      const pathSegments = pathname.split('/').filter(s => s.length > 0);
      if (pathSegments.length >= 2 && pathSegments.length <= 6) {
        // 检查最后一段是否像文章标题（长度 > 10，包含连字符或下划线）
        const lastSegment = pathSegments[pathSegments.length - 1];
        if (lastSegment.length > 10 && /[-_]/.test(lastSegment)) {
          return { pass: true, reason: 'title_like_path', confidence: 'medium' };
        }
      }

      // 默认：谨慎放行（避免误杀）
      // 如果 URL 不明显是非文章页，给它一个机会
      if (pathSegments.length >= 1) {
        return { pass: true, reason: 'default_pass', confidence: 'low' };
      }

      return { pass: false, reason: 'no_match' };

    } catch (error) {
      console.error('URL pattern check error:', error);
      return { pass: false, reason: 'invalid_url' };
    }
  }

  /**
   * 关卡 2：元数据预检
   * 轻量 HTTP 请求检查页面元数据
   */
  async checkMetadata(urlString) {
    try {
      // 步骤 1：HEAD 请求检查 Content-Type（最轻量）
      const headCheck = await this.checkHead(urlString);
      if (!headCheck.pass) {
        return headCheck;
      }

      // 步骤 2：轻量 GET 请求获取 <head> 部分元数据
      const metaCheck = await this.fetchMetadata(urlString);
      if (!metaCheck.pass) {
        return metaCheck;
      }

      return { 
        pass: true, 
        reason: 'metadata_valid',
        metadata: metaCheck.metadata 
      };

    } catch (error) {
      console.error('Metadata check error:', error);
      // 网络错误时谨慎放行（避免误杀真实文章）
      return { pass: true, reason: 'metadata_check_failed', warning: error.message };
    }
  }

  /**
   * HEAD 请求检查 Content-Type
   */
  async checkHead(url) {
    try {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 3000); // 3 秒超时

      const response = await fetch(url, {
        method: 'HEAD',
        signal: controller.signal,
        redirect: 'follow'
      });

      clearTimeout(timeout);

      const contentType = response.headers.get('content-type') || '';

      // 检查是否为 HTML 页面
      if (!contentType.includes('text/html')) {
        return { 
          pass: false, 
          reason: 'not_html', 
          detail: `content-type: ${contentType}` 
        };
      }

      return { pass: true };

    } catch (error) {
      // HEAD 请求失败时放行（有些网站不支持 HEAD）
      return { pass: true, warning: 'head_request_failed' };
    }
  }

  /**
   * 轻量 GET 请求获取元数据
   * 只读取前 16KB（足够包含 <head> 部分）
   */
  async fetchMetadata(url) {
    try {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 5000); // 5 秒超时

      const response = await fetch(url, {
        method: 'GET',
        signal: controller.signal,
        redirect: 'follow'
      });

      clearTimeout(timeout);

      if (!response.ok) {
        return { pass: false, reason: 'http_error', detail: `status: ${response.status}` };
      }

      // 只读取前 16KB
      const reader = response.body.getReader();
      const chunks = [];
      let bytesRead = 0;
      const maxBytes = 16 * 1024; // 16KB

      while (bytesRead < maxBytes) {
        const { done, value } = await reader.read();
        if (done) break;
        chunks.push(value);
        bytesRead += value.length;
      }

      // 取消剩余读取
      await reader.cancel();

      const htmlChunk = new TextDecoder('utf-8').decode(
        new Uint8Array(chunks.flat())
      );

      // 解析元数据
      const metadata = this.parseMetadata(htmlChunk);

      // 验证元数据
      return this.validateMetadata(metadata);

    } catch (error) {
      // 网络错误时放行
      return { pass: true, warning: 'metadata_fetch_failed' };
    }
  }

  /**
   * 解析 HTML 元数据（简单正则，避免引入重量库）
   */
  parseMetadata(html) {
    const metadata = {};

    // 提取 <title>
    const titleMatch = html.match(/<title[^>]*>(.*?)<\/title>/is);
    if (titleMatch) {
      metadata.title = titleMatch[1].trim().substring(0, 200);
    }

    // 提取 meta description
    const descMatch = html.match(/<meta\s+name=["']description["']\s+content=["'](.*?)["']/is);
    if (descMatch) {
      metadata.description = descMatch[1].trim().substring(0, 300);
    }

    // 提取 og:type
    const ogTypeMatch = html.match(/<meta\s+property=["']og:type["']\s+content=["'](.*?)["']/is);
    if (ogTypeMatch) {
      metadata.ogType = ogTypeMatch[1].trim();
    }

    // 提取 article:published_time
    const publishedMatch = html.match(/<meta\s+property=["']article:published_time["']\s+content=["'](.*?)["']/is);
    if (publishedMatch) {
      metadata.published = publishedMatch[1].trim();
    }

    // 检查是否有 article 相关标签
    metadata.hasArticleSchema = /articleBody|article:published|og:article/i.test(html);

    return metadata;
  }

  /**
   * 验证元数据是否符合文章页特征
   */
  validateMetadata(metadata) {
    const reasons = [];

    // 检查 1：必须有 title
    if (!metadata.title || metadata.title.length < 10) {
      return { 
        pass: false, 
        reason: 'no_valid_title', 
        metadata 
      };
    }

    // 检查 2：og:type 为 article
    if (metadata.ogType && metadata.ogType === 'article') {
      return { 
        pass: true, 
        reason: 'og_type_article', 
        metadata,
        confidence: 'high'
      };
    }

    // 检查 3：有 article schema 标记
    if (metadata.hasArticleSchema) {
      return { 
        pass: true, 
        reason: 'article_schema', 
        metadata,
        confidence: 'high'
      };
    }

    // 检查 4：有发布时间
    if (metadata.published) {
      return { 
        pass: true, 
        reason: 'has_published_date', 
        metadata,
        confidence: 'medium'
      };
    }

    // 检查 5：有合理的 description
    if (metadata.description && metadata.description.length > 50) {
      reasons.push('has_description');
    }

    // 检查 6：title 不包含常见列表页关键词
    const listPageKeywords = ['archive', 'category', 'tag', 'search results', 'page', 'index'];
    const titleLower = metadata.title.toLowerCase();
    for (const keyword of listPageKeywords) {
      if (titleLower.includes(keyword)) {
        return { 
          pass: false, 
          reason: `title_contains_${keyword}`, 
          metadata 
        };
      }
    }

    // 默认：如果有 title 和 description，谨慎放行
    if (metadata.title && metadata.description) {
      return { 
        pass: true, 
        reason: 'basic_metadata_present', 
        metadata,
        confidence: 'low'
      };
    }

    return { 
      pass: false, 
      reason: 'insufficient_metadata', 
      metadata 
    };
  }

  /**
   * 缓存管理
   */
  getCached(url) {
    if (!this.cache.has(url)) return null;
    
    const cached = this.cache.get(url);
    if (Date.now() - cached.timestamp > this.cacheExpiry) {
      this.cache.delete(url);
      return null;
    }
    
    return cached.value;
  }

  setCache(url, value) {
    this.cache.set(url, {
      value,
      timestamp: Date.now()
    });
    
    // 简单的 LRU：超过 1000 条时清理
    if (this.cache.size > 1000) {
      const firstKey = this.cache.keys().next().value;
      this.cache.delete(firstKey);
    }
  }

  /**
   * 获取统计数据（Prometheus 格式）
   */
  getStats() {
    const filterRate = this.stats.total > 0 
      ? ((this.stats.filtered.urlPattern + this.stats.filtered.metadata + this.stats.filtered.duplicate) / this.stats.total * 100).toFixed(2)
      : 0;

    return {
      total_urls: this.stats.total,
      passed_urls: this.stats.passed,
      filtered_urls: {
        by_url_pattern: this.stats.filtered.urlPattern,
        by_metadata: this.stats.filtered.metadata,
        by_duplicate: this.stats.filtered.duplicate,
        total: this.stats.filtered.urlPattern + this.stats.filtered.metadata + this.stats.filtered.duplicate
      },
      filter_rate: `${filterRate}%`,
      credits_saved: this.stats.credits_saved,
      cache_size: this.cache.size,
      cache_hit_rate: this.stats.filtered.duplicate > 0 
        ? `${(this.stats.filtered.duplicate / this.stats.total * 100).toFixed(2)}%`
        : '0%'
    };
  }

  /**
   * 导出 Prometheus 指标
   */
  getPrometheusMetrics() {
    const stats = this.getStats();
    return `
# HELP url_filter_total Total URLs processed
# TYPE url_filter_total counter
url_filter_total ${stats.total_urls}

# HELP url_filter_passed URLs passed through filter
# TYPE url_filter_passed counter
url_filter_passed ${stats.passed_urls}

# HELP url_filter_rejected URLs rejected by filter
# TYPE url_filter_rejected counter
url_filter_rejected_by_pattern ${stats.filtered_urls.by_url_pattern}
url_filter_rejected_by_metadata ${stats.filtered_urls.by_metadata}
url_filter_rejected_by_duplicate ${stats.filtered_urls.by_duplicate}

# HELP url_filter_credits_saved Firecrawl credits saved by filtering
# TYPE url_filter_credits_saved counter
url_filter_credits_saved ${stats.credits_saved}

# HELP url_filter_cache_size Current cache size
# TYPE url_filter_cache_size gauge
url_filter_cache_size ${stats.cache_size}
`.trim();
  }

  /**
   * 重置统计数据
   */
  resetStats() {
    this.stats = {
      total: 0,
      filtered: {
        urlPattern: 0,
        robotsTxt: 0,
        metadata: 0,
        duplicate: 0
      },
      passed: 0,
      credits_saved: 0
    };
  }

  /**
   * 清空缓存
   */
  clearCache() {
    this.cache.clear();
  }
}

module.exports = URLFilterService;

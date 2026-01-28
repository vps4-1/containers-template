/**
 * 语义去重服务（使用 Cloudflare Workers AI）
 */

class DeduplicatorService {
  constructor(cfAccountId, cfApiKey) {
    this.cfAccountId = cfAccountId;
    this.cfApiKey = cfApiKey;
    this.baseUrl = `https://api.cloudflare.com/client/v4/accounts/${cfAccountId}/ai/run`;
    this.embeddingModel = '@cf/baai/bge-base-en-v1.5'; // Cloudflare Workers AI 免费模型
  }

  /**
   * 生成文本 embedding
   */
  async generateEmbedding(text) {
    try {
      // 截取前512个token（约2000字符）
      const truncatedText = text.substring(0, 2000);
      
      const response = await fetch(`${this.baseUrl}/${this.embeddingModel}`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.cfApiKey}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          text: truncatedText
        })
      });

      if (!response.ok) {
        throw new Error(`CF AI API error: ${response.status}`);
      }

      const data = await response.json();
      return data.result.data[0]; // 返回 embedding 向量
    } catch (error) {
      console.error('Embedding generation error:', error);
      throw error;
    }
  }

  /**
   * 批量生成 embeddings
   */
  async generateEmbeddings(texts) {
    const embeddings = [];
    
    // 分批处理，避免频率限制
    for (let i = 0; i < texts.length; i++) {
      try {
        const embedding = await this.generateEmbedding(texts[i]);
        embeddings.push(embedding);
        
        // 每5个请求延迟一下
        if ((i + 1) % 5 === 0 && i < texts.length - 1) {
          await this.sleep(500);
        }
      } catch (error) {
        console.error(`Failed to generate embedding for text ${i}:`, error);
        embeddings.push(null);
      }
    }
    
    return embeddings;
  }

  /**
   * 计算余弦相似度
   */
  cosineSimilarity(vecA, vecB) {
    if (!vecA || !vecB || vecA.length !== vecB.length) {
      return 0;
    }

    let dotProduct = 0;
    let normA = 0;
    let normB = 0;

    for (let i = 0; i < vecA.length; i++) {
      dotProduct += vecA[i] * vecB[i];
      normA += vecA[i] * vecA[i];
      normB += vecB[i] * vecB[i];
    }

    normA = Math.sqrt(normA);
    normB = Math.sqrt(normB);

    if (normA === 0 || normB === 0) {
      return 0;
    }

    return dotProduct / (normA * normB);
  }

  /**
   * 语义去重主函数
   */
  async deduplicate(articles, options = {}) {
    const {
      threshold = 0.9,           // 相似度阈值
      compareField = 'content',  // 比较字段
      keepFirst = true           // 保留第一个还是质量最高的
    } = options;

    console.log(`Starting deduplication for ${articles.length} articles...`);

    // 第一层：URL去重
    const urlMap = new Map();
    const urlDeduped = [];
    
    for (const article of articles) {
      const url = article.url || article.link;
      if (!url || !urlMap.has(url)) {
        if (url) urlMap.set(url, true);
        urlDeduped.push(article);
      }
    }

    console.log(`After URL dedup: ${urlDeduped.length} articles`);

    // 第二层：语义去重
    if (urlDeduped.length <= 1) {
      return {
        original: articles.length,
        afterUrlDedup: urlDeduped.length,
        afterSemanticDedup: urlDeduped.length,
        unique: urlDeduped,
        duplicates: []
      };
    }

    // 提取文本内容
    const texts = urlDeduped.map(article => {
      const text = article[compareField] || article.description || article.title || '';
      return text.substring(0, 2000); // 限制长度
    });

    // 生成 embeddings
    console.log('Generating embeddings...');
    const embeddings = await this.generateEmbeddings(texts);

    // 标记重复项
    const duplicateIndices = new Set();
    const duplicateGroups = [];

    for (let i = 0; i < embeddings.length; i++) {
      if (duplicateIndices.has(i) || !embeddings[i]) continue;

      const group = [i];

      for (let j = i + 1; j < embeddings.length; j++) {
        if (duplicateIndices.has(j) || !embeddings[j]) continue;

        const similarity = this.cosineSimilarity(embeddings[i], embeddings[j]);
        
        if (similarity >= threshold) {
          group.push(j);
          duplicateIndices.add(j);
        }
      }

      if (group.length > 1) {
        duplicateGroups.push(group);
      }
    }

    // 构建结果
    const unique = [];
    const duplicates = [];

    for (let i = 0; i < urlDeduped.length; i++) {
      if (!duplicateIndices.has(i)) {
        unique.push(urlDeduped[i]);
      } else {
        duplicates.push(urlDeduped[i]);
      }
    }

    console.log(`After semantic dedup: ${unique.length} unique articles, ${duplicates.length} duplicates`);

    return {
      original: articles.length,
      afterUrlDedup: urlDeduped.length,
      afterSemanticDedup: unique.length,
      unique,
      duplicates,
      duplicateGroups: duplicateGroups.map(group => 
        group.map(idx => ({
          index: idx,
          title: urlDeduped[idx].title,
          url: urlDeduped[idx].url || urlDeduped[idx].link
        }))
      )
    };
  }

  /**
   * 快速去重（仅URL + 标题）
   */
  quickDeduplicate(articles) {
    const seen = new Map();
    const unique = [];

    for (const article of articles) {
      const url = article.url || article.link;
      const title = (article.title || '').trim().toLowerCase();
      
      const key = url || title;
      
      if (!key || !seen.has(key)) {
        if (key) seen.set(key, true);
        unique.push(article);
      }
    }

    return {
      original: articles.length,
      unique: unique.length,
      articles: unique
    };
  }

  /**
   * 辅助：延迟函数
   */
  sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}

module.exports = DeduplicatorService;

/**
 * 批量 AI 编辑服务（使用 OpenRouter）
 */

class EditorService {
  constructor(openRouterApiKey) {
    this.apiKey = openRouterApiKey;
    this.baseUrl = 'https://openrouter.ai/api/v1/chat/completions';
    
    // 模型配置
    this.models = {
      fast: 'x-ai/grok-2-1212',              // Grok 2 快速模型
      quality: 'google/gemini-2.0-flash-exp:free'  // Gemini 2.5 Flash
    };
  }

  /**
   * 调用 OpenRouter API
   */
  async callLLM(prompt, options = {}) {
    const {
      model = this.models.fast,
      temperature = 0.7,
      maxTokens = 2000
    } = options;

    try {
      const response = await fetch(this.baseUrl, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.apiKey}`,
          'Content-Type': 'application/json',
          'HTTP-Referer': 'https://opencode-agent.workers.dev',
          'X-Title': 'OpenCode Agent'
        },
        body: JSON.stringify({
          model,
          messages: [
            {
              role: 'user',
              content: prompt
            }
          ],
          temperature,
          max_tokens: maxTokens
        })
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`OpenRouter API error: ${response.status} - ${errorText}`);
      }

      const data = await response.json();
      return data.choices[0].message.content;
    } catch (error) {
      console.error('LLM call error:', error);
      throw error;
    }
  }

  /**
   * 生成中文标题
   */
  async generateChineseTitle(article) {
    const prompt = `请为以下文章生成一个简洁、吸引人的中文标题（15-30字）。

原标题：${article.title || ''}
内容摘要：${(article.content || article.description || '').substring(0, 500)}

要求：
1. 准确概括文章主题
2. 使用简洁有力的语言
3. 不要使用标点符号
4. 只返回标题文本，不要其他内容

中文标题：`;

    const title = await this.callLLM(prompt, { model: this.models.fast, temperature: 0.7, maxTokens: 100 });
    return title.trim().replace(/^["']|["']$/g, ''); // 移除引号
  }

  /**
   * 生成中文摘要
   */
  async generateChineseSummary(article) {
    const content = article.content || article.description || '';
    const prompt = `请为以下文章生成一个约500字的中文摘要。

标题：${article.title || ''}
内容：${content.substring(0, 3000)}

要求：
1. 准确提炼文章核心观点和关键信息
2. 使用流畅的中文表达
3. 保持客观中立的语气
4. 约500字左右
5. 分段呈现，使用适当的段落结构

中文摘要：`;

    const summary = await this.callLLM(prompt, { model: this.models.quality, temperature: 0.5, maxTokens: 1000 });
    return summary.trim();
  }

  /**
   * 生成英文摘要
   */
  async generateEnglishSummary(article) {
    const content = article.content || article.description || '';
    const prompt = `Please generate a concise English summary (approximately 500 words) for the following article.

Title: ${article.title || ''}
Content: ${content.substring(0, 3000)}

Requirements:
1. Accurately extract core ideas and key information
2. Use clear and professional English
3. Maintain an objective and neutral tone
4. Approximately 500 words
5. Use appropriate paragraph structure

English Summary:`;

    const summary = await this.callLLM(prompt, { model: this.models.quality, temperature: 0.5, maxTokens: 1000 });
    return summary.trim();
  }

  /**
   * 生成中文标签
   */
  async generateChineseTags(article) {
    const content = article.content || article.description || '';
    const prompt = `请为以下文章生成3-5个中文标签。

标题：${article.title || ''}
内容：${content.substring(0, 1000)}

要求：
1. 标签应准确反映文章主题和关键概念
2. 使用2-4个字的简洁词汇
3. 优先选择技术术语和行业关键词
4. 只返回标签，用逗号分隔，不要其他内容

中文标签：`;

    const tagsText = await this.callLLM(prompt, { model: this.models.fast, temperature: 0.7, maxTokens: 100 });
    const tags = tagsText.split(/[,，、]/).map(t => t.trim()).filter(t => t.length > 0);
    return tags.slice(0, 5);
  }

  /**
   * 生成英文标签
   */
  async generateEnglishTags(article) {
    const content = article.content || article.description || '';
    const prompt = `Please generate 3-5 English tags for the following article.

Title: ${article.title || ''}
Content: ${content.substring(0, 1000)}

Requirements:
1. Tags should accurately reflect the article's theme and key concepts
2. Use concise 1-3 word phrases
3. Prioritize technical terms and industry keywords
4. Return only tags, separated by commas, no other content

English Tags:`;

    const tagsText = await this.callLLM(prompt, { model: this.models.fast, temperature: 0.7, maxTokens: 100 });
    const tags = tagsText.split(',').map(t => t.trim()).filter(t => t.length > 0);
    return tags.slice(0, 5);
  }

  /**
   * 完整编辑单篇文章
   */
  async editArticle(article, options = {}) {
    const { includeEnglish = true } = options;

    try {
      console.log(`Editing article: ${article.title || article.url}`);

      // 并行生成中文内容
      const [titleCn, summaryCn, tagsCn] = await Promise.all([
        this.generateChineseTitle(article),
        this.generateChineseSummary(article),
        this.generateChineseTags(article)
      ]);

      const result = {
        url: article.url || article.link,
        original_title: article.title,
        title_cn: titleCn,
        summary_cn: summaryCn,
        tags_cn: tagsCn,
        edited_date: new Date().toISOString()
      };

      // 如果需要英文内容
      if (includeEnglish) {
        const [summaryEn, tagsEn] = await Promise.all([
          this.generateEnglishSummary(article),
          this.generateEnglishTags(article)
        ]);
        
        result.summary_en = summaryEn;
        result.tags_en = tagsEn;
      }

      return {
        success: true,
        ...result
      };
    } catch (error) {
      console.error(`Failed to edit article ${article.title}:`, error);
      return {
        success: false,
        url: article.url || article.link,
        error: error.message
      };
    }
  }

  /**
   * 批量编辑文章
   */
  async batchEdit(articles, options = {}) {
    const {
      batchSize = 10,
      includeEnglish = true,
      parallel = 3  // 并发数
    } = options;

    console.log(`Starting batch edit for ${articles.length} articles...`);

    const results = [];
    
    // 分批处理
    for (let i = 0; i < articles.length; i += batchSize) {
      const batch = articles.slice(i, i + batchSize);
      console.log(`Processing batch ${Math.floor(i / batchSize) + 1}/${Math.ceil(articles.length / batchSize)}`);
      
      // 并发处理（限制并发数）
      const batchResults = [];
      for (let j = 0; j < batch.length; j += parallel) {
        const parallelBatch = batch.slice(j, j + parallel);
        const parallelResults = await Promise.all(
          parallelBatch.map(article => this.editArticle(article, { includeEnglish }))
        );
        batchResults.push(...parallelResults);
        
        // 避免频率限制
        if (j + parallel < batch.length) {
          await this.sleep(2000);
        }
      }
      
      results.push(...batchResults);
      
      // 批次间延迟
      if (i + batchSize < articles.length) {
        await this.sleep(3000);
      }
    }

    const successful = results.filter(r => r.success);
    const failed = results.filter(r => !r.success);

    console.log(`Batch edit completed: ${successful.length} success, ${failed.length} failed`);

    return {
      total: articles.length,
      successful: successful.length,
      failed: failed.length,
      results: successful,
      errors: failed
    };
  }

  /**
   * 辅助：延迟函数
   */
  sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}

module.exports = EditorService;

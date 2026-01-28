/**
 * 语义去重工具
 * 使用 Cloudflare Workers AI 生成 embedding 并计算余弦相似度
 */

import fs from 'fs/promises';

// 配置
const CF_ACCOUNT_ID = process.env.CF_ACCOUNT_ID;
const CF_API_KEY = process.env.CF_API_KEY;
const EMBEDDING_MODEL = '@cf/baai/bge-base-en-v1.5';
const SIMILARITY_THRESHOLD = 0.9;

/**
 * 生成文本的 embedding 向量
 */
async function generateEmbedding(text) {
  const response = await fetch(
    `https://api.cloudflare.com/client/v4/accounts/${CF_ACCOUNT_ID}/ai/run/${EMBEDDING_MODEL}`,
    {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${CF_API_KEY}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ 
        text: [text.substring(0, 512)]  // 限制长度
      })
    }
  );
  
  if (!response.ok) {
    throw new Error(`Embedding API error: ${response.statusText}`);
  }
  
  const result = await response.json();
  return result.result.data[0];  // 768维向量
}

/**
 * 计算余弦相似度
 */
function cosineSimilarity(vecA, vecB) {
  if (vecA.length !== vecB.length) {
    throw new Error('Vectors must have same length');
  }
  
  let dotProduct = 0;
  let magnitudeA = 0;
  let magnitudeB = 0;
  
  for (let i = 0; i < vecA.length; i++) {
    dotProduct += vecA[i] * vecB[i];
    magnitudeA += vecA[i] * vecA[i];
    magnitudeB += vecB[i] * vecB[i];
  }
  
  magnitudeA = Math.sqrt(magnitudeA);
  magnitudeB = Math.sqrt(magnitudeB);
  
  if (magnitudeA === 0 || magnitudeB === 0) {
    return 0;
  }
  
  return dotProduct / (magnitudeA * magnitudeB);
}

/**
 * 提取文章特征文本
 */
function extractFeatureText(article) {
  // 标题权重 0.4，内容前200字权重 0.6
  const title = article.title || '';
  const content = (article.content || '').substring(0, 500);
  return `${title}\n\n${content}`;
}

/**
 * 批量生成 embeddings
 */
async function batchGenerateEmbeddings(articles, batchSize = 10) {
  const embeddings = [];
  
  for (let i = 0; i < articles.length; i += batchSize) {
    const batch = articles.slice(i, i + batchSize);
    console.log(`Generating embeddings for batch ${i / batchSize + 1}/${Math.ceil(articles.length / batchSize)}...`);
    
    const batchEmbeddings = await Promise.all(
      batch.map(async (article) => {
        try {
          const featureText = extractFeatureText(article);
          const embedding = await generateEmbedding(featureText);
          return { article, embedding };
        } catch (error) {
          console.error(`Error generating embedding for ${article.url}:`, error.message);
          return { article, embedding: null };
        }
      })
    );
    
    embeddings.push(...batchEmbeddings);
    
    // 避免 API 限流
    if (i + batchSize < articles.length) {
      await new Promise(resolve => setTimeout(resolve, 1000));
    }
  }
  
  return embeddings;
}

/**
 * 查找重复文章
 */
function findDuplicates(embeddings, threshold = SIMILARITY_THRESHOLD) {
  const duplicateGroups = [];
  const processed = new Set();
  
  for (let i = 0; i < embeddings.length; i++) {
    if (processed.has(i) || !embeddings[i].embedding) continue;
    
    const group = {
      primary: embeddings[i].article,
      duplicates: []
    };
    
    for (let j = i + 1; j < embeddings.length; j++) {
      if (processed.has(j) || !embeddings[j].embedding) continue;
      
      const similarity = cosineSimilarity(
        embeddings[i].embedding,
        embeddings[j].embedding
      );
      
      if (similarity >= threshold) {
        group.duplicates.push({
          article: embeddings[j].article,
          similarity: similarity
        });
        processed.add(j);
      }
    }
    
    if (group.duplicates.length > 0) {
      duplicateGroups.push(group);
    }
  }
  
  return duplicateGroups;
}

/**
 * 选择最优版本
 */
function selectBestVersion(group) {
  const candidates = [group.primary, ...group.duplicates.map(d => d.article)];
  
  // 优先级排序
  candidates.sort((a, b) => {
    // 1. 来源优先级
    const sourcePriority = { telegram: 3, firecrawl: 2, rss: 1 };
    const priorityDiff = (sourcePriority[b.source] || 0) - (sourcePriority[a.source] || 0);
    if (priorityDiff !== 0) return priorityDiff;
    
    // 2. 发布时间（早的优先）
    const dateA = new Date(a.published_date || 0);
    const dateB = new Date(b.published_date || 0);
    if (dateA - dateB !== 0) return dateA - dateB;
    
    // 3. 内容长度（长的优先）
    const lengthDiff = (b.content?.length || 0) - (a.content?.length || 0);
    return lengthDiff;
  });
  
  return candidates[0];
}

/**
 * 执行去重
 */
async function deduplicate(inputFile, outputFile, reportFile) {
  console.log('Reading input file...');
  const rawData = await fs.readFile(inputFile, 'utf-8');
  const articles = JSON.parse(rawData);
  
  console.log(`Total articles: ${articles.length}`);
  
  // 生成 embeddings
  console.log('Generating embeddings...');
  const startTime = Date.now();
  const embeddings = await batchGenerateEmbeddings(articles);
  const embeddingTime = Date.now() - startTime;
  
  // 查找重复
  console.log('Finding duplicates...');
  const duplicateGroups = findDuplicates(embeddings, SIMILARITY_THRESHOLD);
  
  console.log(`Found ${duplicateGroups.length} duplicate groups`);
  
  // 选择最优版本
  const uniqueArticles = [];
  const processedUrls = new Set();
  
  // 添加非重复文章
  for (const { article } of embeddings) {
    const isDuplicate = duplicateGroups.some(group => 
      group.primary.url === article.url || 
      group.duplicates.some(d => d.article.url === article.url)
    );
    
    if (!isDuplicate && !processedUrls.has(article.url)) {
      uniqueArticles.push({
        ...article,
        dedup_info: {
          duplicates_found: 0,
          duplicate_urls: [],
          similarity_scores: [],
          reason: '无重复'
        }
      });
      processedUrls.add(article.url);
    }
  }
  
  // 添加去重后的最优版本
  for (const group of duplicateGroups) {
    const best = selectBestVersion(group);
    if (!processedUrls.has(best.url)) {
      uniqueArticles.push({
        ...best,
        dedup_info: {
          duplicates_found: group.duplicates.length,
          duplicate_urls: group.duplicates.map(d => d.article.url),
          similarity_scores: group.duplicates.map(d => d.similarity),
          reason: '保留最优版本'
        }
      });
      processedUrls.add(best.url);
    }
  }
  
  // 保存结果
  console.log('Saving results...');
  await fs.writeFile(outputFile, JSON.stringify(uniqueArticles, null, 2));
  
  // 生成报告
  const report = {
    timestamp: new Date().toISOString(),
    input_count: articles.length,
    output_count: uniqueArticles.length,
    duplicates_removed: articles.length - uniqueArticles.length,
    method: 'embedding',
    model: EMBEDDING_MODEL,
    threshold: SIMILARITY_THRESHOLD,
    duplicate_groups: duplicateGroups.map(group => ({
      primary_url: group.primary.url,
      primary_title: group.primary.title,
      duplicates: group.duplicates.map(d => ({
        url: d.article.url,
        title: d.article.title,
        similarity: d.similarity
      }))
    })),
    performance: {
      embedding_time_ms: embeddingTime,
      total_time_ms: Date.now() - startTime,
      avg_time_per_article_ms: Math.round(embeddingTime / articles.length)
    }
  };
  
  await fs.writeFile(reportFile, JSON.stringify(report, null, 2));
  
  console.log('\n=== Deduplication Report ===');
  console.log(`Input: ${articles.length} articles`);
  console.log(`Output: ${uniqueArticles.length} unique articles`);
  console.log(`Removed: ${articles.length - uniqueArticles.length} duplicates`);
  console.log(`Time: ${Math.round((Date.now() - startTime) / 1000)}s`);
  console.log(`\nResults saved to: ${outputFile}`);
  console.log(`Report saved to: ${reportFile}`);
}

// 命令行执行
if (import.meta.url === `file://${process.argv[1]}`) {
  const inputFile = process.argv[2] || 'data/raw_pool.json';
  const outputFile = process.argv[3] || 'data/unique_pool.json';
  const reportFile = process.argv[4] || 'data/dedup_report.json';
  
  deduplicate(inputFile, outputFile, reportFile).catch(error => {
    console.error('Error:', error);
    process.exit(1);
  });
}

export { deduplicate, generateEmbedding, cosineSimilarity };

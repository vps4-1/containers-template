/**
 * RSS/Telegram 数据收集服务
 */

class RSSService {
  constructor() {
    this.parser = null; // 使用原生fetch + 简单解析
  }

  /**
   * 获取RSS feed
   */
  async fetchFeed(feedUrl) {
    try {
      const response = await fetch(feedUrl, {
        headers: {
          'User-Agent': 'OpenCode-Agent/1.0'
        }
      });

      if (!response.ok) {
        throw new Error(`RSS fetch error: ${response.status}`);
      }

      const xmlText = await response.text();
      const items = this.parseRSS(xmlText);
      
      return {
        success: true,
        feedUrl,
        items,
        count: items.length
      };
    } catch (error) {
      console.error(`RSS fetch error for ${feedUrl}:`, error);
      return {
        success: false,
        feedUrl,
        error: error.message
      };
    }
  }

  /**
   * 简单的RSS解析（支持RSS 2.0和Atom）
   */
  parseRSS(xmlText) {
    const items = [];
    
    try {
      // 提取所有 <item> 或 <entry> 标签
      const itemRegex = /<(?:item|entry)>([\s\S]*?)<\/(?:item|entry)>/gi;
      const matches = xmlText.matchAll(itemRegex);
      
      for (const match of matches) {
        const itemXml = match[1];
        
        const item = {
          title: this.extractTag(itemXml, 'title'),
          link: this.extractTag(itemXml, 'link'),
          description: this.extractTag(itemXml, 'description') || this.extractTag(itemXml, 'summary'),
          content: this.extractTag(itemXml, 'content:encoded') || this.extractTag(itemXml, 'content'),
          pubDate: this.extractTag(itemXml, 'pubDate') || this.extractTag(itemXml, 'published') || this.extractTag(itemXml, 'updated'),
          author: this.extractTag(itemXml, 'author') || this.extractTag(itemXml, 'dc:creator'),
          guid: this.extractTag(itemXml, 'guid') || this.extractTag(itemXml, 'id')
        };
        
        // 清理HTML标签
        item.description = this.stripHtml(item.description);
        item.content = this.stripHtml(item.content);
        
        items.push(item);
      }
    } catch (error) {
      console.error('RSS parse error:', error);
    }
    
    return items;
  }

  /**
   * 提取XML标签内容
   */
  extractTag(xml, tagName) {
    const regex = new RegExp(`<${tagName}[^>]*>([\\s\\S]*?)<\\/${tagName}>`, 'i');
    const match = xml.match(regex);
    return match ? match[1].trim() : '';
  }

  /**
   * 移除HTML标签
   */
  stripHtml(html) {
    if (!html) return '';
    return html
      .replace(/<[^>]*>/g, '')
      .replace(/&nbsp;/g, ' ')
      .replace(/&amp;/g, '&')
      .replace(/&lt;/g, '<')
      .replace(/&gt;/g, '>')
      .replace(/&quot;/g, '"')
      .trim();
  }

  /**
   * 批量获取多个RSS feeds
   */
  async fetchFeeds(feedUrls) {
    const results = await Promise.all(
      feedUrls.map(url => this.fetchFeed(url))
    );
    
    return results;
  }

  /**
   * 过滤最近的文章
   */
  filterRecentItems(items, hoursAgo = 24) {
    const cutoffTime = Date.now() - (hoursAgo * 60 * 60 * 1000);
    
    return items.filter(item => {
      if (!item.pubDate) return true; // 没有日期的保留
      
      try {
        const pubTime = new Date(item.pubDate).getTime();
        return pubTime >= cutoffTime;
      } catch {
        return true;
      }
    });
  }
}

/**
 * Telegram 数据收集服务
 */
class TelegramService {
  constructor(botToken) {
    this.botToken = botToken;
    this.baseUrl = `https://api.telegram.org/bot${botToken}`;
  }

  /**
   * 获取频道/群组消息
   */
  async getChannelMessages(channelId, options = {}) {
    const { limit = 100, offset = 0 } = options;
    
    try {
      const response = await fetch(`${this.baseUrl}/getUpdates`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          offset,
          limit,
          allowed_updates: ['channel_post', 'message']
        })
      });

      if (!response.ok) {
        throw new Error(`Telegram API error: ${response.status}`);
      }

      const data = await response.json();
      
      if (!data.ok) {
        throw new Error(`Telegram API error: ${data.description}`);
      }

      const messages = data.result
        .filter(update => update.channel_post || update.message)
        .map(update => {
          const msg = update.channel_post || update.message;
          return {
            messageId: msg.message_id,
            text: msg.text || msg.caption || '',
            date: new Date(msg.date * 1000).toISOString(),
            chatId: msg.chat.id,
            chatTitle: msg.chat.title,
            entities: msg.entities || [],
            links: this.extractLinks(msg)
          };
        });

      return {
        success: true,
        channelId,
        messages,
        count: messages.length
      };
    } catch (error) {
      console.error(`Telegram fetch error for ${channelId}:`, error);
      return {
        success: false,
        channelId,
        error: error.message
      };
    }
  }

  /**
   * 提取消息中的链接
   */
  extractLinks(message) {
    const links = [];
    
    // 从entities中提取URL
    if (message.entities) {
      message.entities.forEach(entity => {
        if (entity.type === 'url' && message.text) {
          const url = message.text.substring(entity.offset, entity.offset + entity.length);
          links.push(url);
        }
        if (entity.type === 'text_link') {
          links.push(entity.url);
        }
      });
    }
    
    // 正则提取URL
    const urlRegex = /https?:\/\/[^\s]+/g;
    const text = message.text || message.caption || '';
    const matches = text.match(urlRegex);
    if (matches) {
      links.push(...matches);
    }
    
    return [...new Set(links)]; // 去重
  }

  /**
   * 过滤包含关键词的消息
   */
  filterByKeywords(messages, keywords) {
    return messages.filter(msg => {
      const text = msg.text.toLowerCase();
      return keywords.some(keyword => text.includes(keyword.toLowerCase()));
    });
  }
}

module.exports = { RSSService, TelegramService };

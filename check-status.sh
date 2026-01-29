#!/bin/bash

# 项目状态检查脚本
# 用于验证所有配置和数据源是否正确设置

set -e

echo "=========================================="
echo "OpenCode Agent 项目状态检查"
echo "=========================================="
echo ""

# 颜色定义
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# 检查函数
check_file() {
    if [ -f "$1" ]; then
        echo -e "${GREEN}✓${NC} $1 存在"
        return 0
    else
        echo -e "${RED}✗${NC} $1 不存在"
        return 1
    fi
}

check_json() {
    if [ -f "$1" ]; then
        if node -e "JSON.parse(require('fs').readFileSync('$1', 'utf8'))" 2>/dev/null; then
            echo -e "${GREEN}✓${NC} $1 JSON 格式正确"
            return 0
        else
            echo -e "${RED}✗${NC} $1 JSON 格式错误"
            return 1
        fi
    else
        echo -e "${RED}✗${NC} $1 不存在"
        return 1
    fi
}

echo "1. 检查项目文件结构..."
echo "-----------------------------------"
check_file "package.json"
check_file "wrangler.jsonc"
check_file "Dockerfile"
check_file "src/index.ts"
check_file "container_src/server.js"
check_file "container_src/package.json"
echo ""

echo "2. 检查数据源配置文件..."
echo "-----------------------------------"
check_json "container_src/data/rss_feeds.json"
check_json "container_src/data/no_rss_sites.json"
check_file "container_src/data/sites.txt"
echo ""

echo "3. 检查服务文件..."
echo "-----------------------------------"
check_file "container_src/services/firecrawl.js"
check_file "container_src/services/rss.js"
check_file "container_src/services/deduplicator.js"
check_file "container_src/services/editor.js"
check_file "container_src/services/hybrid_scraper.js"
echo ""

echo "4. 统计数据源数量..."
echo "-----------------------------------"
RSS_COUNT=$(node -e "console.log(JSON.parse(require('fs').readFileSync('container_src/data/rss_feeds.json', 'utf8')).length)")
NO_RSS_COUNT=$(node -e "console.log(JSON.parse(require('fs').readFileSync('container_src/data/no_rss_sites.json', 'utf8')).length)")
TOTAL=$((RSS_COUNT + NO_RSS_COUNT))

echo -e "RSS 数据源: ${GREEN}${RSS_COUNT}${NC} 个"
echo -e "无 RSS 数据源: ${GREEN}${NO_RSS_COUNT}${NC} 个"
echo -e "总计数据源: ${GREEN}${TOTAL}${NC} 个"
echo ""

echo "5. 检查环境变量配置..."
echo "-----------------------------------"
if [ -f ".dev.vars" ]; then
    echo -e "${GREEN}✓${NC} .dev.vars 存在（本地开发）"
    
    # 检查关键环境变量
    if grep -q "FIRECRAWL_API_KEY=" .dev.vars; then
        if grep -q "FIRECRAWL_API_KEY=fc-" .dev.vars; then
            echo -e "${GREEN}✓${NC} FIRECRAWL_API_KEY 已配置"
        else
            echo -e "${YELLOW}⚠${NC} FIRECRAWL_API_KEY 未配置"
        fi
    fi
    
    if grep -q "OPENROUTER_API_KEY=" .dev.vars; then
        if grep -q "OPENROUTER_API_KEY=sk-" .dev.vars; then
            echo -e "${GREEN}✓${NC} OPENROUTER_API_KEY 已配置"
        else
            echo -e "${YELLOW}⚠${NC} OPENROUTER_API_KEY 未配置"
        fi
    fi
    
    if grep -q "CF_API_KEY=" .dev.vars; then
        if grep -q "CF_API_KEY=Fs" .dev.vars; then
            echo -e "${GREEN}✓${NC} CF_API_KEY 已配置"
        else
            echo -e "${YELLOW}⚠${NC} CF_API_KEY 未配置"
        fi
    fi
else
    echo -e "${YELLOW}⚠${NC} .dev.vars 不存在（生产环境需在 Cloudflare Dashboard 配置）"
fi

if [ -f ".env.example" ]; then
    echo -e "${GREEN}✓${NC} .env.example 存在（配置模板）"
fi
echo ""

echo "6. 检查 Node 依赖..."
echo "-----------------------------------"
if [ -d "node_modules" ]; then
    echo -e "${GREEN}✓${NC} Worker 依赖已安装"
else
    echo -e "${RED}✗${NC} Worker 依赖未安装，运行: npm install"
fi
echo ""

echo "7. 列出 RSS 数据源..."
echo "-----------------------------------"
node -e "
const feeds = JSON.parse(require('fs').readFileSync('container_src/data/rss_feeds.json', 'utf8'));
feeds.forEach((feed, i) => {
  console.log(\`\${i+1}. \${feed.name} (\${feed.priority})\`);
});
"
echo ""

echo "8. 列出无 RSS 数据源..."
echo "-----------------------------------"
node -e "
const sites = JSON.parse(require('fs').readFileSync('container_src/data/no_rss_sites.json', 'utf8'));
sites.forEach((site, i) => {
  console.log(\`\${i+1}. \${site.name} (\${site.priority})\`);
});
"
echo ""

echo "=========================================="
echo "检查完成！"
echo "=========================================="
echo ""

# 提示下一步操作
echo "下一步操作："
echo "1. 本地开发: npm run dev"
echo "2. 部署到 Cloudflare: npm run deploy"
echo "3. 查看文档: cat DATA_SOURCES.md"
echo "4. 访问监控面板: https://your-worker.workers.dev/monitor"
echo ""

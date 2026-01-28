#!/bin/bash

# OpenCode Agent - 一键部署到 Cloudflare Container
# 使用方法：bash deploy-now.sh

set -e

echo "🚀 OpenCode Agent - 一键部署脚本"
echo "================================"
echo ""

# 配置变量
CF_API_TOKEN="PrgZdy2ArHHfeeya7IpojTERWXMmVY5D3ntlc4bR"
CF_ACCOUNT_ID="e02472b1ddaf02be3ae518747eac5e83"
FIRECRAWL_API_KEY="fc-15be214b2bda4d328eeda6b67eed2d45"
OPENROUTER_API_KEY="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"
CF_API_KEY="Fs0z_WEUr9nXqVvJX2k6NyFDRxNvUI0PQpHjcvuu"

export CLOUDFLARE_API_TOKEN="$CF_API_TOKEN"
export CLOUDFLARE_ACCOUNT_ID="$CF_ACCOUNT_ID"

echo "✓ 环境变量已配置"
echo ""

# 检查依赖
echo "📦 检查依赖..."
if ! command -v node &> /dev/null; then
    echo "❌ 错误: 未安装 Node.js"
    echo "请访问 https://nodejs.org/ 安装 Node.js"
    exit 1
fi

if ! command -v docker &> /dev/null; then
    echo "❌ 错误: 未安装 Docker"
    echo "请访问 https://www.docker.com/get-started 安装 Docker"
    exit 1
fi

echo "✓ Node.js 和 Docker 已安装"
echo ""

# 安装依赖
echo "📦 安装项目依赖..."
npm install
echo "✓ 依赖安装完成"
echo ""

# 安装 wrangler
echo "📦 安装 Wrangler CLI..."
npm install -g wrangler
echo "✓ Wrangler 安装完成"
echo ""

# 部署到 Cloudflare
echo "🚀 开始部署到 Cloudflare Container..."
wrangler deploy

echo ""
echo "🔐 配置 Container 环境变量..."

# 设置 secrets
echo "$FIRECRAWL_API_KEY" | wrangler secret put FIRECRAWL_API_KEY || echo "⚠️  FIRECRAWL_API_KEY 设置失败（可能已存在）"
echo "$OPENROUTER_API_KEY" | wrangler secret put OPENROUTER_API_KEY || echo "⚠️  OPENROUTER_API_KEY 设置失败（可能已存在）"
echo "$CF_API_KEY" | wrangler secret put CF_API_KEY || echo "⚠️  CF_API_KEY 设置失败（可能已存在）"

echo ""
echo "✅ 部署完成！"
echo ""
echo "🌐 你的服务已上线："
echo "   主 URL: https://opencode-agent.chengqiangshang.workers.dev"
echo "   健康检查: https://opencode-agent.chengqiangshang.workers.dev/health"
echo ""
echo "📊 测试命令："
echo "   curl https://opencode-agent.chengqiangshang.workers.dev/health"
echo ""
echo "🎉 部署成功！"

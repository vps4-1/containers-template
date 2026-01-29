import { Container, getContainer } from "@cloudflare/containers";
import { Hono } from "hono";

export class OpenCodeAgentContainer extends Container<Env> {
	// Container 监听端口
	defaultPort = 3000;
	// 10分钟无活动后休眠
	sleepAfter = "10m";
	// 环境变量
	envVars = {
		NODE_ENV: "production",
		FIRECRAWL_API_KEY: process.env.FIRECRAWL_API_KEY || "",
		OPENROUTER_API_KEY: process.env.OPENROUTER_API_KEY || "",
		CF_API_KEY: process.env.CF_API_KEY || "",
		CF_ACCOUNT_ID: process.env.CF_ACCOUNT_ID || "",
		TELEGRAM_BOT_TOKEN: process.env.TELEGRAM_BOT_TOKEN || "",
		RSS_BRIDGE_URL: process.env.RSS_BRIDGE_URL || "",
		SELF_HOSTED_FIRECRAWL_URL: process.env.SELF_HOSTED_FIRECRAWL_URL || "",
	};

	// 生命周期钩子
	override onStart() {
		console.log("[OpenCode Agent] Container started successfully");
		console.log("[OpenCode Agent] Environment check:");
		console.log(`  - FIRECRAWL_API_KEY: ${this.envVars.FIRECRAWL_API_KEY ? "✓ configured" : "✗ missing"}`);
		console.log(`  - OPENROUTER_API_KEY: ${this.envVars.OPENROUTER_API_KEY ? "✓ configured" : "✗ missing"}`);
		console.log(`  - CF_API_KEY: ${this.envVars.CF_API_KEY ? "✓ configured" : "✗ missing"}`);
	}

	override onStop() {
		console.log("[OpenCode Agent] Container stopped");
	}

	override onError(error: unknown) {
		console.error("[OpenCode Agent] Container error:", error);
	}
}

// 创建 Hono 应用
const app = new Hono<{
	Bindings: Env;
}>();

// 根路径
app.get("/", (c) => {
	return c.json({
		service: "OpenCode Agent",
		version: "1.0.0",
		status: "online",
		endpoints: {
			health: "/health",
			monitor: "/monitor",
			collect: "POST /api/collect",
			deduplicate: "POST /api/deduplicate",
			edit: "POST /api/edit",
			pipeline: "POST /api/pipeline",
		},
	});
});

// 健康检查（Worker 层级）
app.get("/health", (c) => {
	return c.json({
		status: "healthy",
		service: "opencode-agent-worker",
		timestamp: new Date().toISOString(),
		container: true,
		level: "worker",
	});
});

// 监控面板页面
app.get("/monitor", (c) => {
	const html = `<!DOCTYPE html>
<html lang="zh-CN">
<head>
	<meta charset="UTF-8">
	<meta name="viewport" content="width=device-width, initial-scale=1.0">
	<title>OpenCode Agent 监控面板</title>
	<style>
		* {
			margin: 0;
			padding: 0;
			box-sizing: border-box;
		}
		
		body {
			font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
			background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
			min-height: 100vh;
			padding: 20px;
		}
		
		.container {
			max-width: 1200px;
			margin: 0 auto;
		}
		
		.header {
			text-align: center;
			color: white;
			margin-bottom: 40px;
		}
		
		.header h1 {
			font-size: 2.5em;
			margin-bottom: 10px;
		}
		
		.header p {
			font-size: 1.1em;
			opacity: 0.9;
		}
		
		.grid {
			display: grid;
			grid-template-columns: repeat(auto-fit, minmax(350px, 1fr));
			gap: 20px;
			margin-bottom: 30px;
		}
		
		.card {
			background: white;
			border-radius: 12px;
			padding: 25px;
			box-shadow: 0 10px 30px rgba(0, 0, 0, 0.2);
			transition: transform 0.3s ease, box-shadow 0.3s ease;
		}
		
		.card:hover {
			transform: translateY(-5px);
			box-shadow: 0 15px 40px rgba(0, 0, 0, 0.3);
		}
		
		.card h2 {
			font-size: 1.3em;
			margin-bottom: 15px;
			color: #333;
			display: flex;
			align-items: center;
			gap: 10px;
		}
		
		.status-badge {
			display: inline-block;
			width: 12px;
			height: 12px;
			border-radius: 50%;
			animation: pulse 2s infinite;
		}
		
		.status-badge.online {
			background: #10b981;
		}
		
		.status-badge.offline {
			background: #ef4444;
		}
		
		.status-badge.loading {
			background: #f59e0b;
		}
		
		@keyframes pulse {
			0%, 100% { opacity: 1; }
			50% { opacity: 0.5; }
		}
		
		.info-row {
			display: flex;
			justify-content: space-between;
			padding: 10px 0;
			border-bottom: 1px solid #e5e7eb;
			font-size: 0.95em;
		}
		
		.info-row:last-child {
			border-bottom: none;
		}
		
		.info-label {
			color: #666;
			font-weight: 500;
		}
		
		.info-value {
			color: #333;
			font-weight: 600;
			word-break: break-all;
		}
		
		.status-ok {
			color: #10b981;
		}
		
		.status-error {
			color: #ef4444;
		}
		
		.status-warning {
			color: #f59e0b;
		}
		
		.button-group {
			display: flex;
			gap: 10px;
			margin-top: 20px;
			flex-wrap: wrap;
		}
		
		button {
			flex: 1;
			min-width: 120px;
			padding: 10px 15px;
			border: none;
			border-radius: 6px;
			font-size: 0.9em;
			font-weight: 600;
			cursor: pointer;
			transition: all 0.3s ease;
		}
		
		.btn-primary {
			background: #667eea;
			color: white;
		}
		
		.btn-primary:hover {
			background: #5568d3;
		}
		
		.btn-secondary {
			background: #e5e7eb;
			color: #333;
		}
		
		.btn-secondary:hover {
			background: #d1d5db;
		}
		
		.btn-danger {
			background: #ef4444;
			color: white;
		}
		
		.btn-danger:hover {
			background: #dc2626;
		}
		
		.log-container {
			background: #1f2937;
			color: #10b981;
			padding: 15px;
			border-radius: 6px;
			font-family: 'Courier New', monospace;
			font-size: 0.85em;
			max-height: 300px;
			overflow-y: auto;
			margin-top: 15px;
		}
		
		.log-line {
			margin: 5px 0;
			line-height: 1.4;
		}
		
		.log-error {
			color: #f87171;
		}
		
		.log-warning {
			color: #fbbf24;
		}
		
		.log-success {
			color: #34d399;
		}
		
		.spinner {
			display: inline-block;
			width: 12px;
			height: 12px;
			border: 2px solid #e5e7eb;
			border-top-color: #667eea;
			border-radius: 50%;
			animation: spin 0.6s linear infinite;
		}
		
		@keyframes spin {
			to { transform: rotate(360deg); }
		}
		
		.footer {
			text-align: center;
			color: white;
			margin-top: 40px;
			opacity: 0.8;
		}
	</style>
</head>
<body>
	<div class="container">
		<div class="header">
			<h1>🚀 OpenCode Agent 监控面板</h1>
			<p>实时监控前后端服务状态</p>
		</div>
		
		<div class="grid">
			<!-- Worker 状态卡片 -->
			<div class="card">
				<h2>
					<span class="status-badge online"></span>
					Worker 状态
				</h2>
				<div class="info-row">
					<span class="info-label">服务名称</span>
					<span class="info-value">OpenCode Agent Worker</span>
				</div>
				<div class="info-row">
					<span class="info-label">状态</span>
					<span class="info-value status-ok">✓ 在线</span>
				</div>
				<div class="info-row">
					<span class="info-label">版本</span>
					<span class="info-value">1.0.0</span>
				</div>
				<div class="info-row">
					<span class="info-label">时间戳</span>
					<span class="info-value" id="worker-time">加载中...</span>
				</div>
				<div class="button-group">
					<button class="btn-primary" onclick="testWorkerHealth()">测试 Worker</button>
					<button class="btn-secondary" onclick="refreshWorkerStatus()">刷新</button>
				</div>
			</div>
			
			<!-- Container 状态卡片 -->
			<div class="card">
				<h2>
					<span class="status-badge" id="container-badge"></span>
					Container 状态
				</h2>
				<div class="info-row">
					<span class="info-label">服务名称</span>
					<span class="info-value">OpenCode Agent Container</span>
				</div>
				<div class="info-row">
					<span class="info-label">状态</span>
					<span class="info-value" id="container-status">检查中...</span>
				</div>
				<div class="info-row">
					<span class="info-label">实例 ID</span>
					<span class="info-value" id="container-id">未获取</span>
				</div>
				<div class="info-row">
					<span class="info-label">时间戳</span>
					<span class="info-value" id="container-time">加载中...</span>
				</div>
				<div class="button-group">
					<button class="btn-primary" onclick="testContainerHealth()">测试 Container</button>
					<button class="btn-secondary" onclick="refreshContainerStatus()">刷新</button>
				</div>
			</div>
			
			<!-- 环境变量检查 -->
			<div class="card">
				<h2>🔑 环境变量检查</h2>
				<div id="env-check">检查中...</div>
				<div class="button-group">
					<button class="btn-primary" onclick="checkEnvironment()">重新检查</button>
				</div>
			</div>
			
			<!-- 混合抓取与前置过滤统计 -->
			<div class="card">
				<h2>🛡️ 前置过滤统计 (降本)</h2>
				<div class="info-row">
					<span class="info-label">总尝试次数</span>
					<span class="info-value" id="stats-total">0</span>
				</div>
				<div class="info-row">
					<span class="info-label">URL 规则拦截</span>
					<span class="info-value status-warning" id="stats-url">0</span>
				</div>
				<div class="info-row">
					<span class="info-label">元数据预检拦截</span>
					<span class="info-value status-warning" id="stats-metadata">0</span>
				</div>
				<div class="info-row">
					<span class="info-label">总节省 (拦截数)</span>
					<span class="info-value status-ok" id="stats-saved">0</span>
				</div>
				<div class="info-row">
					<span class="info-label">通过率</span>
					<span class="info-value" id="stats-rate">0%</span>
				</div>
				<div class="button-group">
					<button class="btn-primary" onclick="refreshStats()">刷新统计</button>
				</div>
			</div>
			
			<!-- API 端点测试 -->
			<div class="card">
				<h2>📡 API 端点测试</h2>
				<div class="info-row">
					<span class="info-label">/api/health</span>
					<span class="info-value" id="api-health">未测试</span>
				</div>
				<div class="info-row">
					<span class="info-label">/api/pipeline</span>
					<span class="info-value" id="api-pipeline">未测试</span>
				</div>
				<div class="button-group">
					<button class="btn-primary" onclick="testAllAPIs()">测试所有 API</button>
				</div>
			</div>
			
			<!-- 日志输出 -->
			<div class="card" style="grid-column: 1 / -1;">
				<h2>📋 实时日志</h2>
				<div class="log-container" id="log-container">
					<div class="log-line log-success">[INFO] 监控面板已加载</div>
					<div class="log-line log-success">[INFO] 等待用户操作...</div>
				</div>
				<div class="button-group">
					<button class="btn-secondary" onclick="clearLogs()">清空日志</button>
				</div>
			</div>
		</div>
		
		<div class="footer">
			<p>OpenCode Agent 监控面板 v1.0 | 最后更新: <span id="update-time">加载中...</span></p>
		</div>
	</div>
	
	<script>
		const logContainer = document.getElementById('log-container');
		
		function addLog(message, type = 'info') {
			const line = document.createElement('div');
			line.className = \`log-line log-\${type}\`;
			const timestamp = new Date().toLocaleTimeString('zh-CN');
			line.textContent = \`[\${timestamp}] [\${type.toUpperCase()}] \${message}\`;
			logContainer.appendChild(line);
			logContainer.scrollTop = logContainer.scrollHeight;
		}
		
		function clearLogs() {
			logContainer.innerHTML = '<div class="log-line log-success">[INFO] 日志已清空</div>';
		}
		
		async function testWorkerHealth() {
			addLog('测试 Worker 健康状态...', 'info');
			try {
				const response = await fetch('/health');
				const data = await response.json();
				document.getElementById('worker-time').textContent = data.timestamp;
				addLog('Worker 健康检查通过 ✓', 'success');
			} catch (error) {
				addLog(\`Worker 健康检查失败: \${error.message}\`, 'error');
			}
		}
		
		async function testContainerHealth() {
			addLog('测试 Container 健康状态...', 'info');
			document.getElementById('container-badge').className = 'status-badge loading';
			try {
				const response = await fetch('/singleton/api/health');
				const data = await response.json();
				document.getElementById('container-status').innerHTML = '<span class="status-ok">✓ 在线</span>';
				document.getElementById('container-id').textContent = data.instanceId || '已获取';
				document.getElementById('container-time').textContent = data.timestamp;
				document.getElementById('container-badge').className = 'status-badge online';
				addLog('Container 健康检查通过 ✓', 'success');
			} catch (error) {
				document.getElementById('container-status').innerHTML = '<span class="status-error">✗ 离线</span>';
				document.getElementById('container-badge').className = 'status-badge offline';
				addLog(\`Container 健康检查失败: \${error.message}\`, 'error');
			}
		}
		
		async function checkEnvironment() {
			addLog('检查环境变量...', 'info');
			try {
				const response = await fetch('/api/env-check');
				const data = await response.json();
				let html = '';
				for (const [key, status] of Object.entries(data)) {
					const statusClass = status ? 'status-ok' : 'status-error';
					const statusText = status ? '✓ 已配置' : '✗ 缺失';
					html += \`<div class="info-row"><span class="info-label">\${key}</span><span class="info-value \${statusClass}">\${statusText}</span></div>\`;
				}
				document.getElementById('env-check').innerHTML = html;
				addLog('环境变量检查完成', 'success');
			} catch (error) {
				addLog(\`环境变量检查失败: \${error.message}\`, 'error');
			}
		}
		
		async function testAllAPIs() {
			addLog('测试所有 API 端点...', 'info');
			
			// 测试 /api/health
			try {
				const response = await fetch('/api/health');
				const status = response.ok ? '<span class="status-ok">✓ 正常</span>' : '<span class="status-error">✗ 异常</span>';
				document.getElementById('api-health').innerHTML = status;
				addLog(\`/api/health: \${response.status}\`, response.ok ? 'success' : 'error');
			} catch (error) {
				document.getElementById('api-health').innerHTML = '<span class="status-error">✗ 错误</span>';
				addLog(\`/api/health 测试失败: \${error.message}\`, 'error');
			}
		}
		
		async function refreshStats() {
			addLog('正在获取抓取统计数据...', 'info');
			try {
				// 通过调用一个轻量级的 collect 接口来获取统计
				const response = await fetch('/api/collect', {
					method: 'POST',
					headers: { 'Content-Type': 'application/json' },
					body: JSON.stringify({ sources: [], type: 'auto' })
				});
				const data = await response.json();
				if (data.stats && data.stats.preCheckStats) {
					const s = data.stats.preCheckStats;
					document.getElementById('stats-total').textContent = s.totalAttempts;
					document.getElementById('stats-url').textContent = s.filteredByUrl;
					document.getElementById('stats-metadata').textContent = s.filteredByMetadata;
					document.getElementById('stats-saved').textContent = s.totalFiltered;
					document.getElementById('stats-rate').textContent = s.passedRate;
					addLog(\`统计数据已更新，已为您节省 \${s.totalFiltered} 次无效抓取\`, 'success');
				}
			} catch (error) {
				addLog(\`获取统计失败: \${error.message}\`, 'error');
			}
		}
		
		function refreshWorkerStatus() {
			addLog('刷新 Worker 状态...', 'info');
			testWorkerHealth();
		}
		
		function refreshContainerStatus() {
			addLog('刷新 Container 状态...', 'info');
			testContainerHealth();
		}
		
		// 页面加载时执行初始检查
		window.addEventListener('load', () => {
			document.getElementById('update-time').textContent = new Date().toLocaleString('zh-CN');
			testWorkerHealth();
			testContainerHealth();
			checkEnvironment();
		});
	</script>
</body>
</html>`;
	return c.html(html);
});

// 环境变量检查端点
app.get("/api/env-check", (c) => {
	return c.json({
		FIRECRAWL_API_KEY: !!process.env.FIRECRAWL_API_KEY,
		OPENROUTER_API_KEY: !!process.env.OPENROUTER_API_KEY,
		CF_API_KEY: !!process.env.CF_API_KEY,
		CF_ACCOUNT_ID: !!process.env.CF_ACCOUNT_ID,
		TELEGRAM_BOT_TOKEN: !!process.env.TELEGRAM_BOT_TOKEN,
		RSS_BRIDGE_URL: !!process.env.RSS_BRIDGE_URL,
		SELF_HOSTED_FIRECRAWL_URL: !!process.env.SELF_HOSTED_FIRECRAWL_URL,
	});
});

// 所有 API 请求路由到 Container
app.all("/api/*", async (c) => {
	try {
		console.log(`[Router] Forwarding ${c.req.method} ${c.req.path} to container`);
		
		// 使用单例模式获取 Container 实例
		const container = getContainer(c.env.OPENCODE_AGENT);
		
		// 转发请求到 Container，保留完整路径
		const response = await container.fetch(c.req.raw);
		
		console.log(`[Router] Container responded with status ${response.status}`);
		return response;
	} catch (error) {
		console.error("[Router] Error routing to container:", error);
		
		return c.json({
			error: "Container routing error",
			message: error instanceof Error ? error.message : "Unknown error",
			timestamp: new Date().toISOString(),
			hint: "请检查 Container 是否已启动，以及环境变量是否正确配置",
		}, 500);
	}
});

// 404 处理
app.notFound((c) => {
	return c.json({
		error: "Not Found",
		path: c.req.path,
		availableEndpoints: ["/", "/health", "/monitor", "/api/*"],
	}, 404);
});

// 错误处理
app.onError((err, c) => {
	console.error("[Worker] Unhandled error:", err);
	return c.json({
		error: "Internal Server Error",
		message: err.message,
		timestamp: new Date().toISOString(),
	}, 500);
});

export default app;

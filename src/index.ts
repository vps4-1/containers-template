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
	};

	// 生命周期钩子
	override onStart() {
		console.log("[OpenCode Agent] Container started successfully");
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
		endpoints: {
			health: "/health",
			collect: "POST /api/collect",
			deduplicate: "POST /api/deduplicate",
			edit: "POST /api/edit",
		},
	});
});

// 健康检查
app.get("/health", (c) => {
	return c.json({
		status: "healthy",
		service: "opencode-agent",
		timestamp: new Date().toISOString(),
		container: true,
	});
});

// 所有 API 请求路由到 Container
app.all("/api/*", async (c) => {
	try {
		// 使用单例模式获取 Container 实例
		const container = getContainer(c.env.OPENCODE_AGENT);
		
		// 转发请求到 Container
		return await container.fetch(c.req.raw);
	} catch (error) {
		console.error("[OpenCode Agent] Error routing to container:", error);
		
		return c.json({
			error: "Container error",
			message: error instanceof Error ? error.message : "Unknown error",
			timestamp: new Date().toISOString(),
		}, 500);
	}
});

// 404 处理
app.notFound((c) => {
	return c.json({
		error: "Not Found",
		path: c.req.path,
	}, 404);
});

// 错误处理
app.onError((err, c) => {
	console.error("[OpenCode Agent] Worker error:", err);
	return c.json({
		error: "Internal Server Error",
		message: err.message,
	}, 500);
});

export default app;

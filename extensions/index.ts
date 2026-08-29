/** Agent Plugins 1.0.0 client extension for Pi. */

import type { ExtensionAPI } from "@earendil-works/pi-coding-agent";
import { Text } from "@earendil-works/pi-tui";

import { registerPluginCommand } from "../src/plugin-command.ts";
import { PluginRuntime } from "../src/runtime.ts";

export default function agentPlugins(pi: ExtensionAPI): void {
	const runtime = new PluginRuntime();

	// Factory-time user sync lands before pi-mcp-adapter's session initialization.
	// A malformed plugin must never prevent Pi itself from starting.
	try {
		runtime.initializeUser();
	} catch {
		// session_start rescans and reports diagnostics with UI context.
	}

	pi.on("resources_discover", (event, ctx) => {
		console.error("[Agent Plugins] resources_discover fired, hasUI=", ctx.hasUI);
		if (ctx.hasUI) {
			ctx.ui.setWorkingVisible(true);
			ctx.ui.setWorkingMessage("Loading Agent Plugins...");
			console.error("[Agent Plugins] setWorkingMessage called");
		}
		try {
			runtime.discoverResources(event.cwd);
		} finally {
			if (ctx.hasUI) ctx.ui.setWorkingMessage();
			console.error("[Agent Plugins] resources_discover complete");
		}
	});

	pi.on("session_start", async (_event, ctx) => {
		console.error("[Agent Plugins] session_start fired, hasUI=", ctx.hasUI);
		if (ctx.hasUI) {
			ctx.ui.setWorkingVisible(true);
			ctx.ui.setWorkingMessage("Loading Agent Plugins...");
			console.error("[Agent Plugins] setWorkingMessage called");
		}
		try {
			runtime.startSession(ctx.cwd, ctx.isProjectTrusted());
			const errors = runtime
				.allDiagnostics()
				.filter((diagnostic) => diagnostic.severity === "error");
			if (errors.length > 0 && ctx.hasUI) {
				ctx.ui.notify(
					`Agent Plugins: ${errors.length} problem(s). Run /plugin list for detail.`,
					"warning",
				);
			}
			// Don't block session_start with trust prompts - defer to a fire-and-forget
			if (ctx.hasUI) {
				// Show notification if there are pending trust decisions
				const pending = runtime.pendingTrust();
				if (pending.length > 0) {
					ctx.ui.notify(
						`Agent Plugins: ${pending.length} plugin(s) need trust approval. Run /plugin trust <name> to allow MCP servers.`,
						"info",
					);
				}
			}
		} finally {
			if (ctx.hasUI) ctx.ui.setWorkingMessage();
			console.error("[Agent Plugins] session_start complete");
		}
	});

	registerPluginCommand(pi, runtime);

	pi.registerEntryRenderer("agent-plugins-report", (entry, _options, theme) => {
		const data = entry.data as { text: string };
		return new Text(theme.fg("dim", data.text));
	});
}


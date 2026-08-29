import assert from "node:assert/strict";
import test from "node:test";

import { withPluginLoadingFeedback } from "../src/plugin-loading-feedback.ts";

type PluginLoadingFeedbackContext = Parameters<
	typeof withPluginLoadingFeedback
>[0];

function testContext(
	mode: "tui" | "print" | "rpc",
	calls: string[],
): PluginLoadingFeedbackContext {
	return {
		mode,
		ui: {
			setWidget: (_key, content) => {
				calls.push(content === undefined ? "clear" : "show");
			},
		},
	};
}

test("plugin loading feedback yields after displaying a loader, then clears it", async () => {
	const calls: string[] = [];
	const feedback = withPluginLoadingFeedback(
		testContext("tui", calls),
		"Loading Agent Plugins...",
		() => {
			calls.push("work");
			return "loaded";
		},
	);

	await new Promise<void>((resolve) =>
		setTimeout(() => {
			calls.push("render");
			resolve();
		}, 0),
	);
	assert.deepEqual(calls, ["show", "render"]);
	assert.equal(await feedback, "loaded");
	assert.deepEqual(calls, ["show", "render", "work", "clear"]);
});

test("plugin loading feedback clears its loader when work fails", async () => {
	const calls: string[] = [];
	await assert.rejects(
		withPluginLoadingFeedback(
			testContext("tui", calls),
			"Loading Agent Plugins...",
			() => {
				calls.push("work");
				throw new Error("plugin scan failed");
			},
		),
		/plugin scan failed/,
	);
	assert.deepEqual(calls, ["show", "work", "clear"]);
});

test("plugin loading feedback does not create TUI widgets in print or RPC mode", async () => {
	for (const mode of ["print", "rpc"] as const) {
		const calls: string[] = [];
		await withPluginLoadingFeedback(
			testContext(mode, calls),
			"Loading Agent Plugins...",
			() => calls.push("work"),
		);
		assert.deepEqual(calls, ["work"]);
	}
});

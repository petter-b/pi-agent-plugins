/** Visible, cancellable-safe feedback for synchronous Agent Plugin loading. */

import type {
	ExtensionContext,
	ExtensionUIContext,
} from "@earendil-works/pi-coding-agent";
import { Loader } from "@earendil-works/pi-tui";

const PLUGIN_LOADING_WIDGET_KEY = "agent-plugins-loading";

type PluginLoadingFeedbackContext = Pick<ExtensionContext, "mode"> & {
	ui: Pick<ExtensionUIContext, "setWidget">;
};

/**
 * A widget using Pi TUI's Loader, the same spinner component used by Pi's
 * built-in WorkingStatusIndicator. dispose stops its animation timer.
 */
class PluginLoadingWidget extends Loader {
	dispose(): void {
		this.stop();
	}
}

/**
 * Displays Agent Plugin loading feedback, yields for a TUI paint, and always
 * removes it. Pi's built-in working row exists only while an agent is streaming,
 * so loading outside agent turns uses this equivalent Loader widget instead.
 */
export async function withPluginLoadingFeedback<T>(
	ctx: PluginLoadingFeedbackContext,
	message: string,
	work: () => T | Promise<T>,
): Promise<T> {
	if (ctx.mode !== "tui") return await work();

	ctx.ui.setWidget(PLUGIN_LOADING_WIDGET_KEY, (tui, theme) =>
		new PluginLoadingWidget(
			tui,
			(spinner) => theme.fg("accent", spinner),
			(text) => theme.fg("muted", text),
			message,
		),
	);
	try {
		await new Promise<void>((resolve) => setImmediate(resolve));
		return await work();
	} finally {
		ctx.ui.setWidget(PLUGIN_LOADING_WIDGET_KEY, undefined);
	}
}

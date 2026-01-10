import { ItemView, WorkspaceLeaf } from "obsidian";
import { Root, createRoot } from "react-dom/client";
import { StrictMode } from "react";
import { OrbitDashboard } from "./OrbitDashboard";
import OrbitPlugin from "../main";

export const VIEW_TYPE_ORBIT = "orbit-view";

/**
 * OrbitView - The Obsidian View shell that hosts the React HUD.
 */
export class OrbitView extends ItemView {
    private root: Root | null = null;
    private plugin: OrbitPlugin;

    constructor(leaf: WorkspaceLeaf, plugin: OrbitPlugin) {
        super(leaf);
        this.plugin = plugin;
    }

    getViewType(): string {
        return VIEW_TYPE_ORBIT;
    }

    getDisplayText(): string {
        return "Orbit";
    }

    getIcon(): string {
        return "users"; // Lucide icon name
    }

    async onOpen(): Promise<void> {
        const container = this.containerEl.children[1];
        container.empty();
        container.addClass("orbit-container");

        // Create React root and render the dashboard
        this.root = createRoot(container);
        this.root.render(
            <StrictMode>
                <OrbitDashboard plugin={this.plugin} />
            </StrictMode>
        );
    }

    async onClose(): Promise<void> {
        // Cleanup React root
        this.root?.unmount();
        this.root = null;
    }
}

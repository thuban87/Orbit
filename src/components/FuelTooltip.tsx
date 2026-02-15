import { useState, useEffect, useRef } from "react";
import { OrbitContact } from "../types";
import { useOrbitOptional } from "../context/OrbitContext";

interface FuelTooltipProps {
    contact: OrbitContact;
    anchorEl: HTMLElement | null;
    onClose: () => void;
    onMouseEnter?: () => void;
    onMouseLeave?: () => void;
}

/**
 * FuelTooltip - Shows Conversational Fuel content on hover.
 */
export function FuelTooltip({
    contact,
    anchorEl,
    onClose,
    onMouseEnter,
    onMouseLeave,
}: FuelTooltipProps) {
    const orbit = useOrbitOptional();
    const plugin = orbit?.plugin ?? null;
    const [fuel, setFuel] = useState<string | null>(null);
    const [loading, setLoading] = useState(true);
    const tooltipRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        let cancelled = false;

        const fetchFuel = async () => {
            setLoading(true);

            // If plugin is available (sidebar), read fuel from vault
            if (plugin) {
                try {
                    const content = await plugin.app.vault.read(contact.file);
                    const parsed = parseFuelSection(content);
                    if (!cancelled) {
                        setFuel(parsed);
                        setLoading(false);
                    }
                } catch (error) {
                    console.error("Orbit: Failed to read fuel", error);
                    if (!cancelled) {
                        setFuel(null);
                        setLoading(false);
                    }
                }
            } else {
                // No plugin (picker mode) — use cached fuel from contact
                if (!cancelled) {
                    if (contact.fuel && contact.fuel.length > 0) {
                        setFuel(convertToHtml(contact.fuel.join("\n")));
                    } else {
                        setFuel(null);
                    }
                    setLoading(false);
                }
            }
        };

        fetchFuel();

        return () => {
            cancelled = true;
        };
    }, [contact.file.path, plugin]);

    // Position the tooltip relative to the anchor element
    const getPosition = () => {
        if (!anchorEl) return { top: 0, left: 0 };

        const rect = anchorEl.getBoundingClientRect();
        const tooltipWidth = 280;

        // Position to the LEFT of the avatar (opposite of where native tooltip appears)
        let left = rect.left - tooltipWidth - 10;

        // If not enough space on left, position to the right
        if (left < 10) {
            left = rect.right + 10;
        }

        // Ensure tooltip doesn't go off screen vertically
        let top = rect.top;
        const tooltipHeight = 300; // max-height
        if (top + tooltipHeight > window.innerHeight) {
            top = window.innerHeight - tooltipHeight - 10;
        }
        if (top < 10) top = 10;

        return { top, left };
    };

    const position = getPosition();

    if (loading) {
        return (
            <div
                className="orbit-tooltip"
                style={{ top: position.top, left: position.left }}
                onMouseEnter={onMouseEnter}
                onMouseLeave={onMouseLeave}
            >
                <div className="orbit-tooltip-loading">Loading...</div>
            </div>
        );
    }

    if (!fuel) {
        return (
            <div
                className="orbit-tooltip"
                style={{ top: position.top, left: position.left }}
                onMouseEnter={onMouseEnter}
                onMouseLeave={onMouseLeave}
            >
                <div className="orbit-tooltip-header">
                    <strong>{contact.name}</strong>
                    <span className={`orbit-tooltip-status orbit-tooltip-status--${contact.status}`}>
                        {contact.status}
                    </span>
                </div>
                <div className="orbit-tooltip-empty">
                    No conversational fuel found.
                    <br />
                    <small>Add a "## Conversational Fuel" section to their note.</small>
                </div>
            </div>
        );
    }

    return (
        <div
            ref={tooltipRef}
            className="orbit-tooltip"
            style={{ top: position.top, left: position.left }}
            onMouseEnter={onMouseEnter}
            onMouseLeave={onMouseLeave}
        >
            <div className="orbit-tooltip-header">
                <strong>{contact.name}</strong>
                <span className={`orbit-tooltip-status orbit-tooltip-status--${contact.status}`}>
                    {contact.status}
                </span>
            </div>
            <div
                className="orbit-tooltip-content"
                dangerouslySetInnerHTML={{ __html: fuel }}
            />
        </div>
    );
}

/**
 * Parse the Conversational Fuel section from file content.
 * Extracts everything between "## Conversational Fuel" and the next heading.
 */
function parseFuelSection(content: string): string | null {
    // Match "## Conversational Fuel" or "## 🗣️ Conversational Fuel"
    const headerRegex = /^##\s*(?:🗣️\s*)?Conversational Fuel\s*$/im;
    const headerMatch = content.match(headerRegex);

    if (!headerMatch || headerMatch.index === undefined) {
        return null;
    }

    // Find the start of content after the header
    const startIndex = headerMatch.index + headerMatch[0].length;

    // Find the next heading (## or greater)
    const restContent = content.slice(startIndex);
    const nextHeadingMatch = restContent.match(/^##/m);
    const endIndex = nextHeadingMatch?.index ?? restContent.length;

    // Extract and clean the section
    const section = restContent.slice(0, endIndex).trim();

    if (!section) return null;

    // Convert markdown-ish content to simple HTML
    const html = convertToHtml(section);
    return html;
}

/**
 * Convert simple markdown to HTML for tooltip display.
 */
function convertToHtml(text: string): string {
    const lines = text.split("\n");
    let html = "";
    let inList = false;

    for (const line of lines) {
        const trimmed = line.trim();

        if (!trimmed) {
            if (inList) {
                html += "</ul>";
                inList = false;
            }
            continue;
        }

        // Bold text: **text**
        const processed = trimmed
            .replace(/\*\*([^*]+)\*\*/g, "<strong>$1</strong>")
            .replace(/⛔/g, "🚫"); // Normalize emoji

        // List items
        if (trimmed.startsWith("- ")) {
            if (!inList) {
                html += "<ul>";
                inList = true;
            }
            const content = processed.slice(2).trim();
            if (content) {
                html += `<li>${content}</li>`;
            }
        }
        // Sub-headers (bold lines)
        else if (trimmed.startsWith("**") && trimmed.endsWith("**")) {
            if (inList) {
                html += "</ul>";
                inList = false;
            }
            html += `<div class="orbit-fuel-subheader">${processed}</div>`;
        }
        // Regular text
        else {
            if (inList) {
                html += "</ul>";
                inList = false;
            }
            html += `<div>${processed}</div>`;
        }
    }

    if (inList) {
        html += "</ul>";
    }

    return html;
}

import { useState, useEffect, useRef } from "react";
import { OrbitContact } from "../types";
import { useOrbitOptional } from "../context/OrbitContext";
import { Logger } from "../utils/logger";

interface FuelTooltipProps {
    contact: OrbitContact;
    anchorEl: HTMLElement | null;
    onClose: () => void;
    onMouseEnter?: () => void;
    onMouseLeave?: () => void;
}

/** Structured fuel line types for safe JSX rendering. */
type FuelLine =
    | { type: "listItem"; text: string; bold: string[] }
    | { type: "subheader"; text: string }
    | { type: "text"; text: string; bold: string[] };

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
    const [fuelLines, setFuelLines] = useState<FuelLine[] | null>(null);
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
                    const rawSection = parseFuelSection(content);
                    if (!cancelled) {
                        setFuelLines(rawSection ? parseFuelLines(rawSection) : null);
                        setLoading(false);
                    }
                } catch (error) {
                    Logger.error('FuelTooltip', 'Failed to read fuel', error);
                    if (!cancelled) {
                        setFuelLines(null);
                        setLoading(false);
                    }
                }
            } else {
                // No plugin (picker mode) — use cached fuel from contact
                if (!cancelled) {
                    if (contact.fuel && contact.fuel.length > 0) {
                        setFuelLines(parseFuelLines(contact.fuel.join("\n")));
                    } else {
                        setFuelLines(null);
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

    if (!fuelLines) {
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
            <div className="orbit-tooltip-content">
                <FuelContent lines={fuelLines} />
            </div>
        </div>
    );
}

/**
 * Renders structured fuel lines as safe JSX (no innerHTML).
 */
function FuelContent({ lines }: { lines: FuelLine[] }) {
    const groups: JSX.Element[] = [];
    let currentList: FuelLine[] = [];

    const flushList = () => {
        if (currentList.length > 0) {
            groups.push(
                <ul key={`list-${groups.length}`}>
                    {currentList.map((item, i) => (
                        <li key={i}>{renderInline(item.text, (item as { bold: string[] }).bold)}</li>
                    ))}
                </ul>
            );
            currentList = [];
        }
    };

    for (const line of lines) {
        if (line.type === "listItem") {
            currentList.push(line);
        } else {
            flushList();
            if (line.type === "subheader") {
                groups.push(
                    <div key={`sub-${groups.length}`} className="orbit-fuel-subheader">
                        <strong>{line.text}</strong>
                    </div>
                );
            } else {
                groups.push(
                    <div key={`text-${groups.length}`}>
                        {renderInline(line.text, line.bold)}
                    </div>
                );
            }
        }
    }

    flushList();

    return <>{groups}</>;
}

/**
 * Renders inline text with bold segments as JSX.
 */
function renderInline(text: string, bold: string[]): JSX.Element {
    if (bold.length === 0) return <>{text}</>;

    const parts: JSX.Element[] = [];
    let remaining = text;
    let keyIdx = 0;

    for (const b of bold) {
        const idx = remaining.indexOf(b);
        if (idx === -1) continue;
        if (idx > 0) {
            parts.push(<span key={keyIdx++}>{remaining.slice(0, idx)}</span>);
        }
        parts.push(<strong key={keyIdx++}>{b}</strong>);
        remaining = remaining.slice(idx + b.length);
    }

    if (remaining) {
        parts.push(<span key={keyIdx}>{remaining}</span>);
    }

    return <>{parts}</>;
}

/**
 * Parse the Conversational Fuel section from file content.
 * Returns the raw markdown text between "## Conversational Fuel" and the next heading.
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

    return section || null;
}

/**
 * Parse raw markdown text into structured FuelLine objects.
 * Handles list items, bold sub-headers, bold inline segments, and plain text.
 */
function parseFuelLines(text: string): FuelLine[] {
    const lines = text.split("\n");
    const result: FuelLine[] = [];

    for (const line of lines) {
        const trimmed = line.trim().replace(/⛔/g, "🚫");

        if (!trimmed) continue;

        // List items: "- content"
        if (trimmed.startsWith("- ")) {
            const content = trimmed.slice(2).trim();
            if (content) {
                result.push({
                    type: "listItem",
                    text: stripBold(content),
                    bold: extractBold(content),
                });
            }
        }
        // Sub-headers: entire line is bold "**Header**"
        else if (trimmed.startsWith("**") && trimmed.endsWith("**") && !trimmed.slice(2, -2).includes("**")) {
            result.push({
                type: "subheader",
                text: trimmed.slice(2, -2),
            });
        }
        // Regular text (may contain inline bold)
        else {
            result.push({
                type: "text",
                text: stripBold(trimmed),
                bold: extractBold(trimmed),
            });
        }
    }

    return result;
}

/** Extract all bold segment strings from markdown text. */
function extractBold(text: string): string[] {
    const matches: string[] = [];
    const regex = /\*\*([^*]+)\*\*/g;
    let match: RegExpExecArray | null;
    while ((match = regex.exec(text)) !== null) {
        matches.push(match[1]);
    }
    return matches;
}

/** Strip bold markers from markdown text, leaving the inner content. */
function stripBold(text: string): string {
    return text.replace(/\*\*([^*]+)\*\*/g, "$1");
}

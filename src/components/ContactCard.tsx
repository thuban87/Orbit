import { useRef, useState } from "react";
import { createPortal } from "react-dom";
import { Menu, Notice } from "obsidian";
import { OrbitContact } from "../types";
import { useOrbit } from "../context/OrbitContext";
import { FuelTooltip } from "./FuelTooltip";

interface ContactCardProps {
    contact: OrbitContact;
}

/**
 * Get initials from a name (e.g., "Andrew Wales" -> "AW").
 */
function getInitials(name: string): string {
    return name
        .split(/\s+/)
        .map((word) => word[0])
        .join("")
        .toUpperCase()
        .slice(0, 2);
}

/**
 * Generate a consistent color based on a string (for avatar background).
 */
function stringToColor(str: string): string {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
        hash = str.charCodeAt(i) + ((hash << 5) - hash);
    }

    // Generate HSL color with good saturation and lightness
    const hue = Math.abs(hash % 360);
    return `hsl(${hue}, 65%, 45%)`;
}

/**
 * ContactCard - Individual contact avatar with status ring and name.
 * Hover shows Conversational Fuel tooltip. Right-click shows context menu.
 */
export function ContactCard({ contact }: ContactCardProps) {
    const { plugin, refreshContacts } = useOrbit();
    const [showTooltip, setShowTooltip] = useState(false);
    const cardRef = useRef<HTMLDivElement>(null);
    const hoverTimeoutRef = useRef<number | null>(null);
    const hideTimeoutRef = useRef<number | null>(null);

    const handleClick = (e: React.MouseEvent) => {
        // Open the contact's note
        const leaf = plugin.app.workspace.getLeaf(e.ctrlKey || e.metaKey);
        leaf.openFile(contact.file);
    };

    const handleContextMenu = (e: React.MouseEvent) => {
        e.preventDefault();
        e.stopPropagation();

        const menu = new Menu();

        // Mark as contacted today
        menu.addItem((item) =>
            item
                .setTitle("✓ Mark as contacted today")
                .setIcon("check")
                .onClick(async () => {
                    await markAsContacted();
                })
        );

        menu.addSeparator();

        // Snooze options
        menu.addItem((item) =>
            item
                .setTitle("⏸️ Snooze for 1 week")
                .setIcon("clock")
                .onClick(async () => {
                    await snoozeContact(7);
                })
        );

        menu.addItem((item) =>
            item
                .setTitle("⏸️ Snooze for 1 month")
                .setIcon("clock")
                .onClick(async () => {
                    await snoozeContact(30);
                })
        );

        if (contact.status === "snoozed") {
            menu.addItem((item) =>
                item
                    .setTitle("▶️ Unsnooze")
                    .setIcon("play")
                    .onClick(async () => {
                        await unsnoozeContact();
                    })
            );
        }

        menu.addSeparator();

        // Open note
        menu.addItem((item) =>
            item
                .setTitle("Open note")
                .setIcon("file-text")
                .onClick(() => {
                    plugin.app.workspace.getLeaf().openFile(contact.file);
                })
        );

        menu.addItem((item) =>
            item
                .setTitle("Open in new tab")
                .setIcon("file-plus")
                .onClick(() => {
                    plugin.app.workspace.getLeaf(true).openFile(contact.file);
                })
        );

        menu.showAtMouseEvent(e.nativeEvent);
    };

    const markAsContacted = async () => {
        const today = new Date().toISOString().split("T")[0];
        try {
            await plugin.app.fileManager.processFrontMatter(
                contact.file,
                (frontmatter) => {
                    frontmatter.last_contact = today;
                }
            );
            new Notice(`✓ ${contact.name} marked as contacted`);
            refreshContacts();
        } catch (error) {
            new Notice(`Failed to update ${contact.name}`);
        }
    };

    const snoozeContact = async (days: number) => {
        const snoozeDate = new Date();
        snoozeDate.setDate(snoozeDate.getDate() + days);
        const snoozeStr = snoozeDate.toISOString().split("T")[0];

        try {
            await plugin.app.fileManager.processFrontMatter(
                contact.file,
                (frontmatter) => {
                    frontmatter.snooze_until = snoozeStr;
                }
            );
            new Notice(`⏸️ ${contact.name} snoozed until ${snoozeStr}`);
            refreshContacts();
        } catch (error) {
            new Notice(`Failed to snooze ${contact.name}`);
        }
    };

    const unsnoozeContact = async () => {
        try {
            await plugin.app.fileManager.processFrontMatter(
                contact.file,
                (frontmatter) => {
                    delete frontmatter.snooze_until;
                }
            );
            new Notice(`▶️ ${contact.name} unsnoozed`);
            refreshContacts();
        } catch (error) {
            new Notice(`Failed to unsnooze ${contact.name}`);
        }
    };

    const handleMouseEnter = () => {
        // Cancel any pending hide
        if (hideTimeoutRef.current) {
            clearTimeout(hideTimeoutRef.current);
            hideTimeoutRef.current = null;
        }
        // Delay showing tooltip to avoid flicker on quick mouse movements
        hoverTimeoutRef.current = window.setTimeout(() => {
            setShowTooltip(true);
        }, 300); // 300ms delay
    };

    const handleMouseLeave = () => {
        // Clear the show timeout if mouse leaves before delay
        if (hoverTimeoutRef.current) {
            clearTimeout(hoverTimeoutRef.current);
            hoverTimeoutRef.current = null;
        }
        // Delay hiding to allow mouse to move into tooltip
        hideTimeoutRef.current = window.setTimeout(() => {
            setShowTooltip(false);
        }, 400); // 400ms grace period
    };

    // Called when mouse enters the tooltip itself
    const handleTooltipMouseEnter = () => {
        if (hideTimeoutRef.current) {
            clearTimeout(hideTimeoutRef.current);
            hideTimeoutRef.current = null;
        }
    };

    // Called when mouse leaves the tooltip
    const handleTooltipMouseLeave = () => {
        hideTimeoutRef.current = window.setTimeout(() => {
            setShowTooltip(false);
        }, 200); // Short delay when leaving tooltip
    };

    const statusClass = `orbit-avatar--${contact.status}`;

    return (
        <>
            <div
                ref={cardRef}
                className="orbit-card"
                onClick={handleClick}
                onContextMenu={handleContextMenu}
                onMouseEnter={handleMouseEnter}
                onMouseLeave={handleMouseLeave}
            >
                {contact.photo ? (
                    <img
                        src={contact.photo}
                        alt={contact.name}
                        className={`orbit-avatar ${statusClass}`}
                        onError={(e) => {
                            // If image fails to load, hide it and show fallback
                            e.currentTarget.style.display = "none";
                            const fallback = e.currentTarget.nextElementSibling;
                            if (fallback) {
                                (fallback as HTMLElement).style.display = "flex";
                            }
                        }}
                    />
                ) : null}

                {/* Fallback avatar with initials - shown if no photo or photo fails */}
                <div
                    className={`orbit-avatar-fallback ${statusClass}`}
                    style={{
                        display: contact.photo ? "none" : "flex",
                        backgroundColor: stringToColor(contact.name),
                    }}
                >
                    {getInitials(contact.name)}
                </div>

                <span className="orbit-name">{contact.name}</span>
            </div>

            {/* Tooltip shown on hover - rendered via portal to escape overflow clipping */}
            {showTooltip &&
                createPortal(
                    <FuelTooltip
                        contact={contact}
                        anchorEl={cardRef.current}
                        onClose={() => setShowTooltip(false)}
                        onMouseEnter={handleTooltipMouseEnter}
                        onMouseLeave={handleTooltipMouseLeave}
                    />,
                    document.body
                )}
        </>
    );
}

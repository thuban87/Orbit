import { useRef, useState } from "react";
import { createPortal } from "react-dom";
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
 * Hover shows Conversational Fuel tooltip.
 */
export function ContactCard({ contact }: ContactCardProps) {
    const { plugin } = useOrbit();
    const [showTooltip, setShowTooltip] = useState(false);
    const cardRef = useRef<HTMLDivElement>(null);
    const hoverTimeoutRef = useRef<number | null>(null);
    const hideTimeoutRef = useRef<number | null>(null);

    const handleClick = (e: React.MouseEvent) => {
        // Open the contact's note
        const leaf = plugin.app.workspace.getLeaf(e.ctrlKey || e.metaKey);
        leaf.openFile(contact.file);
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

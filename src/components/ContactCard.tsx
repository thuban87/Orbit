import { OrbitContact } from "../types";
import { useOrbit } from "../context/OrbitContext";

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
 */
export function ContactCard({ contact }: ContactCardProps) {
    const { plugin } = useOrbit();

    const handleClick = (e: React.MouseEvent) => {
        // Open the contact's note
        const leaf = plugin.app.workspace.getLeaf(e.ctrlKey || e.metaKey);
        leaf.openFile(contact.file);
    };

    const statusClass = `orbit-avatar--${contact.status}`;

    return (
        <div
            className="orbit-card"
            onClick={handleClick}
            title={`${contact.name}\n${contact.frequency} • ${contact.status}`}
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
    );
}

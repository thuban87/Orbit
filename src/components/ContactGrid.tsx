import { useOrbit } from "../context/OrbitContext";
import { ContactCard } from "./ContactCard";
import { OrbitContact } from "../types";

/**
 * Category grouping configuration.
 * Maps frontmatter category values to display sections.
 */
const CATEGORY_GROUPS: { title: string; categories: string[] }[] = [
    {
        title: "Family & Friends",
        categories: ["family", "friends", "friend"],
    },
    {
        title: "Community & Professional",
        categories: ["community", "professional", "work", "business", "colleague"],
    },
    {
        title: "Service",
        categories: ["service", "vendor", "contractor"],
    },
];

/**
 * Get the section index for a contact based on their category.
 * Returns -1 if no matching section (will go to "Other").
 */
function getSectionIndex(contact: OrbitContact): number {
    const category = (contact.category || "").toLowerCase();

    for (let i = 0; i < CATEGORY_GROUPS.length; i++) {
        if (CATEGORY_GROUPS[i].categories.includes(category)) {
            return i;
        }
    }
    return -1; // No match
}

/**
 * ContactGrid - Displays contacts organized into priority sections.
 */
export function ContactGrid() {
    const { contacts } = useOrbit();

    if (contacts.length === 0) {
        return (
            <div className="orbit-empty">
                <h3>No contacts found</h3>
                <p>
                    Add the <code>#people</code> tag to your contact notes to see them here.
                </p>
                <p>
                    <small>You can change the tag in Orbit settings.</small>
                </p>
            </div>
        );
    }

    // Group contacts by section
    const sections: OrbitContact[][] = CATEGORY_GROUPS.map(() => []);
    const other: OrbitContact[] = [];

    for (const contact of contacts) {
        const sectionIdx = getSectionIndex(contact);
        if (sectionIdx >= 0) {
            sections[sectionIdx].push(contact);
        } else {
            other.push(contact);
        }
    }

    return (
        <div className="orbit-sections">
            {CATEGORY_GROUPS.map((group, idx) => {
                const sectionContacts = sections[idx];
                if (sectionContacts.length === 0) return null;

                return (
                    <div key={group.title} className="orbit-section">
                        <h4 className="orbit-section-title">{group.title}</h4>
                        <div className="orbit-grid">
                            {sectionContacts.map((contact) => (
                                <ContactCard key={contact.file.path} contact={contact} />
                            ))}
                        </div>
                    </div>
                );
            })}

            {/* Other/Uncategorized section */}
            {other.length > 0 && (
                <div className="orbit-section">
                    <h4 className="orbit-section-title">Other</h4>
                    <div className="orbit-grid">
                        {other.map((contact) => (
                            <ContactCard key={contact.file.path} contact={contact} />
                        ))}
                    </div>
                </div>
            )}
        </div>
    );
}

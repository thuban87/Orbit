import { useMemo } from "react";
import { useOrbit } from "../context/OrbitContext";
import { OrbitContact } from "../types";

/**
 * BirthdayBanner - Shows contacts with upcoming birthdays (within 7 days).
 */
export function BirthdayBanner() {
    const { contacts, plugin } = useOrbit();

    const upcomingBirthdays = useMemo(() => {
        const today = new Date();
        const upcoming: { contact: OrbitContact; daysUntil: number }[] = [];

        for (const contact of contacts) {
            if (!contact.birthday) continue;

            const daysUntil = getDaysUntilBirthday(contact.birthday, today);
            if (daysUntil !== null && daysUntil >= 0 && daysUntil <= 7) {
                upcoming.push({ contact, daysUntil });
            }
        }

        // Sort by soonest first
        upcoming.sort((a, b) => a.daysUntil - b.daysUntil);
        return upcoming;
    }, [contacts]);

    if (upcomingBirthdays.length === 0) {
        return null;
    }

    return (
        <div className="orbit-birthday-banner">
            <span className="orbit-birthday-icon">🎂</span>
            <div className="orbit-birthday-content">
                {upcomingBirthdays.map(({ contact, daysUntil }) => (
                    <div
                        key={contact.file.path}
                        className="orbit-birthday-item"
                        onClick={() =>
                            plugin.app.workspace.getLeaf().openFile(contact.file)
                        }
                    >
                        <strong>{contact.name}</strong>
                        <span className="orbit-birthday-days">
                            {daysUntil === 0
                                ? "🎉 Today!"
                                : daysUntil === 1
                                    ? "Tomorrow"
                                    : `in ${daysUntil} days`}
                        </span>
                    </div>
                ))}
            </div>
        </div>
    );
}

/**
 * Calculate days until next birthday.
 * Birthday can be "MM-DD" or "YYYY-MM-DD" format.
 */
function getDaysUntilBirthday(birthday: string, today: Date): number | null {
    // Parse birthday - try MM-DD first, then YYYY-MM-DD
    let month: number, day: number;

    const shortMatch = birthday.match(/^(\d{1,2})-(\d{1,2})$/);
    const longMatch = birthday.match(/^\d{4}-(\d{1,2})-(\d{1,2})/);

    if (shortMatch) {
        month = parseInt(shortMatch[1]) - 1;
        day = parseInt(shortMatch[2]);
    } else if (longMatch) {
        month = parseInt(longMatch[1]) - 1;
        day = parseInt(longMatch[2]);
    } else {
        return null;
    }

    // Create this year's birthday
    const thisYear = today.getFullYear();
    let birthdayThisYear = new Date(thisYear, month, day);

    // If birthday already passed this year, use next year
    if (birthdayThisYear < today) {
        birthdayThisYear = new Date(thisYear + 1, month, day);
    }

    // Calculate days difference
    const diffTime = birthdayThisYear.getTime() - today.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

    return diffDays;
}

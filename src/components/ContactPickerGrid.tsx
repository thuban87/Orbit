/**
 * ContactPickerGrid — Card grid for the picker modal.
 *
 * Renders contact cards sorted by status (decay → wobble → stable → snoozed)
 * with search-by-name filtering, category/social battery dropdowns,
 * sort-by-last-contacted toggle, and an optional "show decaying only" toggle.
 *
 * Receives contacts as props (snapshot from OrbitIndex), not from OrbitContext.
 * This keeps the component decoupled from the sidebar's React provider tree.
 */
import { useState, useMemo } from "react";
import React from "react";
import { OrbitContact } from "../types";
import { ContactCard } from "./ContactCard";

interface ContactPickerGridProps {
    /** All contacts to display (pre-sorted by status from OrbitIndex) */
    contacts: OrbitContact[];
    /** Callback when a contact is selected */
    onSelect: (contact: OrbitContact) => void;
}

/** Status sort priority: lower = shown first */
const STATUS_ORDER: Record<string, number> = {
    decay: 0,
    wobble: 1,
    stable: 2,
    snoozed: 3,
};

type SortMode = "status" | "last-asc" | "last-desc";

/**
 * ContactPickerGrid — Grid of ContactCards with search, filter, and sort controls.
 */
export function ContactPickerGrid({ contacts, onSelect }: ContactPickerGridProps) {
    const [searchQuery, setSearchQuery] = useState("");
    const [showDecayingOnly, setShowDecayingOnly] = useState(false);
    const [categoryFilter, setCategoryFilter] = useState<string>("all");
    const [batteryFilter, setBatteryFilter] = useState<string>("all");
    const [sortMode, setSortMode] = useState<SortMode>("status");

    // Extract unique categories from contacts
    const categories = useMemo(() => {
        const cats = new Set<string>();
        for (const c of contacts) {
            if (c.category) cats.add(c.category);
        }
        return Array.from(cats).sort();
    }, [contacts]);

    // Extract unique social battery values
    const batteries = useMemo(() => {
        const bats = new Set<string>();
        for (const c of contacts) {
            if (c.socialBattery) bats.add(c.socialBattery);
        }
        return Array.from(bats).sort();
    }, [contacts]);

    const filteredContacts = useMemo(() => {
        let result = [...contacts];

        // Filter by search query (case-insensitive name match)
        if (searchQuery.trim()) {
            const query = searchQuery.trim().toLowerCase();
            result = result.filter((c) =>
                c.name.toLowerCase().includes(query)
            );
        }

        // Filter to decaying only (decay + wobble)
        if (showDecayingOnly) {
            result = result.filter(
                (c) => c.status === "decay" || c.status === "wobble"
            );
        }

        // Filter by category
        if (categoryFilter !== "all") {
            result = result.filter((c) =>
                (c.category || "").toLowerCase() === categoryFilter.toLowerCase()
            );
        }

        // Filter by social battery
        if (batteryFilter !== "all") {
            result = result.filter((c) => c.socialBattery === batteryFilter);
        }

        // Sort
        if (sortMode === "status") {
            result.sort((a, b) => STATUS_ORDER[a.status] - STATUS_ORDER[b.status]);
        } else if (sortMode === "last-asc") {
            // Oldest contact first (most days since contact)
            result.sort((a, b) => b.daysSinceContact - a.daysSinceContact);
        } else if (sortMode === "last-desc") {
            // Most recent contact first (fewest days since contact)
            result.sort((a, b) => a.daysSinceContact - b.daysSinceContact);
        }

        return result;
    }, [contacts, searchQuery, showDecayingOnly, categoryFilter, batteryFilter, sortMode]);

    return (
        <div className="orbit-picker-content">
            {/* Toolbar row 1: search */}
            <div className="orbit-picker-toolbar">
                <input
                    type="text"
                    className="orbit-picker-search"
                    placeholder="Search contacts..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    autoFocus
                />
            </div>

            {/* Toolbar row 2: filters */}
            <div className="orbit-picker-filters">
                <select
                    className="orbit-picker-select"
                    value={categoryFilter}
                    onChange={(e) => setCategoryFilter(e.target.value)}
                >
                    <option value="all">All categories</option>
                    {categories.map((cat) => (
                        <option key={cat} value={cat}>{cat}</option>
                    ))}
                </select>

                <select
                    className="orbit-picker-select"
                    value={batteryFilter}
                    onChange={(e) => setBatteryFilter(e.target.value)}
                >
                    <option value="all">All batteries</option>
                    {batteries.map((bat) => (
                        <option key={bat} value={bat}>{bat}</option>
                    ))}
                </select>

                <select
                    className="orbit-picker-select"
                    value={sortMode}
                    onChange={(e) => setSortMode(e.target.value as SortMode)}
                >
                    <option value="status">Sort: by status</option>
                    <option value="last-asc">Sort: least recent first</option>
                    <option value="last-desc">Sort: most recent first</option>
                </select>

                <label className="orbit-picker-toggle">
                    <input
                        type="checkbox"
                        checked={showDecayingOnly}
                        onChange={(e) => setShowDecayingOnly(e.target.checked)}
                    />
                    <span>Decaying only</span>
                </label>
            </div>

            {/* Grid or empty state */}
            {filteredContacts.length === 0 ? (
                <div className="orbit-picker-empty">
                    <p>
                        {contacts.length === 0
                            ? "No contacts found"
                            : "No contacts match your filters"}
                    </p>
                </div>
            ) : (
                <div className="orbit-picker-grid">
                    {filteredContacts.map((contact) => (
                        <ContactCard
                            key={contact.file.path}
                            contact={contact}
                            mode="picker"
                            onSelect={onSelect}
                        />
                    ))}
                </div>
            )}
        </div>
    );
}

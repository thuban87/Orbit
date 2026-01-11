import { useState } from "react";
import { OrbitProvider, useOrbit } from "../context/OrbitContext";
import { ContactGrid } from "../components/ContactGrid";
import { OrbitHeader, SortMode, FilterMode } from "../components/OrbitHeader";
import { BirthdayBanner } from "../components/BirthdayBanner";
import OrbitPlugin from "../main";

interface OrbitDashboardProps {
    plugin: OrbitPlugin;
}

/**
 * OrbitDashboard - The root React component for the Orbit sidebar.
 */
export function OrbitDashboard({ plugin }: OrbitDashboardProps) {
    return (
        <OrbitProvider plugin={plugin}>
            <DashboardContent />
        </OrbitProvider>
    );
}

/**
 * Inner component that uses the Orbit context.
 */
function DashboardContent() {
    const { contacts, refreshContacts } = useOrbit();
    const [sortMode, setSortMode] = useState<SortMode>("status");
    const [filterMode, setFilterMode] = useState<FilterMode>("all");

    return (
        <div className="orbit-dashboard">
            <BirthdayBanner />
            <OrbitHeader
                sortMode={sortMode}
                filterMode={filterMode}
                onSortChange={setSortMode}
                onFilterChange={setFilterMode}
                onRefresh={refreshContacts}
                contactCount={contacts.length}
            />
            <ContactGrid sortMode={sortMode} filterMode={filterMode} />
        </div>
    );
}

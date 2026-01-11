import { useOrbit } from "../context/OrbitContext";

export type SortMode = "status" | "name";
export type FilterMode = "all" | "charger" | "decay";

interface OrbitHeaderProps {
    sortMode: SortMode;
    filterMode: FilterMode;
    onSortChange: (mode: SortMode) => void;
    onFilterChange: (mode: FilterMode) => void;
    onRefresh: () => void;
    contactCount: number;
}

/**
 * OrbitHeader - Control bar with sort, filter, and refresh options.
 */
export function OrbitHeader({
    sortMode,
    filterMode,
    onSortChange,
    onFilterChange,
    onRefresh,
    contactCount,
}: OrbitHeaderProps) {
    return (
        <div className="orbit-header">
            <div className="orbit-header-title">
                <span className="orbit-header-count">{contactCount}</span>
                <span>contacts</span>
            </div>

            <div className="orbit-header-controls">
                {/* Sort dropdown */}
                <select
                    className="orbit-select"
                    value={sortMode}
                    onChange={(e) => onSortChange(e.target.value as SortMode)}
                    title="Sort by"
                >
                    <option value="status">⚡ By Status</option>
                    <option value="name">🔤 By Name</option>
                </select>

                {/* Filter dropdown */}
                <select
                    className="orbit-select"
                    value={filterMode}
                    onChange={(e) => onFilterChange(e.target.value as FilterMode)}
                    title="Filter"
                >
                    <option value="all">All</option>
                    <option value="charger">🔋 Chargers Only</option>
                    <option value="decay">🔴 Needs Attention</option>
                </select>

                {/* Refresh button */}
                <button
                    className="orbit-button"
                    onClick={onRefresh}
                    title="Refresh contacts"
                >
                    ↻
                </button>
            </div>
        </div>
    );
}

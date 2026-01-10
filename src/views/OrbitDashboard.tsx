import { OrbitProvider } from "../context/OrbitContext";
import { ContactGrid } from "../components/ContactGrid";
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
            <div className="orbit-dashboard">
                <ContactGrid />
            </div>
        </OrbitProvider>
    );
}

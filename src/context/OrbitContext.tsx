import { createContext, useContext, useState, useEffect, ReactNode } from "react";
import OrbitPlugin from "../main";
import { OrbitContact } from "../types";

/**
 * Context value shape for Orbit data.
 */
interface OrbitContextValue {
    contacts: OrbitContact[];
    plugin: OrbitPlugin;
    refreshContacts: () => void;
}

const OrbitContext = createContext<OrbitContextValue | null>(null);

/**
 * Hook to access Orbit context.
 */
export function useOrbit(): OrbitContextValue {
    const context = useContext(OrbitContext);
    if (!context) {
        throw new Error("useOrbit must be used within an OrbitProvider");
    }
    return context;
}

/**
 * Props for the OrbitProvider component.
 */
interface OrbitProviderProps {
    plugin: OrbitPlugin;
    children: ReactNode;
}

/**
 * OrbitProvider - Provides plugin data to React components.
 * Subscribes to OrbitIndex changes for reactivity.
 */
export function OrbitProvider({ plugin, children }: OrbitProviderProps) {
    const [contacts, setContacts] = useState<OrbitContact[]>([]);

    const refreshContacts = () => {
        const sortedContacts = plugin.index.getContactsByStatus();
        setContacts(sortedContacts);
    };

    useEffect(() => {
        // Initial load
        refreshContacts();

        // Subscribe to index changes
        const handleChange = () => {
            refreshContacts();
        };

        plugin.index.on("change", handleChange);

        // Cleanup subscription on unmount
        return () => {
            plugin.index.off("change", handleChange);
        };
    }, [plugin]);

    const value: OrbitContextValue = {
        contacts,
        plugin,
        refreshContacts,
    };

    return (
        <OrbitContext.Provider value={value}>
            {children}
        </OrbitContext.Provider>
    );
}

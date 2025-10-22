import React, { useState, useEffect, useCallback } from 'react';
import Spinner from './Spinner';

// FIX: Moved the global window.aistudio type declaration to types.ts to avoid declaration conflicts.

interface ApiKeySelectorProps {
    children: React.ReactNode;
}

const ApiKeySelector: React.FC<ApiKeySelectorProps> = ({ children }) => {
    const [isKeySelected, setIsKeySelected] = useState(false);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    const checkApiKey = useCallback(async () => {
        setIsLoading(true);
        try {
            if (window.aistudio && typeof window.aistudio.hasSelectedApiKey === 'function') {
                const hasKey = await window.aistudio.hasSelectedApiKey();
                setIsKeySelected(hasKey);
            } else {
                 // Fallback for environments where aistudio is not available
                console.warn("aistudio context not found. Assuming API key is set via environment variable.");
                setIsKeySelected(true); 
            }
        } catch (e) {
            console.error("Error checking for API key:", e);
            setError("Could not verify API key status.");
        } finally {
            setIsLoading(false);
        }
    }, []);

    useEffect(() => {
        checkApiKey();
    }, [checkApiKey]);

    const handleSelectKey = async () => {
        try {
            await window.aistudio.openSelectKey();
            // Assume success to avoid race condition and re-render immediately
            setIsKeySelected(true);
        } catch (e) {
            console.error("Error opening API key selection:", e);
            setError("Failed to open API key selection. Please try again.");
        }
    };

    if (isLoading) {
        return (
            <div className="flex flex-col items-center justify-center p-8 bg-gray-800 rounded-lg">
                <Spinner text="Verifying API key..." />
            </div>
        );
    }

    if (error) {
        return (
             <div className="flex flex-col items-center justify-center p-8 bg-red-900/20 border border-red-500 rounded-lg text-red-300">
                <p>{error}</p>
            </div>
        );
    }
    
    if (!isKeySelected) {
        return (
            <div className="flex flex-col items-center justify-center text-center p-8 bg-gray-800 border border-cyan-500/30 rounded-lg shadow-xl">
                <h2 className="text-2xl font-bold text-white mb-4">API Key Required for Video Generation</h2>
                <p className="text-gray-400 max-w-md mb-6">
                    This feature uses Veo models which require you to select an API key. 
                    This ensures you are aware of the associated billing.
                </p>
                <button
                    onClick={handleSelectKey}
                    className="px-6 py-3 bg-cyan-500 text-white font-semibold rounded-lg shadow-md hover:bg-cyan-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-gray-900 focus:ring-cyan-500 transition-transform transform hover:scale-105"
                >
                    Select API Key
                </button>
                 <p className="text-xs text-gray-500 mt-4">
                    For more information on billing, visit <a href="https://ai.google.dev/gemini-api/docs/billing" target="_blank" rel="noopener noreferrer" className="underline hover:text-cyan-400">ai.google.dev/gemini-api/docs/billing</a>.
                </p>
            </div>
        );
    }

    return <>{children}</>;
};

export default ApiKeySelector;
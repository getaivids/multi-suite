import React from 'react';
import type { Tab } from '../../App';

interface TabsProps {
    activeTab: Tab;
    setActiveTab: (tab: Tab) => void;
}

const TABS: Tab[] = ['Podcast to Video', 'TTS', 'Audio Transcription'];

const TabsComponent: React.FC<TabsProps> = ({ activeTab, setActiveTab }) => {
    return (
        <nav className="flex flex-wrap justify-center sm:justify-end gap-1.5 p-1 bg-zinc-900 border border-zinc-800 rounded-xl">
            {TABS.map((tab) => (
                <button
                    key={tab}
                    onClick={() => setActiveTab(tab)}
                    className={`px-3.5 py-1.5 text-xs font-medium rounded-lg transition-all duration-150 ease-out focus:outline-none ${
                        activeTab === tab
                            ? 'bg-white text-black font-semibold shadow-sm'
                            : 'text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800/60'
                    }`}
                >
                    {tab}
                </button>
            ))}
        </nav>
    );
};

export default TabsComponent;

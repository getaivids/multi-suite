import React from 'react';
import type { Tab } from '../../App';

interface TabsProps {
    activeTab: Tab;
    setActiveTab: (tab: Tab) => void;
}

const TABS: Tab[] = ['Podcast to Video', 'Video Generation', 'Audio Transcription', 'Chat', 'TTS'];

const TabsComponent: React.FC<TabsProps> = ({ activeTab, setActiveTab }) => {
    return (
        <nav className="flex flex-wrap justify-center sm:justify-end space-x-2 sm:space-x-4">
            {TABS.map((tab) => (
                <button
                    key={tab}
                    onClick={() => setActiveTab(tab)}
                    className={`px-3 py-2 text-sm sm:text-base font-medium rounded-md transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-gray-900 focus:ring-cyan-500
                        ${activeTab === tab
                            ? 'bg-cyan-500 text-white shadow-md'
                            : 'text-gray-300 hover:bg-gray-700 hover:text-white'
                        }`}
                >
                    {tab}
                </button>
            ))}
        </nav>
    );
};

export default TabsComponent;

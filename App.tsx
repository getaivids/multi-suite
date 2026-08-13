import React, { useState } from 'react';
import TTS from './components/TTS';
import AudioTranscriber from './components/AudioTranscriber';
import PodcastToVideo from './components/PodcastToVideo';
import Tabs from './components/common/Tabs';

export type Tab = 'Podcast to Video' | 'TTS' | 'Audio Transcription';

const App: React.FC = () => {
    const [activeTab, setActiveTab] = useState<Tab>('Podcast to Video');

    const renderContent = () => {
        switch (activeTab) {
            case 'Podcast to Video':
                return <PodcastToVideo />;
            case 'TTS':
                return <TTS />;
            case 'Audio Transcription':
                return <AudioTranscriber />;
            default:
                return <PodcastToVideo />;
        }
    };

    return (
        <div className="min-h-screen bg-black text-zinc-100 font-sans selection:bg-zinc-800 selection:text-white">
            <header className="bg-zinc-950/80 backdrop-blur-md border-b border-zinc-800/80 sticky top-0 z-20">
                <div className="container mx-auto px-4 sm:px-6 lg:px-8">
                    <div className="flex flex-col sm:flex-row items-center justify-between py-4 gap-4">
                        <div className="flex items-center space-x-3">
                            <div className="w-8 h-8 rounded-lg bg-white text-black flex items-center justify-center font-bold text-sm">
                                🎬
                            </div>
                            <div>
                                <h1 className="text-lg font-bold tracking-tight text-white leading-none">Podcast Studio</h1>
                                <p className="text-[10px] font-mono text-zinc-500 uppercase tracking-widest mt-0.5">AI Video Generator</p>
                            </div>
                        </div>
                        <Tabs activeTab={activeTab} setActiveTab={setActiveTab} />
                    </div>
                </div>
            </header>
            <main className="container mx-auto px-4 sm:px-6 lg:px-8 py-8">
                {renderContent()}
            </main>
        </div>
    );
};

export default App;

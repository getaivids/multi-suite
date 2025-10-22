import React, { useState } from 'react';
import Chat from './components/Chat';
import TTS from './components/TTS';
import VideoGenerator from './components/VideoGenerator';
import AudioTranscriber from './components/AudioTranscriber';
import PodcastToVideo from './components/PodcastToVideo';
import Tabs from './components/common/Tabs';

export type Tab = 'Chat' | 'TTS' | 'Video Generation' | 'Audio Transcription' | 'Podcast to Video';

const App: React.FC = () => {
    const [activeTab, setActiveTab] = useState<Tab>('Podcast to Video');

    const renderContent = () => {
        switch (activeTab) {
            case 'Chat':
                return <Chat />;
            case 'TTS':
                return <TTS />;
            case 'Video Generation':
                return <VideoGenerator />;
            case 'Audio Transcription':
                return <AudioTranscriber />;
            case 'Podcast to Video':
                return <PodcastToVideo />;
            default:
                return null;
        }
    };

    return (
        <div className="min-h-screen bg-gray-900 text-gray-200 font-sans">
            <header className="bg-gray-800/50 backdrop-blur-sm shadow-lg sticky top-0 z-10">
                <div className="container mx-auto px-4 sm:px-6 lg:px-8">
                    <div className="flex flex-col sm:flex-row items-center justify-between py-4">
                        <div className="flex items-center space-x-3 mb-4 sm:mb-0">
                             <svg className="w-10 h-10 text-cyan-400" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                                <path d="M12 2L2 7V17L12 22L22 17V7L12 2Z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                                <path d="M2 7L12 12L22 7" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                                <path d="M12 22V12" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                                <path d="M20 4.5L12 9L4 4.5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                                <path d="M17 19.5L12 14.5L7 19.5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                             </svg>
                            <h1 className="text-2xl font-bold tracking-tight text-white">Gemini Multi-Tool Suite</h1>
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

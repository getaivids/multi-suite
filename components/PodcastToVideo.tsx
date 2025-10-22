import React, { useState } from 'react';
import ApiKeySelector from './common/ApiKeySelector';
import { analyzePodcastTranscript, generateVideo, getVideosOperation } from '../services/geminiService';
import type { Scene, GeneratedVideo } from '../types';
import Spinner from './common/Spinner';

enum ProcessStep {
    IDLE,
    ANALYZING,
    SCENES_READY,
    GENERATING_VIDEOS,
    DONE,
    ERROR,
}

const PodcastToVideo: React.FC = () => {
    const [transcript, setTranscript] = useState('');
    const [step, setStep] = useState<ProcessStep>(ProcessStep.IDLE);
    const [scenes, setScenes] = useState<Scene[]>([]);
    const [generatedVideos, setGeneratedVideos] = useState<GeneratedVideo[]>([]);
    const [error, setError] = useState<string | null>(null);

    const handleAnalyze = async () => {
        if (!transcript.trim()) {
            setError('Please provide a podcast transcript.');
            return;
        }
        setStep(ProcessStep.ANALYZING);
        setError(null);

        try {
            const response = await analyzePodcastTranscript(transcript);
            const jsonText = response.text.trim();
            const result = JSON.parse(jsonText);
            
            if (result.scenes && Array.isArray(result.scenes)) {
                setScenes(result.scenes);
                setStep(ProcessStep.SCENES_READY);
            } else {
                throw new Error("Invalid JSON structure received from API.");
            }
        } catch (err) {
            console.error("Analysis Error:", err);
            let message = 'Failed to analyze transcript. Please try again.';
            if (err instanceof Error) {
                try {
                    const apiError = JSON.parse(err.message);
                    message = `Analysis failed: ${apiError?.error?.message || 'An unknown API error occurred.'}`;
                } catch (e) {
                    if (err.message.toLowerCase().includes('json')) {
                        message = 'The AI returned an unexpected format that could not be read. Please try adjusting your transcript or try again.';
                    } else {
                        message = `Analysis failed: ${err.message}`;
                    }
                }
            }
            setError(message);
            setStep(ProcessStep.ERROR);
        }
    };
    
    const handleGenerateVideos = async () => {
        setStep(ProcessStep.GENERATING_VIDEOS);
        setError(null);
        const initialVideoData: GeneratedVideo[] = scenes.map(scene => ({
            scene,
            videoUrl: null,
            status: 'pending',
        }));
        setGeneratedVideos(initialVideoData);

        for (let i = 0; i < scenes.length; i++) {
            const scene = scenes[i];
            
            setGeneratedVideos(prev => prev.map((v, index) => index === i ? { ...v, status: 'generating' } : v));

            try {
                const operation = await generateVideo({ 
                    prompt: scene.visual_prompt, 
                    aspectRatio: '16:9' 
                });
                
                let currentOperation = operation;
                while (!currentOperation.done) {
                    await new Promise(resolve => setTimeout(resolve, 10000));
                    currentOperation = await getVideosOperation(currentOperation);
                }

                const url = currentOperation.response?.generatedVideos?.[0]?.video?.uri;
                if (url) {
                    const response = await fetch(`${url}&key=${process.env.API_KEY}`);
                    const blob = await response.blob();
                    const videoUrl = URL.createObjectURL(blob);
                    setGeneratedVideos(prev => prev.map((v, index) => index === i ? { ...v, status: 'done', videoUrl } : v));
                } else {
                    throw new Error("Video generation did not return a URL.");
                }
            } catch (err) {
                console.error(`Error generating video for scene ${i + 1}:`, err);
                let message = 'Failed to generate video.';
                if (err instanceof Error) {
                     if (err.message.includes("API key not valid")) {
                        message = 'API Key invalid. Please start over.';
                    } else if (err.message.includes("400")) {
                        message = "Invalid prompt for this scene.";
                    } else {
                        try {
                            const apiError = JSON.parse(err.message);
                            message = apiError?.error?.message || err.message;
                        } catch (e) {
                             message = err.message;
                        }
                    }
                }
                setGeneratedVideos(prev => prev.map((v, index) => index === i ? { ...v, status: 'error', errorMessage: message } : v));
                if (!error) { // Only set the general error for the first failure
                    setError(`An error occurred on Scene ${i + 1}. See details in the progress list.`);
                }
            }
        }
        setStep(ProcessStep.DONE);
    };

    const resetProcess = () => {
        setTranscript('');
        setStep(ProcessStep.IDLE);
        setScenes([]);
        setGeneratedVideos([]);
        setError(null);
    }

    return (
        <ApiKeySelector>
            <div className="max-w-5xl mx-auto p-8 bg-gray-800/50 rounded-lg shadow-2xl border border-gray-700">
                <h2 className="text-3xl font-bold text-center text-white mb-2">Podcast to Video Presentation</h2>
                <p className="text-center text-gray-400 mb-8">Transform audio transcripts into stunning visual stories, powered by Gemini Pro and Veo.</p>

                {step === ProcessStep.IDLE && (
                    <>
                        <p className="text-sm text-center text-yellow-300 bg-yellow-900/30 p-3 rounded-lg mb-6">
                            <strong>Note:</strong> This tool currently requires a text transcript. In the future, audio file uploads will be supported for automatic transcription.
                        </p>
                        <textarea
                            value={transcript}
                            onChange={(e) => setTranscript(e.target.value)}
                            rows={10}
                            className="w-full px-4 py-2 bg-gray-700 text-white border border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-cyan-500"
                            placeholder="Paste your podcast transcript here..."
                        />
                        <button onClick={handleAnalyze} className="mt-4 w-full px-6 py-3 bg-cyan-500 text-white font-semibold rounded-lg shadow-md hover:bg-cyan-600">
                            Analyze Transcript & Create Scenes
                        </button>
                    </>
                )}

                {step === ProcessStep.ANALYZING && <Spinner text="Analyzing transcript and crafting scenes..." />}

                {(step === ProcessStep.SCENES_READY || step === ProcessStep.GENERATING_VIDEOS || step === ProcessStep.DONE) && (
                     <div className="space-y-6">
                        <h3 className="text-2xl font-semibold text-center">Generated Scenes</h3>
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                            {scenes.map(scene => (
                                <div key={scene.scene_number} className="p-4 bg-gray-800 rounded-lg border border-gray-700">
                                    <h4 className="font-bold text-cyan-400">Scene {scene.scene_number}</h4>
                                    <p className="text-sm text-gray-300 mt-1"><strong className="text-gray-400">Narration:</strong> {scene.narration}</p>
                                    <p className="text-xs text-gray-400 mt-2"><strong className="text-gray-500">Visual Prompt:</strong> {scene.visual_prompt}</p>
                                </div>
                            ))}
                        </div>
                         {step === ProcessStep.SCENES_READY && (
                            <button onClick={handleGenerateVideos} className="w-full px-6 py-3 bg-green-500 text-white font-semibold rounded-lg shadow-md hover:bg-green-600">
                                Generate All Videos
                            </button>
                         )}
                    </div>
                )}
                
                {(step === ProcessStep.GENERATING_VIDEOS || step === ProcessStep.DONE) && (
                    <div className="mt-8">
                        <h3 className="text-2xl font-semibold text-center mb-4">Video Generation Progress</h3>
                        <div className="space-y-4">
                            {generatedVideos.map((video, index) => (
                                <div key={index} className="flex items-center p-4 bg-gray-800 rounded-lg gap-4">
                                    <div className="flex-1">
                                        <h4 className="font-bold text-cyan-400">Scene {video.scene.scene_number}</h4>
                                        <p className="text-sm text-gray-300">{video.scene.narration}</p>
                                    </div>
                                    <div className="w-48 flex-shrink-0">
                                        {video.status === 'pending' && (
                                            <div className="w-full aspect-video bg-gray-900/50 rounded-lg flex items-center justify-center border border-gray-700">
                                                <span className="text-gray-500 text-sm">Queued...</span>
                                            </div>
                                        )}
                                        {video.status === 'generating' && (
                                            <div className="w-full aspect-video bg-gray-900 rounded-lg flex flex-col items-center justify-center p-2 border border-cyan-500/30">
                                                <Spinner size="sm" />
                                                <p className="text-xs text-gray-400 mt-2 text-center leading-tight">"{video.scene.narration}"</p>
                                            </div>
                                        )}
                                        {video.status === 'done' && video.videoUrl && (
                                            <video src={video.videoUrl} className="w-full rounded-lg" controls muted loop autoPlay />
                                        )}
                                        {video.status === 'error' && (
                                            <div className="w-full aspect-video bg-red-900/20 rounded-lg flex flex-col items-center justify-center p-2 border border-red-500/50 text-center">
                                                <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-red-400 mb-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                                                </svg>
                                                <span className="text-red-400 text-xs">{video.errorMessage}</span>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                )}

                {(step === ProcessStep.DONE || step === ProcessStep.ERROR) && (
                    <button onClick={resetProcess} className="mt-8 w-full px-6 py-3 bg-gray-600 text-white font-semibold rounded-lg shadow-md hover:bg-gray-500">
                        Start Over
                    </button>
                )}
                
                {error && <p className="mt-6 text-red-400 text-center">{error}</p>}
            </div>
        </ApiKeySelector>
    );
};

export default PodcastToVideo;
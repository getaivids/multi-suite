import React, { useState } from 'react';
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
    const [copiedIndex, setCopiedIndex] = useState<number | null>(null);

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
                    await new Promise(resolve => setTimeout(resolve, 8000));
                    currentOperation = await getVideosOperation(currentOperation);
                }

                const apiKey = process.env.GEMINI_API_KEY || process.env.API_KEY || '';
                const rawUrl = currentOperation.response?.generatedVideos?.[0]?.video?.uri;
                if (rawUrl) {
                    const fetchUrl = apiKey ? `${rawUrl}&key=${apiKey}` : rawUrl;
                    const response = await fetch(fetchUrl);
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
                    message = err.message;
                }
                setGeneratedVideos(prev => prev.map((v, index) => index === i ? { ...v, status: 'error', errorMessage: message } : v));
                if (!error) {
                    setError(`An error occurred on Scene ${i + 1}. Details shown in scene list.`);
                }
            }
        }
        setStep(ProcessStep.DONE);
    };

    const copyToClipboard = (text: string, index: number) => {
        navigator.clipboard.writeText(text);
        setCopiedIndex(index);
        setTimeout(() => setCopiedIndex(null), 2000);
    };

    const resetProcess = () => {
        setTranscript('');
        setStep(ProcessStep.IDLE);
        setScenes([]);
        setGeneratedVideos([]);
        setError(null);
    };

    return (
        <div className="max-w-5xl mx-auto p-8 bg-zinc-900/80 rounded-2xl border border-zinc-800 shadow-2xl backdrop-blur-md">
            <div className="text-center mb-8">
                <span className="px-3 py-1 text-xs font-mono tracking-widest text-zinc-400 bg-zinc-800/80 border border-zinc-700/50 rounded-full uppercase">
                    Podcast to Video Presentation
                </span>
                <h2 className="text-3xl font-bold tracking-tight text-white mt-3 mb-2">
                    Transform Transcripts into Cinematic AI Videos
                </h2>
                <p className="text-sm text-zinc-400 max-w-xl mx-auto">
                    Turn raw podcast audio transcripts into key visual scenes, concise narrations, and complete AI video generation with Veo.
                </p>
            </div>

            {step === ProcessStep.IDLE && (
                <div className="space-y-4">
                    <textarea
                        value={transcript}
                        onChange={(e) => setTranscript(e.target.value)}
                        rows={10}
                        className="w-full px-4 py-3 bg-zinc-950 text-zinc-100 border border-zinc-800 rounded-xl focus:outline-none focus:border-zinc-500 transition-colors placeholder-zinc-600 font-mono text-sm leading-relaxed"
                        placeholder="Paste podcast transcript here..."
                    />
                    {error && <p className="text-xs text-red-400 font-mono text-center">{error}</p>}
                    <button
                        onClick={handleAnalyze}
                        className="w-full py-3.5 bg-white hover:bg-zinc-200 text-black font-medium text-sm rounded-xl transition-all shadow-sm active:scale-[0.99]"
                    >
                        Analyze Transcript & Generate Scenes
                    </button>
                </div>
            )}

            {step === ProcessStep.ANALYZING && (
                <div className="py-12 text-center">
                    <Spinner text="Analyzing transcript with Gemini Pro..." />
                </div>
            )}

            {(step === ProcessStep.SCENES_READY || step === ProcessStep.GENERATING_VIDEOS || step === ProcessStep.DONE) && (
                <div className="space-y-8">
                    <div className="flex flex-col sm:flex-row items-center justify-between gap-4 pb-4 border-b border-zinc-800">
                        <div>
                            <h3 className="text-xl font-semibold text-white tracking-tight">Storyboard & Video Scenes</h3>
                            <p className="text-xs text-zinc-400 mt-1">{scenes.length} key scenes synthesized from transcript</p>
                        </div>
                        <div className="flex items-center gap-3">
                            <button
                                onClick={resetProcess}
                                className="px-4 py-2 text-xs font-medium bg-zinc-800 text-zinc-300 hover:bg-zinc-700 hover:text-white border border-zinc-700 rounded-lg transition-colors"
                            >
                                Start Over
                            </button>
                            {step === ProcessStep.SCENES_READY && (
                                <button
                                    onClick={handleGenerateVideos}
                                    className="px-5 py-2 text-xs font-semibold bg-white text-black hover:bg-zinc-200 rounded-lg transition-all shadow-sm"
                                >
                                    Generate All Videos with Veo
                                </button>
                            )}
                        </div>
                    </div>

                    {step === ProcessStep.SCENES_READY && (
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                            {scenes.map((scene, idx) => (
                                <div key={scene.scene_number} className="p-5 bg-zinc-950 rounded-xl border border-zinc-800 flex flex-col justify-between">
                                    <div>
                                        <div className="flex items-center justify-between mb-3">
                                            <span className="px-2.5 py-0.5 text-xs font-mono font-medium bg-zinc-800 text-zinc-300 rounded border border-zinc-700">
                                                Scene {scene.scene_number}
                                            </span>
                                        </div>
                                        <div className="mb-4">
                                            <h5 className="text-[10px] font-mono uppercase tracking-wider text-zinc-500 mb-1">Narration</h5>
                                            <p className="text-xs text-zinc-200 leading-relaxed bg-zinc-900/60 p-3 rounded-lg border border-zinc-800">{scene.narration}</p>
                                        </div>
                                        <div>
                                            <h5 className="text-[10px] font-mono uppercase tracking-wider text-zinc-500 mb-1">Visual Prompt</h5>
                                            <p className="text-xs text-zinc-400 bg-zinc-900/80 p-3 rounded-lg border border-zinc-800 font-mono leading-relaxed">{scene.visual_prompt}</p>
                                        </div>
                                    </div>
                                    <button
                                        onClick={() => copyToClipboard(scene.visual_prompt, idx)}
                                        className="mt-4 w-full py-2 text-xs font-medium bg-zinc-800 hover:bg-zinc-700 text-zinc-300 rounded-lg transition-colors border border-zinc-700"
                                    >
                                        {copiedIndex === idx ? '✓ Prompt Copied' : 'Copy Prompt'}
                                    </button>
                                </div>
                            ))}
                        </div>
                    )}

                    {(step === ProcessStep.GENERATING_VIDEOS || step === ProcessStep.DONE) && (
                        <div className="space-y-4">
                            {generatedVideos.map((video, index) => (
                                <div key={index} className="flex flex-col md:flex-row items-stretch p-5 bg-zinc-950 rounded-xl border border-zinc-800 gap-6">
                                    <div className="flex-1 flex flex-col justify-between">
                                        <div>
                                            <div className="flex items-center gap-2 mb-2">
                                                <span className="px-2.5 py-0.5 text-xs font-mono font-medium bg-zinc-800 text-zinc-300 rounded border border-zinc-700">
                                                    Scene {video.scene.scene_number}
                                                </span>
                                            </div>
                                            <h5 className="text-[10px] font-mono uppercase tracking-wider text-zinc-500 mb-1">Narration</h5>
                                            <p className="text-sm text-zinc-200 leading-relaxed mb-3">{video.scene.narration}</p>
                                            <h5 className="text-[10px] font-mono uppercase tracking-wider text-zinc-500 mb-1">Prompt</h5>
                                            <p className="text-xs text-zinc-400 font-mono">{video.scene.visual_prompt}</p>
                                        </div>
                                    </div>
                                    <div className="w-full md:w-80 flex-shrink-0">
                                        {video.status === 'pending' && (
                                            <div className="w-full aspect-video bg-zinc-900 rounded-xl flex items-center justify-center border border-zinc-800">
                                                <span className="text-zinc-600 text-xs font-mono">Queued in pipeline...</span>
                                            </div>
                                        )}
                                        {video.status === 'generating' && (
                                            <div className="w-full aspect-video bg-zinc-900 rounded-xl flex flex-col items-center justify-center p-4 border border-zinc-700">
                                                <Spinner size="sm" text="Generating Veo Video..." />
                                            </div>
                                        )}
                                        {video.status === 'done' && video.videoUrl && (
                                            <video src={video.videoUrl} className="w-full aspect-video rounded-xl object-cover border border-zinc-700 shadow-md" controls muted loop autoPlay />
                                        )}
                                        {video.status === 'error' && (
                                            <div className="w-full aspect-video bg-zinc-900 rounded-xl flex flex-col items-center justify-center p-3 border border-red-900/50 text-center">
                                                <span className="text-red-400 text-xs font-mono">{video.errorMessage || 'Generation failed'}</span>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            )}

            {step === ProcessStep.ERROR && (
                <div className="text-center py-8 space-y-4">
                    {error && <p className="text-red-400 text-sm font-mono">{error}</p>}
                    <button
                        onClick={resetProcess}
                        className="px-6 py-2.5 bg-zinc-800 hover:bg-zinc-700 text-zinc-200 font-medium text-xs rounded-xl border border-zinc-700 transition-colors"
                    >
                        Try Again
                    </button>
                </div>
            )}
        </div>
    );
};

export default PodcastToVideo;

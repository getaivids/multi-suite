import React, { useState } from 'react';
import { generateVideo, getVideosOperation } from '../services/geminiService';
import Spinner from './common/Spinner';
import ApiKeySelector from './common/ApiKeySelector';
import type { Operation, VideosOperationResponse } from '@google/genai';

const POLLING_MESSAGES = [
    "Warming up the digital director's chair...",
    "Consulting with the muse of cinematography...",
    "Rendering pixels into a moving masterpiece...",
    "Applying the final touches of digital polish...",
    "The screening is about to begin...",
];

type AspectRatio = '16:9' | '9:16';

const VideoGenerator: React.FC = () => {
    const [prompt, setPrompt] = useState('A majestic cybernetic lion with a flowing mane of fiber-optic cables, roaring a spectrum of light in a futuristic city.');
    const [aspectRatio, setAspectRatio] = useState<AspectRatio>('16:9');
    const [imageFile, setImageFile] = useState<File | null>(null);
    const [imageBase64, setImageBase64] = useState<string | null>(null);
    const [duration, setDuration] = useState(5);
    const [fps, setFps] = useState(24);
    const [isLoading, setIsLoading] = useState(false);
    const [videoUrl, setVideoUrl] = useState<string | null>(null);
    const [error, setError] = useState<string | null>(null);
    const [pollingMessage, setPollingMessage] = useState('');

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            setImageFile(file);
            const reader = new FileReader();
            reader.onloadend = () => {
                setImageBase64((reader.result as string).split(',')[1]);
            };
            reader.readAsDataURL(file);
        }
    };

    const pollOperation = async (operation: Operation<VideosOperationResponse>) => {
        let currentOperation = operation;
        let messageIndex = 0;
    
        const intervalId = setInterval(() => {
            setPollingMessage(POLLING_MESSAGES[messageIndex]);
            messageIndex = (messageIndex + 1) % POLLING_MESSAGES.length;
        }, 5000);
    
        try {
            while (!currentOperation.done) {
                await new Promise(resolve => setTimeout(resolve, 10000));
                try {
                    currentOperation = await getVideosOperation(currentOperation);
                } catch (err: any) {
                    if (err.message.includes("Requested entity was not found.")) {
                        // This specific error often indicates an issue with the API key during polling.
                        throw new Error("API Key validation failed. Please refresh and select your key again.");
                    }
                    throw err; // re-throw other errors
                }
            }
            return currentOperation;
        } finally {
            clearInterval(intervalId);
        }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!prompt.trim()) {
            setError('Please enter a prompt.');
            return;
        }

        setIsLoading(true);
        setError(null);
        setVideoUrl(null);

        try {
            const imagePayload = imageFile && imageBase64 ? { imageBytes: imageBase64, mimeType: imageFile.type } : undefined;
            let initialOperation = await generateVideo({ 
                prompt, 
                aspectRatio, 
                image: imagePayload, 
                duration, 
                fps 
            });
            const finalOperation = await pollOperation(initialOperation);

            const url = finalOperation.response?.generatedVideos?.[0]?.video?.uri;
            if (url) {
                const response = await fetch(`${url}&key=${process.env.API_KEY}`);
                const blob = await response.blob();
                setVideoUrl(URL.createObjectURL(blob));
            } else {
                throw new Error("Video generation failed to produce a URL. The operation may have failed on the backend.");
            }
        } catch (err) {
            console.error("Video Generation Error:", err);
            let message = 'An error occurred during video generation. Please try again.';
            if (err instanceof Error) {
                if (err.message.includes("API Key validation failed")) {
                   message = err.message;
                } else if (err.message.includes("API key not valid")) {
                    message = "Your API Key is not valid. Please select a valid key and try again.";
                } else if (err.message.includes("400")) {
                    message = "The request was malformed. This could be due to an invalid prompt or an unsupported image format.";
                } else {
                   try {
                       const apiError = JSON.parse(err.message);
                       message = `An unexpected error occurred: ${apiError?.error?.message || err.message}`;
                   } catch (e) {
                       message = `An unexpected error occurred: ${err.message}`;
                   }
                }
            }
            setError(message);
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <ApiKeySelector>
            <div className="max-w-4xl mx-auto p-8 bg-gray-800/50 rounded-lg shadow-2xl border border-gray-700">
                <h2 className="text-3xl font-bold text-center text-white mb-2">Veo Video Generator</h2>
                <p className="text-center text-gray-400 mb-6">Create stunning videos from text or images.</p>

                <form onSubmit={handleSubmit} className="space-y-6">
                    <div>
                        <label htmlFor="prompt" className="block text-sm font-medium text-gray-300 mb-2">Prompt</label>
                        <textarea
                            id="prompt"
                            value={prompt}
                            onChange={(e) => setPrompt(e.target.value)}
                            rows={3}
                            className="w-full px-4 py-2 bg-gray-700 text-white border border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-cyan-500"
                            placeholder="e.g., A cinematic shot of a futuristic car driving on a rainbow road."
                        />
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div>
                            <label className="block text-sm font-medium text-gray-300 mb-2">Aspect Ratio</label>
                            <div className="flex space-x-4">
                                {(['16:9', '9:16'] as AspectRatio[]).map(ratio => (
                                    <button
                                        key={ratio}
                                        type="button"
                                        onClick={() => setAspectRatio(ratio)}
                                        className={`px-4 py-2 rounded-lg transition-colors ${aspectRatio === ratio ? 'bg-cyan-500 text-white' : 'bg-gray-700 hover:bg-gray-600'}`}
                                    >
                                        {ratio} {ratio === '16:9' ? '(Landscape)' : '(Portrait)'}
                                    </button>
                                ))}
                            </div>
                        </div>

                        <div>
                            <label htmlFor="image-upload" className="block text-sm font-medium text-gray-300 mb-2">Initial Image (Optional)</label>
                            <input
                                id="image-upload"
                                type="file"
                                accept="image/*"
                                onChange={handleFileChange}
                                className="w-full text-sm text-gray-400 file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-semibold file:bg-cyan-500 file:text-white hover:file:bg-cyan-600"
                            />
                             {imageFile && <p className="text-xs text-gray-500 mt-1">Selected: {imageFile.name}</p>}
                        </div>

                        <div>
                            <label htmlFor="duration" className="block text-sm font-medium text-gray-300 mb-2">Duration (seconds)</label>
                            <input
                                id="duration"
                                type="number"
                                value={duration}
                                onChange={(e) => setDuration(Number(e.target.value))}
                                min="1"
                                max="15"
                                className="w-full px-4 py-2 bg-gray-700 text-white border border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-cyan-500"
                            />
                        </div>

                        <div>
                            <label htmlFor="fps" className="block text-sm font-medium text-gray-300 mb-2">Frames Per Second (FPS)</label>
                             <input
                                id="fps"
                                type="number"
                                value={fps}
                                onChange={(e) => setFps(Number(e.target.value))}
                                min="10"
                                max="30"
                                className="w-full px-4 py-2 bg-gray-700 text-white border border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-cyan-500"
                            />
                        </div>
                    </div>

                    <button
                        type="submit"
                        disabled={isLoading}
                        className="w-full px-6 py-3 bg-cyan-500 text-white font-semibold rounded-lg shadow-md hover:bg-cyan-600 disabled:bg-gray-600 disabled:cursor-not-allowed transition-colors"
                    >
                        {isLoading ? 'Generating Video...' : 'Generate Video'}
                    </button>
                </form>

                {isLoading && (
                    <div className="mt-8 text-center">
                        <Spinner text={pollingMessage} />
                    </div>
                )}
                {error && <p className="mt-6 text-red-400 text-center">{error}</p>}
                
                {videoUrl && (
                    <div className="mt-8">
                        <h3 className="text-2xl font-bold text-center mb-4">Generated Video</h3>
                        <video controls autoPlay loop src={videoUrl} className="w-full max-w-2xl mx-auto rounded-lg shadow-lg" />
                    </div>
                )}
            </div>
        </ApiKeySelector>
    );
};

export default VideoGenerator;
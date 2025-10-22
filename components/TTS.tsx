import React, { useState, useRef } from 'react';
import { generateSpeech } from '../services/geminiService';
import { decode, decodeAudioData } from '../utils/audioUtils';
import Spinner from './common/Spinner';

const TTS: React.FC = () => {
    const [text, setText] = useState('Hello! I am a friendly AI assistant powered by Gemini. You can ask me to say anything you want.');
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const audioContextRef = useRef<AudioContext | null>(null);

    const handleGenerateSpeech = async () => {
        if (!text.trim()) {
            setError('Please enter some text to generate speech.');
            return;
        }

        setIsLoading(true);
        setError(null);

        try {
            if (!audioContextRef.current) {
                audioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: 24000 });
            }
            // Resume context on user gesture
            if (audioContextRef.current.state === 'suspended') {
                await audioContextRef.current.resume();
            }

            const base64Audio = await generateSpeech(text);

            if (base64Audio && audioContextRef.current) {
                const audioBytes = decode(base64Audio);
                const audioBuffer = await decodeAudioData(audioBytes, audioContextRef.current, 24000, 1);
                
                const source = audioContextRef.current.createBufferSource();
                source.buffer = audioBuffer;
                source.connect(audioContextRef.current.destination);
                source.start();
            } else {
                throw new Error("API returned empty audio data, the input text may be unsupported.");
            }
        } catch (err) {
            console.error("TTS Error:", err);
            let message = 'An error occurred while generating speech. Please try again.';
            if (err instanceof Error) {
                try {
                    const apiError = JSON.parse(err.message);
                    message = `Error: ${apiError?.error?.message || 'The API returned an unexpected response.'}`;
                } catch (e) {
                     message = `Error: ${err.message}`;
                }
            }
            setError(message);
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="max-w-2xl mx-auto p-8 bg-gray-800/50 rounded-lg shadow-2xl border border-gray-700">
            <h2 className="text-3xl font-bold text-center text-white mb-2">Text-to-Speech</h2>
            <p className="text-center text-gray-400 mb-6">Bring your text to life with a realistic AI voice.</p>
            
            <div className="space-y-4">
                <textarea
                    value={text}
                    onChange={(e) => setText(e.target.value)}
                    placeholder="Enter text here..."
                    rows={6}
                    className="w-full px-4 py-2 bg-gray-700 text-white border border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-cyan-500 disabled:opacity-50"
                    disabled={isLoading}
                />
                
                <button
                    onClick={handleGenerateSpeech}
                    disabled={isLoading}
                    className="w-full flex justify-center items-center px-6 py-3 bg-cyan-500 text-white font-semibold rounded-lg shadow-md hover:bg-cyan-600 disabled:bg-gray-600 disabled:cursor-not-allowed transition-colors"
                >
                    {isLoading ? <Spinner size="sm" /> : 'Generate Speech'}
                </button>
                
                {error && <p className="text-red-400 text-center mt-4">{error}</p>}
            </div>
        </div>
    );
};

export default TTS;
import React, { useState, useRef } from 'react';
import { generateSpeech } from '../services/geminiService';
import { decode, decodeAudioData } from '../utils/audioUtils';
import Spinner from './common/Spinner';

const TTS: React.FC = () => {
    const [text, setText] = useState('Hello! I am an AI voice model powered by Gemini. Enter any text to convert it into natural voice audio.');
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
                throw new Error("API returned empty audio data.");
            }
        } catch (err) {
            console.error("TTS Error:", err);
            let message = 'An error occurred while generating speech.';
            if (err instanceof Error) {
                message = `Error: ${err.message}`;
            }
            setError(message);
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="max-w-2xl mx-auto p-8 bg-zinc-900/80 rounded-2xl border border-zinc-800 shadow-2xl backdrop-blur-md">
            <div className="text-center mb-6">
                <span className="px-3 py-1 text-xs font-mono tracking-widest text-zinc-400 bg-zinc-800/80 border border-zinc-700/50 rounded-full uppercase">
                    Voice Synthesis
                </span>
                <h2 className="text-2xl font-bold tracking-tight text-white mt-3 mb-1">Text-to-Speech</h2>
                <p className="text-xs text-zinc-400">Natural voice narration generated directly from text.</p>
            </div>
            
            <div className="space-y-4">
                <textarea
                    value={text}
                    onChange={(e) => setText(e.target.value)}
                    placeholder="Enter text here..."
                    rows={6}
                    className="w-full px-4 py-3 bg-zinc-950 text-zinc-100 border border-zinc-800 rounded-xl focus:outline-none focus:border-zinc-500 transition-colors placeholder-zinc-600 text-sm leading-relaxed"
                    disabled={isLoading}
                />
                
                <button
                    onClick={handleGenerateSpeech}
                    disabled={isLoading}
                    className="w-full flex justify-center items-center py-3.5 bg-white text-black font-medium text-sm rounded-xl hover:bg-zinc-200 disabled:bg-zinc-800 disabled:text-zinc-500 disabled:cursor-not-allowed transition-all shadow-sm"
                >
                    {isLoading ? <Spinner size="sm" text="Generating speech..." /> : 'Generate Speech'}
                </button>
                
                {error && <p className="text-xs text-red-400 font-mono text-center">{error}</p>}
            </div>
        </div>
    );
};

export default TTS;

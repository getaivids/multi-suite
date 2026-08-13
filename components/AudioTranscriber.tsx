import React, { useState, useRef, useCallback } from 'react';
import { GoogleGenAI, LiveServerMessage, Modality } from '@google/genai';
import { encode } from '../utils/audioUtils';
import type { Blob } from "@google/genai";

const AudioTranscriber: React.FC = () => {
    const [isRecording, setIsRecording] = useState(false);
    const [transcription, setTranscription] = useState('');
    const [error, setError] = useState<string | null>(null);

    const finalTranscriptRef = useRef('');
    const sessionPromiseRef = useRef<Promise<any> | null>(null);
    const audioContextRef = useRef<AudioContext | null>(null);
    const scriptProcessorRef = useRef<ScriptProcessorNode | null>(null);
    const mediaStreamSourceRef = useRef<MediaStreamAudioSourceNode | null>(null);

    const stopRecording = useCallback(() => {
        if (sessionPromiseRef.current) {
            sessionPromiseRef.current.then(session => session.close());
            sessionPromiseRef.current = null;
        }
        if (scriptProcessorRef.current) {
            scriptProcessorRef.current.disconnect();
            scriptProcessorRef.current = null;
        }
        if (mediaStreamSourceRef.current) {
            mediaStreamSourceRef.current.disconnect();
            mediaStreamSourceRef.current = null;
        }
        if (audioContextRef.current && audioContextRef.current.state !== 'closed') {
            audioContextRef.current.close();
        }
        setIsRecording(false);
    }, []);

    const startRecording = async () => {
        setIsRecording(true);
        setError(null);
        setTranscription('');
        finalTranscriptRef.current = '';

        try {
            const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
            audioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: 16000 });
            
            const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY || process.env.API_KEY || '' });
            sessionPromiseRef.current = ai.live.connect({
                model: 'gemini-2.5-flash-native-audio-preview-09-2025',
                callbacks: {
                    onopen: () => {
                        console.log('Live session opened.');
                        mediaStreamSourceRef.current = audioContextRef.current!.createMediaStreamSource(stream);
                        scriptProcessorRef.current = audioContextRef.current!.createScriptProcessor(4096, 1, 1);
                        
                        scriptProcessorRef.current.onaudioprocess = (audioProcessingEvent) => {
                            const inputData = audioProcessingEvent.inputBuffer.getChannelData(0);
                            const pcmBlob: Blob = {
                                data: encode(new Uint8Array(new Int16Array(inputData.map(x => x * 32768)).buffer)),
                                mimeType: 'audio/pcm;rate=16000',
                            };
                            sessionPromiseRef.current?.then((session) => {
                                session.sendRealtimeInput({ media: pcmBlob });
                            });
                        };
                        
                        mediaStreamSourceRef.current.connect(scriptProcessorRef.current);
                        scriptProcessorRef.current.connect(audioContextRef.current.destination);
                    },
                    onmessage: (message: LiveServerMessage) => {
                        if (message.serverContent?.inputTranscription) {
                            const { text, isFinal } = message.serverContent.inputTranscription;
                             if (isFinal) {
                                finalTranscriptRef.current += text + ' ';
                                setTranscription(finalTranscriptRef.current);
                            } else {
                                setTranscription(finalTranscriptRef.current + text);
                            }
                        }
                    },
                    onerror: (e: ErrorEvent) => {
                        console.error('Live session error:', e);
                        setError(`Transcription service error: ${e.message || 'A connection error occurred.'}`);
                        stopRecording();
                    },
                    onclose: (e: CloseEvent) => {
                        console.log('Live session closed.');
                        stream.getTracks().forEach(track => track.stop());
                    },
                },
                config: {
                    responseModalities: [Modality.AUDIO],
                    inputAudioTranscription: {},
                    systemInstruction: 'You are a transcription service. Transcribe what the user says. Do not respond to them.'
                }
            });
        } catch (err) {
            console.error('Failed to start recording:', err);
            setError('Could not access microphone. Please grant permission and try again.');
            setIsRecording(false);
        }
    };

    return (
        <div className="max-w-3xl mx-auto p-8 bg-zinc-900/80 rounded-2xl border border-zinc-800 shadow-2xl backdrop-blur-md">
            <div className="text-center mb-6">
                <span className="px-3 py-1 text-xs font-mono tracking-widest text-zinc-400 bg-zinc-800/80 border border-zinc-700/50 rounded-full uppercase">
                    Live Audio Stream
                </span>
                <h2 className="text-2xl font-bold tracking-tight text-white mt-3 mb-1">Real-time Audio Transcription</h2>
                <p className="text-xs text-zinc-400">Stream audio live from your microphone for instant transcription.</p>
            </div>
            
            <div className="flex justify-center mb-6">
                <button
                    onClick={isRecording ? stopRecording : startRecording}
                    className={`px-8 py-3.5 font-medium text-sm rounded-xl transition-all duration-200 shadow-sm
                        ${isRecording 
                            ? 'bg-zinc-800 text-red-400 border border-red-900/60 animate-pulse hover:bg-zinc-700' 
                            : 'bg-white text-black hover:bg-zinc-200'}`}
                >
                    {isRecording ? '● Stop Recording' : 'Start Recording'}
                </button>
            </div>
            
            <div className="min-h-[200px] p-5 bg-zinc-950 rounded-xl border border-zinc-800">
                <p className="text-zinc-200 whitespace-pre-wrap font-mono text-xs leading-relaxed">
                    {transcription || <span className="text-zinc-600 italic">Audio transcript will appear here in real-time...</span>}
                </p>
            </div>

            {error && <p className="text-xs text-red-400 font-mono text-center mt-4">{error}</p>}
        </div>
    );
};

export default AudioTranscriber;

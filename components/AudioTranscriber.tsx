import React, { useState, useRef, useCallback } from 'react';
// FIX: Import Modality to use in the live session config.
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
            
            const ai = new GoogleGenAI({ apiKey: process.env.API_KEY || '' });
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
                        // FIX: Per guidelines, handle potential audio output even if not expected for transcription-only use cases.
                        if (message.serverContent?.modelTurn?.parts[0]?.inlineData.data) {
                          console.warn('Received unexpected audio output during transcription.');
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
                // FIX: Add required `responseModalities` and a `systemInstruction` to ensure the model only transcribes.
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
        <div className="max-w-3xl mx-auto p-8 bg-gray-800/50 rounded-lg shadow-2xl border border-gray-700">
            <h2 className="text-3xl font-bold text-center text-white mb-2">Real-time Audio Transcription</h2>
            <p className="text-center text-gray-400 mb-6">Click "Start Recording" and speak into your microphone.</p>
            
            <div className="flex justify-center mb-6">
                <button
                    onClick={isRecording ? stopRecording : startRecording}
                    className={`px-8 py-4 text-lg font-semibold rounded-full transition-all duration-300 ease-in-out focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-gray-900
                        ${isRecording 
                            ? 'bg-red-600 text-white hover:bg-red-700 focus:ring-red-500 animate-pulse' 
                            : 'bg-cyan-500 text-white hover:bg-cyan-600 focus:ring-cyan-500'}`}
                >
                    {isRecording ? 'Stop Recording' : 'Start Recording'}
                </button>
            </div>
            
            <div className="min-h-[200px] p-4 bg-gray-900 rounded-lg border border-gray-700">
                <p className="text-gray-300 whitespace-pre-wrap">
                    {transcription || <span className="text-gray-500">Waiting for audio...</span>}
                </p>
            </div>

            {error && <p className="text-red-400 text-center mt-4">{error}</p>}
        </div>
    );
};

export default AudioTranscriber;
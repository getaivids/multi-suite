import React, { useState, useEffect, useRef } from 'react';
import { createChatSession, sendMessageStream } from '../services/geminiService';
import type { ChatMessage } from '../types';
// FIX: Renamed `Chat` to `GeminiChat` to avoid naming collision with the component.
import type { Chat as GeminiChat } from '@google/genai';

const Chat: React.FC = () => {
    const [messages, setMessages] = useState<ChatMessage[]>([]);
    const [input, setInput] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    // FIX: Use the renamed `GeminiChat` type.
    const chatRef = useRef<GeminiChat | null>(null);
    const messagesEndRef = useRef<HTMLDivElement | null>(null);

    useEffect(() => {
        chatRef.current = createChatSession();
    }, []);

    useEffect(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [messages]);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!input.trim() || isLoading) return;

        const userMessage: ChatMessage = { role: 'user', text: input };
        setMessages(prev => [...prev, userMessage]);
        setInput('');
        setIsLoading(true);

        try {
            if (!chatRef.current) throw new Error("Chat session not initialized.");
            const stream = await sendMessageStream(chatRef.current, input);

            let modelResponse = '';
            setMessages(prev => [...prev, { role: 'model', text: '' }]);

            for await (const chunk of stream) {
                modelResponse += chunk.text;
                setMessages(prev => {
                    const newMessages = [...prev];
                    newMessages[newMessages.length - 1] = { role: 'model', text: modelResponse };
                    return newMessages;
                });
            }
        } catch (error) {
            console.error("Chat Error:", error);
            let errorMessage = "An unknown error occurred.";
            if (error instanceof Error) {
                 try {
                    const apiError = JSON.parse(error.message);
                    errorMessage = apiError?.error?.message || 'The API returned an unexpected response.';
                } catch (e) {
                    errorMessage = error.message;
                }
            }
            setMessages(prev => [...prev, { 
                role: 'model', 
                text: `Sorry, an error occurred: ${errorMessage}`,
                isError: true 
            }]);
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="flex flex-col h-[calc(100vh-12rem)] max-w-3xl mx-auto bg-gray-800/50 rounded-lg shadow-2xl border border-gray-700">
            <div className="flex-1 p-6 overflow-y-auto">
                <div className="space-y-4">
                    {messages.map((msg, index) => (
                        <div key={index} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                            <div className={`max-w-lg px-4 py-2 rounded-lg ${
                                msg.role === 'user' 
                                ? 'bg-cyan-600 text-white' 
                                : msg.isError
                                ? 'bg-red-900/50 text-red-300 border border-red-500/50'
                                : 'bg-gray-700 text-gray-200'
                            }`}>
                                <p className="whitespace-pre-wrap">{msg.text}</p>
                            </div>
                        </div>
                    ))}
                    <div ref={messagesEndRef} />
                </div>
            </div>
            <div className="p-4 border-t border-gray-700">
                <form onSubmit={handleSubmit} className="flex items-center space-x-4">
                    <input
                        type="text"
                        value={input}
                        onChange={(e) => setInput(e.target.value)}
                        placeholder="Ask Gemini anything..."
                        disabled={isLoading}
                        className="flex-1 px-4 py-2 bg-gray-700 text-white border border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-cyan-500"
                    />
                    <button type="submit" disabled={isLoading} className="px-6 py-2 bg-cyan-500 text-white font-semibold rounded-lg shadow-md hover:bg-cyan-600 disabled:bg-gray-600 disabled:cursor-not-allowed transition-colors">
                        {isLoading ? 'Thinking...' : 'Send'}
                    </button>
                </form>
            </div>
        </div>
    );
};

export default Chat;
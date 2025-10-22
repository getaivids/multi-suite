import { GoogleGenAI, Chat, GenerateContentResponse, Type, Operation, VideosOperationResponse, Modality } from "@google/genai";
import type { GenerateVideoParams } from '../types';

const ai = new GoogleGenAI({ apiKey: process.env.API_KEY || '' });

export const createChatSession = (): Chat => {
    return ai.chats.create({
        model: 'gemini-2.5-flash',
    });
};

export const sendMessageStream = async (chat: Chat, message: string) => {
    return await chat.sendMessageStream({ message });
};

export const generateSpeech = async (text: string): Promise<string | null> => {
    try {
        const response = await ai.models.generateContent({
            model: "gemini-2.5-flash-preview-tts",
            contents: [{ parts: [{ text }] }],
            config: {
                // FIX: Used Modality.AUDIO enum for type safety as per API guidelines.
                responseModalities: [Modality.AUDIO],
                speechConfig: {
                    voiceConfig: {
                        prebuiltVoiceConfig: { voiceName: 'Kore' },
                    },
                },
            },
        });
        return response.candidates?.[0]?.content?.parts?.[0]?.inlineData?.data ?? null;
    } catch (error) {
        console.error("Error generating speech:", error);
        throw error;
    }
};

export const generateVideo = async (params: GenerateVideoParams): Promise<Operation<VideosOperationResponse>> => {
    const { prompt, aspectRatio, image, duration, fps } = params;
    const getAi = () => new GoogleGenAI({ apiKey: process.env.API_KEY || '' });

    const config: any = {
        numberOfVideos: 1,
        resolution: '720p',
        aspectRatio: aspectRatio,
    };
    if (duration) config.duration = `${duration}s`;
    if (fps) config.fps = fps;

    const requestPayload: any = {
        model: 'veo-3.1-fast-generate-preview',
        prompt,
        config,
    };
    if (image) {
        requestPayload.image = image;
    }

    return await getAi().models.generateVideos(requestPayload);
};


export const getVideosOperation = async (operation: Operation<VideosOperationResponse>): Promise<Operation<VideosOperationResponse>> => {
    const getAi = () => new GoogleGenAI({ apiKey: process.env.API_KEY || '' });
    return await getAi().operations.getVideosOperation({ operation });
}

export const analyzePodcastTranscript = async (transcript: string): Promise<GenerateContentResponse> => {
    const prompt = `You are a visionary video producer. Your task is to transform the following podcast transcript into a compelling, short video presentation.
    
    Transcript:
    ---
    ${transcript}
    ---

    Instructions:
    1.  Analyze the transcript to identify the 3-5 most crucial key points or themes.
    2.  For each key point, write a short, impactful narration (1-2 sentences).
    3.  For each narration, create a detailed and visually stunning prompt for an AI video generator (like Veo). The prompt should describe a scene that is metaphorical, artistic, or a clear representation of the key point. Think in terms of cinematic shots, lighting, and mood.
    
    Your final output MUST be a JSON object that strictly follows the schema provided. Do not include any text outside of the JSON object.`;

    return await ai.models.generateContent({
        model: "gemini-2.5-pro",
        contents: prompt,
        config: {
            responseMimeType: "application/json",
            responseSchema: {
                type: Type.OBJECT,
                properties: {
                    scenes: {
                        type: Type.ARRAY,
                        items: {
                            type: Type.OBJECT,
                            properties: {
                                scene_number: { type: Type.INTEGER },
                                narration: { type: Type.STRING },
                                visual_prompt: { type: Type.STRING }
                            },
                            required: ["scene_number", "narration", "visual_prompt"]
                        }
                    }
                },
                required: ["scenes"]
            },
        },
    });
};
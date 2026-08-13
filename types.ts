export interface Scene {
    scene_number: number;
    narration: string;
    visual_prompt: string;
}

export interface GeneratedVideo {
    scene: Scene;
    videoUrl: string | null;
    status: 'pending' | 'generating' | 'done' | 'error';
    errorMessage?: string;
}

export interface GenerateVideoParams {
    prompt: string;
    aspectRatio: '16:9' | '9:16';
    image?: { imageBytes: string; mimeType: string };
    duration?: number;
    fps?: number;
}

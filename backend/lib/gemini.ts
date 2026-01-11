import { GoogleGenerativeAI } from "@google/generative-ai";
import { HfInference } from "@huggingface/inference";

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || "");

interface Character {
    name: string;
    description: string;
    personality?: string | null;
    secret?: string | null;
    exampleDialogs?: string | null;
    worldview?: {
        title: string;
        description: string;
    } | null;
}

interface Message {
    role: "user" | "model";
    parts: { text: string }[];
}

function buildSystemPrompt(character: Character, userName: string): string {
    let prompt = `You are ${character.name}. You must always stay in character and respond as ${character.name} would.

## Character Description
${character.description.replace(/\{\{user\}\}/g, userName).replace(/\{\{char\}\}/g, character.name)}
`;

    if (character.personality) {
        prompt += `
## Personality
${character.personality.replace(/\{\{user\}\}/g, userName).replace(/\{\{char\}\}/g, character.name)}
`;
    }

    if (character.secret) {
        prompt += `
## Secret Information (Never reveal directly, but act accordingly)
${character.secret.replace(/\{\{user\}\}/g, userName).replace(/\{\{char\}\}/g, character.name)}
`;
    }

    if (character.worldview) {
        prompt += `
## World Setting: ${character.worldview.title}
${character.worldview.description.replace(/\{\{user\}\}/g, userName).replace(/\{\{char\}\}/g, character.name)}
`;
    }

    if (character.exampleDialogs) {
        try {
            const examples = JSON.parse(character.exampleDialogs);
            if (Array.isArray(examples) && examples.length > 0) {
                prompt += `
## Example Dialogue Style
${examples.map((ex: { user: string; char: string }) => `User: ${ex.user}\n${character.name}: ${ex.char}`).join("\n\n")}
`;
            }
        } catch {
            // Invalid JSON, skip
        }
    }

    prompt += `
## Important Rules
- Always respond in the same language as the user's message
- Use actions in *asterisks* for physical descriptions
- Stay true to the character's personality and speaking style
- Never break character or reveal you are an AI
`;

    return prompt;
}

export async function generateCharacterResponse(
    character: Character,
    conversationHistory: { role: string; content: string }[],
    userMessage: string,
    userName: string = "User",
    modelName: string = "gemini-2.5-flash"
): Promise<string> {
    const model = genAI.getGenerativeModel({
        model: modelName,
        systemInstruction: buildSystemPrompt(character, userName),
    });

    const history: Message[] = conversationHistory.map((msg) => ({
        role: msg.role === "USER" ? "user" : "model",
        parts: [{ text: msg.content }],
    }));

    const chat = model.startChat({ history });

    const result = await chat.sendMessage(userMessage);
    const response = await result.response;
    return response.text();
}

export async function generateCharacterResponseStream(
    character: Character,
    conversationHistory: { role: string; content: string }[],
    userMessage: string,
    userName: string = "User",
    modelName: string = "gemini-2.5-flash"
): Promise<AsyncIterable<string>> {
    const model = genAI.getGenerativeModel({
        model: modelName,
        systemInstruction: buildSystemPrompt(character, userName),
    });

    const history: Message[] = conversationHistory.map((msg) => ({
        role: msg.role === "USER" ? "user" : "model",
        parts: [{ text: msg.content }],
    }));

    const chat = model.startChat({ history });

    const result = await chat.sendMessageStream(userMessage);

    async function* streamText() {
        for await (const chunk of result.stream) {
            const text = chunk.text();
            if (text) {
                yield text;
            }
        }
    }

    return streamText();
}

export async function generateImagePrompt(
    character: Character,
    history: { role: string; content: string }[],
    modelName: string = "gemini-2.5-flash"
): Promise<string> {
    const model = genAI.getGenerativeModel({ model: modelName });

    // Construct context
    const recentHistory = history.slice(-5); // Use last 5 messages
    const context = recentHistory.map(m => `${m.role === 'USER' ? 'User' : character.name}: ${m.content}`).join('\n');

    const prompt = `
    Based on the following conversation between User and ${character.name}, describe a visual scene that represents the current moment or the latest action.
    
    Character Description: ${character.description}
    ${character.personality ? `Personality: ${character.personality}` : ''}
    
    Conversation:
    ${context}
    
    Create a highly detailed image generation prompt for an anime/manhwa style illustration.
    Focus on the character's pose, facial expression, and immediate surroundings based on the last message.
    The character should look attractive and the mood should match the conversation.
    
    Keywords to include: "best quality", "masterpiece", "high resolution", "anime style", "manhwa style", "romance fantasy", "detailed eyes", "beautiful lighting".
    
    Start with the character's physical description, then the pose and action.
    Do not include "The image shows" or similar phrases. Just the description.
    `;

    const result = await model.generateContent(prompt);
    const response = await result.response;
    return response.text();
}

export async function generateImage(prompt: string): Promise<ArrayBuffer> {
    if (process.env.HUGGING_FACE_TOKEN) {
        try {
            return await generateImageWithHuggingFace(prompt);
        } catch (e) {
            console.error("HuggingFace generation failed, falling back to Pollinations:", e);
        }
    } else {
        console.log("No HUGGING_FACE_TOKEN found, using Pollinations.");
    }
    return await generateImageWithPollinations(prompt);
}

async function generateImageWithHuggingFace(prompt: string): Promise<ArrayBuffer> {
    const HUGGING_FACE_TOKEN = process.env.HUGGING_FACE_TOKEN;

    if (!HUGGING_FACE_TOKEN) {
        throw new Error("HUGGING_FACE_TOKEN not found");
    }

    const hf = new HfInference(HUGGING_FACE_TOKEN);

    try {
        // Use HuggingFace SDK with automatic provider selection (free tier)
        // Do NOT specify provider - let HuggingFace choose the best one
        const result: any = await hf.textToImage({
            model: "black-forest-labs/FLUX.1-dev",
            inputs: prompt
        });

        // SDK v4 may return Blob or have arrayBuffer method
        if (result && typeof result.arrayBuffer === 'function') {
            return await result.arrayBuffer();
        }

        throw new Error('Unexpected response type from HuggingFace SDK');
    } catch (error: any) {
        console.error('HuggingFace SDK error:', error);
        throw new Error(`HF Error: ${error.message || error}`);
    }
}

async function generateImageWithPollinations(prompt: string): Promise<ArrayBuffer> {
    const imageUrl = `https://image.pollinations.ai/prompt/${encodeURIComponent(prompt)}?width=512&height=512&nologo=true&seed=${Math.floor(Math.random() * 10000)}`;
    const response = await fetch(imageUrl);
    if (!response.ok) throw new Error(`Pollinations Error: ${response.statusText}`);
    return await response.arrayBuffer();
}

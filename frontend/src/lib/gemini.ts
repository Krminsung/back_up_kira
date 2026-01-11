import { GoogleGenerativeAI } from "@google/generative-ai";

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

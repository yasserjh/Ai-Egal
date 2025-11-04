/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
*/
import { GoogleGenAI, Modality } from "@google/genai";
import type { GenerateContentResponse } from "@google/genai";

const API_KEY = process.env.API_KEY;

if (!API_KEY) {  
  throw new Error("API_KEY environment variable is not set");
}

const ai = new GoogleGenAI({ apiKey: API_KEY });


/**
 * Processes the Gemini API response, extracting the image or throwing an error if none is found.
 * @param response The response from the generateContent call.
 * @returns A data URL string for the generated image.
 */
function processGeminiResponse(response: GenerateContentResponse): string {
    // Check for a block prompt response first.
    if (response.candidates?.[0]?.finishReason === 'SAFETY') {
        throw new Error("The request was blocked due to safety concerns. Please try a different photo.");
    }

    const imagePartFromResponse = response.candidates?.[0]?.content?.parts?.find(part => part.inlineData);

    if (imagePartFromResponse?.inlineData) {
        const { mimeType, data } = imagePartFromResponse.inlineData;
        if (!mimeType.startsWith('image/')) {
             throw new Error(`Expected an image but received MIME type: ${mimeType}`);
        }
        return `data:${mimeType};base64,${data}`;
    }

    const textResponse = response.text;
    console.error("API did not return an image. Response:", textResponse, response);
    // Handle specific error messages from the model if possible
    if (textResponse?.toLowerCase().includes("could not find a face")) {
        throw new Error("No clear face was detected in the uploaded image. Please use a well-lit portrait.");
    }
    throw new Error(`The AI model responded with text instead of an image: "${textResponse || 'No text response received.'}"`);
}

/**
 * A wrapper for the Gemini API call that includes a retry mechanism for internal server errors.
 * @param imagePart The image part of the request payload.
 * @param textPart The text part of the request payload.
 * @returns The GenerateContentResponse from the API.
 */
async function callGeminiWithRetry(imagePart: object, textPart: object): Promise<GenerateContentResponse> {
    const maxRetries = 3;
    const initialDelay = 1000;

    for (let attempt = 1; attempt <= maxRetries; attempt++) {
        try {
            return await ai.models.generateContent({
                model: 'gemini-2.5-flash-image',
                contents: { parts: [imagePart, textPart] },
                config: {
                    responseModalities: [Modality.IMAGE],
                },
            });
        } catch (error) {
            console.error(`Error calling Gemini API (Attempt ${attempt}/${maxRetries}):`, error);
            const errorMessage = error instanceof Error ? error.message : JSON.stringify(error);
            const isInternalError = errorMessage.includes('"code":500') || errorMessage.includes('INTERNAL');

            if (isInternalError && attempt < maxRetries) {
                const delay = initialDelay * Math.pow(2, attempt - 1);
                console.log(`Internal error detected. Retrying in ${delay}ms...`);
                await new Promise(resolve => setTimeout(resolve, delay));
                continue;
            }
            // If the error contains a user-facing message, extract and throw it.
            try {
                const parsedError = JSON.parse(errorMessage);
                if (parsedError.message) {
                    throw new Error(parsedError.message);
                }
            } catch (e) {
                // Not a JSON error, fall through and throw original.
            }

            throw error;
        }
    }
    throw new Error("Gemini API call failed after all retries.");
}


/**
 * Generates a professional headshot based on a source image and a style configuration.
 * @param imageDataUrl A data URL string of the source image.
 * @param style An object containing style and background descriptions.
 * @returns A promise that resolves to a base64-encoded image data URL of the generated image.
 */
export async function generateHeadshot(imageDataUrl: string, style: { styleDescription: string; backgroundDescription: string }): Promise<string> {
  const match = imageDataUrl.match(/^data:(image\/\w+);base64,(.*)$/);
  if (!match) {
    throw new Error("Invalid image data URL format. Expected 'data:image/...;base64,...'");
  }
  const [, mimeType, base64Data] = match;

    const imagePart = {
        inlineData: { mimeType, data: base64Data },
    };

    const prompt = `An ultra-realistic, cinematic corporate headshot of the person in the photo. Preserve their exact face, features, and skin tone. Dress them in ${style.styleDescription}. The background should be ${style.backgroundDescription}. The attire must be authentic Saudi style. The final image should be high-resolution, studio-quality, with professional skin cleanup, sharp facial details, soft shadows, and clean edges.`;

    const textPart = { text: prompt };

    try {
        const response = await callGeminiWithRetry(imagePart, textPart);
        return processGeminiResponse(response);
    } catch (error) {
        console.error("An unrecoverable error occurred during image generation.", error);
        const errorMessage = error instanceof Error ? error.message : String(error);
        throw new Error(`The AI model failed to generate an image. Details: ${errorMessage}`);
    }
}
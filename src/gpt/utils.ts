import { OpenAIApi } from "openai";
import { ChatMessageType } from "../bot/types";
import { OPENAI_MODEL } from "./const";

export const getAICompletion = async (openai: OpenAIApi, messages: ChatMessageType[]): Promise<string> => {
  try {
    let completion = await openai.createChatCompletion({
      model: OPENAI_MODEL!,
      messages: messages.map((m) => ({
        role: m.role,
        content: m.content,
      })),
    });
    console.log('data', completion!.data);
    return completion!.data!.choices[0].message!.content;
  } catch (error) {
    // @ts-ignore
    console.error(error, error!.response!.data);
    return '';
  }
};

export const getMessages = (completionText: string): string[] => {
  return completionText.split('\n').filter(Boolean);
};

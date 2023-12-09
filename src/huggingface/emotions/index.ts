// import fetch from 'node-fetch';
import axios from 'axios';

const API_URL = 'https://api-inference.huggingface.co/models/MaxKazak/ruBert-base-russian-emotion-detection';

export const getMessageEmotions = async (messages: string[]): Promise<{
  label: "disgust" | "neutral" | "anger" | "interest" | "fear" | "sadness" | "surpise" | "joy" | "guilt",
  score: number
}[][]> => {
  const response = await axios({
    method: 'post',
    url: API_URL,
    data: { inputs: messages },
  });
  console.log('response', response);

  return response.data as unknown as {
      label: "disgust" | "neutral" | "anger" | "interest" | "fear" | "sadness" | "surpise" | "joy" | "guilt",
      score: number
    }[][];
};

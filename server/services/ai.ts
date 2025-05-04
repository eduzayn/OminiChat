import OpenAI from "openai";

// the newest OpenAI model is "gpt-4o" which was released May 13, 2024. do not change this unless explicitly requested by the user
const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

/**
 * Gera uma resposta usando o modelo GPT-4o da OpenAI
 * @param prompt O texto do prompt a ser enviado para a IA
 * @param conversationHistory Histórico opcional da conversa para contexto
 * @returns A resposta gerada pela IA
 */
export async function generateAIResponse(prompt: string, conversationHistory?: string): Promise<string> {
  try {
    // Construir o contexto da conversa, se disponível
    let systemPrompt = "Você é um assistente virtual de atendimento ao cliente profissional e prestativo.";
    
    if (conversationHistory) {
      systemPrompt += " Aqui está o histórico da conversa anterior: " + conversationHistory;
    }

    const response = await openai.chat.completions.create({
      model: "gpt-4o",
      messages: [
        {
          role: "system",
          content: systemPrompt
        },
        {
          role: "user",
          content: prompt
        }
      ],
      temperature: 0.7,
      max_tokens: 300
    });

    return response.choices[0].message.content || "Não foi possível gerar uma resposta.";
  } catch (error) {
    console.error("Erro ao gerar resposta de IA:", error);
    return "Ocorreu um erro ao processar sua solicitação. Por favor, tente novamente mais tarde.";
  }
}

/**
 * Analisa o sentimento de um texto
 * @param text O texto a ser analisado
 * @returns Objeto contendo a polaridade do sentimento e confiança
 */
export async function analyzeSentiment(text: string): Promise<{
  sentiment: "positive" | "neutral" | "negative";
  score: number;
  confidence: number;
}> {
  try {
    const response = await openai.chat.completions.create({
      model: "gpt-4o",
      messages: [
        {
          role: "system",
          content: 
            "Analise o sentimento do texto a seguir e retorne um objeto JSON com: sentiment (positive, neutral, negative), score (de -1 a 1) e confidence (de 0 a 1)."
        },
        {
          role: "user",
          content: text
        }
      ],
      response_format: { type: "json_object" }
    });

    const result = JSON.parse(response.choices[0].message.content);

    return {
      sentiment: result.sentiment,
      score: parseFloat(result.score) || 0,
      confidence: parseFloat(result.confidence) || 0.5
    };
  } catch (error) {
    console.error("Erro ao analisar sentimento:", error);
    return {
      sentiment: "neutral",
      score: 0,
      confidence: 0
    };
  }
}

/**
 * Gera uma resposta rápida baseada em um tipo de resposta pré-definido
 * @param type O tipo de resposta a ser gerada (concise, summary, etc)
 * @param messageContent O conteúdo da mensagem atual a ser processada
 * @param conversationHistory O histórico da conversa para contexto
 * @returns A resposta gerada
 */
export async function generateQuickResponse(
  type: "concise" | "summary" | "correction",
  messageContent: string,
  conversationHistory?: string
): Promise<string> {
  let prompt = "";
  
  switch (type) {
    case "concise":
      prompt = `Responda a seguinte mensagem de forma concisa e profissional: "${messageContent}"`;
      break;
    case "summary":
      if (!conversationHistory) {
        return "É necessário fornecer o histórico da conversa para gerar um resumo.";
      }
      prompt = `Resuma os principais pontos da seguinte conversa:\n${conversationHistory}\n\nFoque em extrair informações úteis como nome, problema principal, dados fornecidos e próximos passos.`;
      break;
    case "correction":
      prompt = `Corrija os erros gramaticais, melhore a clareza e reformule o seguinte texto mantendo o significado original: "${messageContent}"`;
      break;
    default:
      return "Tipo de resposta rápida não suportado.";
  }
  
  return generateAIResponse(prompt, conversationHistory);
}
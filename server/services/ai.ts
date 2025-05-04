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
  type: "concise" | "summary" | "correction" | "auto",
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
    case "auto":
      prompt = `Você é um assistente de atendimento profissional. Gere uma resposta automática para a seguinte mensagem do cliente. Seja prestativo, direto e amigável, mas não excessivamente formal: "${messageContent}"`;
      if (conversationHistory) {
        prompt += `\n\nHistórico da conversa:\n${conversationHistory}`;
      }
      break;
    default:
      return "Tipo de resposta rápida não suportado.";
  }
  
  return generateAIResponse(prompt, conversationHistory);
}

/**
 * Verifica se uma mensagem deve receber resposta automática
 * @param message Conteúdo da mensagem
 * @param conversationHistory Histórico da conversa
 * @returns Objeto com flag indicando se deve responder e a resposta sugerida
 */
export async function shouldAutoReply(
  message: string, 
  conversationHistory?: string
): Promise<{
  shouldReply: boolean;
  suggestedReply?: string;
  confidence: number;
}> {
  try {
    const prompt = `
Analise a mensagem abaixo e determine se deve receber uma resposta automática.
Considere os seguintes critérios:
- A mensagem contém uma pergunta clara e simples?
- A mensagem parece solicitar informações básicas?
- A mensagem pode ser respondida sem intervenção humana?
- A mensagem não demonstra frustração ou raiva extrema?
- A mensagem não menciona problemas complexos que precisam de investigação?

Mensagem: "${message}"
${conversationHistory ? `\nHistórico da conversa:\n${conversationHistory}` : ''}

Responda APENAS com um objeto JSON contendo:
- shouldReply: boolean (true se você acredita que a mensagem deve receber resposta automática)
- confidence: número de 0 a 1 (sua confiança na decisão)
- reason: string curta explicando sua decisão
`;

    const response = await openai.chat.completions.create({
      model: "gpt-4o",
      messages: [
        {
          role: "system",
          content: "Você é um analisador de mensagens especializado em determinar se uma mensagem precisa de intervenção humana ou pode ser respondida automaticamente."
        },
        {
          role: "user",
          content: prompt
        }
      ],
      response_format: { type: "json_object" },
      temperature: 0.3
    });

    const result = JSON.parse(response.choices[0].message.content);
    
    // Se deve responder automaticamente, gerar resposta sugerida
    let suggestedReply: string | undefined = undefined;
    if (result.shouldReply) {
      suggestedReply = await generateQuickResponse("auto", message, conversationHistory);
    }
    
    return {
      shouldReply: result.shouldReply,
      suggestedReply,
      confidence: parseFloat(result.confidence) || 0.5
    };
  } catch (error) {
    console.error("Erro ao analisar necessidade de resposta automática:", error);
    return {
      shouldReply: false,
      confidence: 0
    };
  }
}
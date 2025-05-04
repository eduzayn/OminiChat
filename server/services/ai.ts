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
 * Analisa o sentimento de um texto, com detecção avançada de estados emocionais
 * @param text O texto a ser analisado
 * @returns Objeto contendo a análise detalhada do sentimento e estado emocional
 */
export async function analyzeSentiment(text: string): Promise<{
  sentiment: "positive" | "neutral" | "negative";
  score: number;
  confidence: number;
  emotions: {
    anger: number;
    frustration: number;
    impatience: number;
    urgency: number;
  };
  needsHumanIntervention: boolean;
  interventionReason?: string;
}> {
  try {
    const prompt = `
Analise o sentimento e tom emocional desta mensagem e forneça uma análise detalhada.

Texto: "${text}"

Responda com um objeto JSON contendo:
- sentiment: "positive", "neutral" ou "negative"
- score: número entre -1 (muito negativo) e 1 (muito positivo)
- confidence: número entre 0 e 1 indicando sua confiança na análise
- emotions: objeto com pontuações de 0 a 10 para:
  - anger: nível de raiva
  - frustration: nível de frustração
  - impatience: nível de impaciência
  - urgency: nível de urgência
- needsHumanIntervention: boolean (true se você acredita que um humano deve responder)
- interventionReason: string curta explicando por que precisa de intervenção humana (se needsHumanIntervention for true)
`;

    const response = await openai.chat.completions.create({
      model: "gpt-4o",
      messages: [
        {
          role: "system",
          content: "Você é um analisador de sentimento especializado em detectar emoções e tom em mensagens de atendimento ao cliente."
        },
        {
          role: "user",
          content: prompt
        }
      ],
      response_format: { type: "json_object" },
      temperature: 0.3
    });

    const result = JSON.parse(response.choices[0].message.content || "{}");

    return {
      sentiment: result.sentiment || "neutral",
      score: parseFloat(result.score) || 0,
      confidence: parseFloat(result.confidence) || 0.5,
      emotions: {
        anger: parseFloat(result.emotions?.anger) || 0,
        frustration: parseFloat(result.emotions?.frustration) || 0,
        impatience: parseFloat(result.emotions?.impatience) || 0,
        urgency: parseFloat(result.emotions?.urgency) || 0
      },
      needsHumanIntervention: result.needsHumanIntervention || false,
      interventionReason: result.interventionReason
    };
  } catch (error) {
    console.error("Erro ao analisar sentimento:", error);
    return {
      sentiment: "neutral",
      score: 0,
      confidence: 0,
      emotions: {
        anger: 0,
        frustration: 0,
        impatience: 0,
        urgency: 0
      },
      needsHumanIntervention: false
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
  sentimentAnalysis?: {
    sentiment: "positive" | "neutral" | "negative";
    score: number;
    emotions: {
      anger: number;
      frustration: number;
      impatience: number;
      urgency: number;
    };
    needsHumanIntervention: boolean;
    interventionReason?: string;
  }
}> {
  try {
    // Primeiro fazer análise de sentimento para detectar se há necessidade de intervenção humana
    const sentimentAnalysis = await analyzeSentiment(message);
    
    // Se a análise de sentimento indica que precisa de intervenção humana, não responder automaticamente
    if (sentimentAnalysis.needsHumanIntervention || 
        sentimentAnalysis.emotions.anger > 6 || 
        sentimentAnalysis.emotions.frustration > 7) {
      return {
        shouldReply: false,
        confidence: sentimentAnalysis.confidence,
        sentimentAnalysis
      };
    }
    
    // Se o sentimento é muito negativo, também não responder automaticamente
    if (sentimentAnalysis.sentiment === "negative" && sentimentAnalysis.score < -0.6) {
      return {
        shouldReply: false,
        confidence: sentimentAnalysis.confidence,
        sentimentAnalysis
      };
    }
    
    // Se passou pela análise de sentimento, fazer uma análise adicional de complexidade e tipo da mensagem
    const prompt = `
Analise a mensagem abaixo e determine se deve receber uma resposta automática.
Considere os seguintes critérios:
- A mensagem contém uma pergunta clara e simples?
- A mensagem parece solicitar informações básicas?
- A mensagem pode ser respondida sem intervenção humana?
- A mensagem não menciona problemas complexos que precisam de investigação?
- A mensagem não requer acesso a sistemas ou informações específicas do cliente?

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

    const result = JSON.parse(response.choices[0].message.content || "{}");
    
    // Se deve responder automaticamente, gerar resposta sugerida
    let suggestedReply: string | undefined = undefined;
    if (result.shouldReply) {
      suggestedReply = await generateQuickResponse("auto", message, conversationHistory);
    }
    
    return {
      shouldReply: result.shouldReply || false,
      suggestedReply,
      confidence: parseFloat(result.confidence) || 0.5,
      sentimentAnalysis
    };
  } catch (error) {
    console.error("Erro ao analisar necessidade de resposta automática:", error);
    return {
      shouldReply: false,
      confidence: 0
    };
  }
}
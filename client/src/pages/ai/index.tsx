import React, { useState } from "react";
import { Helmet } from "react-helmet";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs";
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { apiRequest } from "@/lib/queryClient";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useToast } from "@/hooks/use-toast";
import { 
  Brain, 
  MessageSquare, 
  Sparkles, 
  AlertTriangle, 
  Gauge, 
  BarChart, 
  Settings, 
  MessageCircleMore
} from "lucide-react";

// Importando componentes de layout
import Sidebar from "@/components/sidebar";

// Schema de validação para o formulário de teste de sentimento
const sentimentAnalysisSchema = z.object({
  text: z.string().min(5, "Digite pelo menos 5 caracteres para análise")
});

// Schema de validação para configurações da IA
const aiSettingsSchema = z.object({
  autoReplyEnabled: z.boolean().default(true),
  sentimentThreshold: z.number().min(0).max(10).default(7),
  confidenceThreshold: z.number().min(0).max(1).step(0.1).default(0.7),
  autoAssignToBot: z.boolean().default(true),
  escalateNegative: z.boolean().default(true)
});

type SentimentAnalysisForm = z.infer<typeof sentimentAnalysisSchema>;
type AISettingsForm = z.infer<typeof aiSettingsSchema>;

function AIAssistantPage() {
  const { toast } = useToast();
  const [sentimentResult, setSentimentResult] = useState<any>(null);
  const [autoReplyResult, setAutoReplyResult] = useState<any>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [isTestingAutoReply, setIsTestingAutoReply] = useState(false);

  // Formulário para análise de sentimento
  const sentimentForm = useForm<SentimentAnalysisForm>({
    resolver: zodResolver(sentimentAnalysisSchema),
    defaultValues: {
      text: ""
    }
  });

  // Formulário para configurações da IA
  const settingsForm = useForm<AISettingsForm>({
    resolver: zodResolver(aiSettingsSchema),
    defaultValues: {
      autoReplyEnabled: true,
      sentimentThreshold: 7,
      confidenceThreshold: 0.7,
      autoAssignToBot: true,
      escalateNegative: true
    }
  });

  // Analisar sentimento
  const analyzeSentiment = async (data: SentimentAnalysisForm) => {
    setIsAnalyzing(true);
    setSentimentResult(null);
    
    try {
      const response = await apiRequest("/api/ai/analyze-sentiment", {
        method: "POST",
        body: JSON.stringify({ text: data.text })
      });
      
      setSentimentResult(response);
      toast({
        title: "Análise completada",
        description: "A análise de sentimento foi realizada com sucesso."
      });
    } catch (error) {
      console.error("Erro ao analisar sentimento:", error);
      toast({
        title: "Erro",
        description: "Não foi possível realizar a análise de sentimento.",
        variant: "destructive"
      });
    } finally {
      setIsAnalyzing(false);
    }
  };

  // Testar resposta automática
  const testAutoReply = async (data: SentimentAnalysisForm) => {
    setIsTestingAutoReply(true);
    setAutoReplyResult(null);
    
    try {
      const response = await apiRequest("/api/ai/auto-reply-test", {
        method: "POST",
        body: JSON.stringify({ message: data.text })
      });
      
      setAutoReplyResult(response);
      toast({
        title: "Teste completado",
        description: "O teste de resposta automática foi realizado com sucesso."
      });
    } catch (error) {
      console.error("Erro ao testar resposta automática:", error);
      toast({
        title: "Erro",
        description: "Não foi possível testar a resposta automática.",
        variant: "destructive"
      });
    } finally {
      setIsTestingAutoReply(false);
    }
  };

  // Salvar configurações
  const saveSettings = async (data: AISettingsForm) => {
    try {
      await apiRequest("/api/ai/settings", {
        method: "POST",
        body: JSON.stringify(data)
      });
      
      toast({
        title: "Configurações salvas",
        description: "As configurações da IA foram atualizadas com sucesso."
      });
    } catch (error) {
      console.error("Erro ao salvar configurações:", error);
      toast({
        title: "Erro",
        description: "Não foi possível salvar as configurações.",
        variant: "destructive"
      });
    }
  };

  // Renderizar indicador de emoção
  const renderEmotionIndicator = (value: number, label: string) => {
    let color = "bg-green-500";
    if (value > 7) {
      color = "bg-red-500";
    } else if (value > 4) {
      color = "bg-yellow-500";
    }
    
    return (
      <div className="flex flex-col items-center mb-3">
        <span className="text-sm font-medium mb-1">{label}</span>
        <div className="w-full h-3 bg-gray-200 rounded-full">
          <div 
            className={`h-full rounded-full ${color}`} 
            style={{ width: `${value * 10}%` }}
          ></div>
        </div>
        <span className="text-sm text-gray-500 mt-1">{value.toFixed(1)}/10</span>
      </div>
    );
  };

  return (
    <>
      <Helmet>
        <title>Assistente IA | OmniConnect</title>
      </Helmet>
      
      <div className="flex h-screen overflow-hidden">
        <Sidebar />
        <div className="flex-1 overflow-y-auto p-6">
          <div className="flex items-center mb-6">
            <Brain className="mr-2 h-6 w-6 text-primary" />
            <h1 className="text-2xl font-bold">Assistente IA</h1>
          </div>
        
        <p className="text-gray-600 mb-8">
          O módulo de IA está sendo desenvolvido para fornecer suporte por inteligência artificial em todo o sistema,
          incluindo análise de sentimento, respostas automáticas e sugestões de mensagens.
        </p>
        
        <Tabs defaultValue="demo" className="w-full">
          <TabsList className="grid grid-cols-3 w-full max-w-2xl mb-6">
            <TabsTrigger value="demo">
              <MessageSquare className="mr-2 h-4 w-4" />
              Demonstração
            </TabsTrigger>
            <TabsTrigger value="settings">
              <Settings className="mr-2 h-4 w-4" />
              Configurações
            </TabsTrigger>
            <TabsTrigger value="metrics">
              <BarChart className="mr-2 h-4 w-4" />
              Métricas
            </TabsTrigger>
          </TabsList>
          
          {/* Aba de Demonstração */}
          <TabsContent value="demo" className="space-y-6">
            <div className="grid gap-6 md:grid-cols-2">
              {/* Card para testar análise de sentimento */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center">
                    <Gauge className="mr-2 h-5 w-5 text-primary" />
                    Análise de Sentimento
                  </CardTitle>
                  <CardDescription>
                    Analise o tom emocional de uma mensagem para detectar frustração, impaciência ou raiva.
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <Form {...sentimentForm}>
                    <form onSubmit={sentimentForm.handleSubmit(analyzeSentiment)} className="space-y-4">
                      <FormField
                        control={sentimentForm.control}
                        name="text"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Mensagem para análise</FormLabel>
                            <FormControl>
                              <Textarea
                                placeholder="Digite uma mensagem para analisar o sentimento..."
                                className="min-h-32"
                                {...field}
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <Button 
                        type="submit" 
                        disabled={isAnalyzing}
                        className="w-full"
                      >
                        {isAnalyzing ? "Analisando..." : "Analisar Sentimento"}
                      </Button>
                    </form>
                  </Form>
                  
                  {sentimentResult && (
                    <div className="mt-4 p-4 bg-gray-50 rounded-md">
                      <h4 className="font-semibold mb-3">Resultado da Análise:</h4>
                      
                      <div className="mb-3">
                        <span className="font-medium">Sentimento: </span>
                        <span className={`font-semibold ${
                          sentimentResult.sentiment === "positive" ? "text-green-600" :
                          sentimentResult.sentiment === "negative" ? "text-red-600" :
                          "text-yellow-600"
                        }`}>
                          {sentimentResult.sentiment === "positive" ? "Positivo" :
                           sentimentResult.sentiment === "negative" ? "Negativo" :
                           "Neutro"}
                        </span>
                        <span className="text-sm text-gray-500 ml-2">
                          (score: {sentimentResult.score.toFixed(2)})
                        </span>
                      </div>
                      
                      <p className="text-sm mb-3">
                        <span className="font-medium">Confiança: </span>
                        <span>{(sentimentResult.confidence * 100).toFixed(1)}%</span>
                      </p>
                      
                      {sentimentResult.emotions && (
                        <div className="mt-4">
                          <h5 className="font-medium mb-2">Análise Emocional:</h5>
                          {renderEmotionIndicator(sentimentResult.emotions.anger, "Raiva")}
                          {renderEmotionIndicator(sentimentResult.emotions.frustration, "Frustração")}
                          {renderEmotionIndicator(sentimentResult.emotions.impatience, "Impaciência")}
                          {renderEmotionIndicator(sentimentResult.emotions.urgency, "Urgência")}
                        </div>
                      )}
                      
                      {sentimentResult.needsHumanIntervention && (
                        <div className="mt-4 p-3 bg-red-50 text-red-800 rounded-md flex items-start">
                          <AlertTriangle className="mt-0.5 mr-2 h-5 w-5 text-red-600 flex-shrink-0" />
                          <div>
                            <p className="font-semibold">Requer Intervenção Humana</p>
                            <p className="text-sm">
                              {sentimentResult.interventionReason || 
                               "O tom emocional desta mensagem sugere que um atendente humano deve responder."}
                            </p>
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                </CardContent>
              </Card>
              
              {/* Card para testar resposta automática */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center">
                    <MessageCircleMore className="mr-2 h-5 w-5 text-primary" />
                    Resposta Automática
                  </CardTitle>
                  <CardDescription>
                    Teste se uma mensagem receberá resposta automática e veja a sugestão de resposta.
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <Form {...sentimentForm}>
                    <form onSubmit={sentimentForm.handleSubmit(testAutoReply)} className="space-y-4">
                      <FormField
                        control={sentimentForm.control}
                        name="text"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Mensagem de teste</FormLabel>
                            <FormControl>
                              <Textarea
                                placeholder="Digite uma mensagem para testar a resposta automática..."
                                className="min-h-32"
                                {...field}
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <Button 
                        type="submit" 
                        disabled={isTestingAutoReply}
                        className="w-full"
                      >
                        {isTestingAutoReply ? "Processando..." : "Testar Resposta"}
                      </Button>
                    </form>
                  </Form>
                  
                  {autoReplyResult && (
                    <div className="mt-4 p-4 bg-gray-50 rounded-md">
                      <div className="flex items-center mb-3">
                        <h4 className="font-semibold">Resultado do teste:</h4>
                        <span className={`ml-2 px-2 py-0.5 text-xs font-medium rounded ${
                          autoReplyResult.shouldReply ? "bg-green-100 text-green-800" : "bg-red-100 text-red-800"
                        }`}>
                          {autoReplyResult.shouldReply ? "Resposta Automática" : "Intervenção Humana"}
                        </span>
                      </div>
                      
                      <p className="text-sm mb-3">
                        <span className="font-medium">Confiança: </span>
                        <span>{(autoReplyResult.confidence * 100).toFixed(1)}%</span>
                      </p>
                      
                      {autoReplyResult.shouldReply && autoReplyResult.suggestedReply && (
                        <div className="mt-3">
                          <h5 className="font-medium mb-2">Resposta Sugerida:</h5>
                          <div className="p-3 bg-blue-50 text-blue-800 rounded-md">
                            {autoReplyResult.suggestedReply}
                          </div>
                        </div>
                      )}
                      
                      {autoReplyResult.sentimentAnalysis && (
                        <div className="mt-4 text-sm">
                          <h5 className="font-medium mb-1">Informações adicionais:</h5>
                          <p>
                            Sentimento: <span className={`font-medium ${
                              autoReplyResult.sentimentAnalysis.sentiment === "positive" ? "text-green-600" :
                              autoReplyResult.sentimentAnalysis.sentiment === "negative" ? "text-red-600" :
                              "text-yellow-600"
                            }`}>
                              {autoReplyResult.sentimentAnalysis.sentiment === "positive" ? "Positivo" :
                               autoReplyResult.sentimentAnalysis.sentiment === "negative" ? "Negativo" :
                               "Neutro"}
                            </span>
                          </p>
                          
                          {!autoReplyResult.shouldReply && autoReplyResult.sentimentAnalysis.interventionReason && (
                            <div className="mt-2 p-2 bg-yellow-50 text-yellow-800 rounded-md text-xs">
                              {autoReplyResult.sentimentAnalysis.interventionReason}
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>
          </TabsContent>
          
          {/* Aba de Configurações */}
          <TabsContent value="settings">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <Settings className="mr-2 h-5 w-5 text-primary" />
                  Configurações do Assistente IA
                </CardTitle>
                <CardDescription>
                  Configure os parâmetros do sistema de IA para resposta automática e análise de sentimento.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Form {...settingsForm}>
                  <form onSubmit={settingsForm.handleSubmit(saveSettings)} className="space-y-6">
                    <FormField
                      control={settingsForm.control}
                      name="autoReplyEnabled"
                      render={({ field }) => (
                        <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
                          <div className="space-y-0.5">
                            <FormLabel className="text-base">Resposta Automática</FormLabel>
                            <FormDescription>
                              Ativar sistema de resposta automática para mensagens iniciais.
                            </FormDescription>
                          </div>
                          <FormControl>
                            <Switch
                              checked={field.value}
                              onCheckedChange={field.onChange}
                            />
                          </FormControl>
                        </FormItem>
                      )}
                    />
                    
                    <FormField
                      control={settingsForm.control}
                      name="escalateNegative"
                      render={({ field }) => (
                        <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
                          <div className="space-y-0.5">
                            <FormLabel className="text-base">Encaminhar Negativos</FormLabel>
                            <FormDescription>
                              Encaminhar automaticamente mensagens com sentimento muito negativo para atendimento humano.
                            </FormDescription>
                          </div>
                          <FormControl>
                            <Switch
                              checked={field.value}
                              onCheckedChange={field.onChange}
                            />
                          </FormControl>
                        </FormItem>
                      )}
                    />
                    
                    <FormField
                      control={settingsForm.control}
                      name="autoAssignToBot"
                      render={({ field }) => (
                        <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
                          <div className="space-y-0.5">
                            <FormLabel className="text-base">Atribuição Automática ao Bot</FormLabel>
                            <FormDescription>
                              Atribuir automaticamente conversas com resposta automática ao agente virtual.
                            </FormDescription>
                          </div>
                          <FormControl>
                            <Switch
                              checked={field.value}
                              onCheckedChange={field.onChange}
                            />
                          </FormControl>
                        </FormItem>
                      )}
                    />
                    
                    <div className="grid gap-6 md:grid-cols-2">
                      <FormField
                        control={settingsForm.control}
                        name="sentimentThreshold"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Limite de Emoção Negativa (0-10)</FormLabel>
                            <FormDescription>
                              Nível de raiva/frustração a partir do qual uma mensagem é encaminhada para humano.
                            </FormDescription>
                            <FormControl>
                              <Input
                                type="number"
                                min="0"
                                max="10"
                                step="0.5"
                                {...field}
                                onChange={(e) => field.onChange(parseFloat(e.target.value))}
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      
                      <FormField
                        control={settingsForm.control}
                        name="confidenceThreshold"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Limite de Confiança (0-1)</FormLabel>
                            <FormDescription>
                              Nível mínimo de confiança para que uma resposta automática seja enviada.
                            </FormDescription>
                            <FormControl>
                              <Input
                                type="number"
                                min="0"
                                max="1"
                                step="0.1"
                                {...field}
                                onChange={(e) => field.onChange(parseFloat(e.target.value))}
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>
                    
                    <Button type="submit" className="w-full">
                      Salvar Configurações
                    </Button>
                  </form>
                </Form>
              </CardContent>
            </Card>
          </TabsContent>
          
          {/* Aba de Métricas */}
          <TabsContent value="metrics">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <BarChart className="mr-2 h-5 w-5 text-primary" />
                  Métricas do Assistente IA
                </CardTitle>
                <CardDescription>
                  Estatísticas de desempenho do assistente de IA no sistema.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="text-center py-12">
                  <Sparkles className="h-12 w-12 text-gray-300 mx-auto mb-4" />
                  <h3 className="text-lg font-medium text-gray-500">Módulo em Desenvolvimento</h3>
                  <p className="text-sm text-gray-400 mt-2 max-w-md mx-auto">
                    O painel de métricas está sendo implementado e estará disponível em breve.
                    Aqui serão exibidas estatísticas sobre respostas automáticas, análises de sentimento
                    e performance do sistema de IA.
                  </p>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
        </div>
      </div>
    </>
  );
}

export default AIAssistantPage;
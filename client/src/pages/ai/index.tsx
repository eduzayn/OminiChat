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
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Slider } from "@/components/ui/slider";
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
  MessageCircleMore,
  Cloud,
  Trash2
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
      const response = await apiRequest(
        "POST",
        "/api/ai/analyze-sentiment",
        { text: data.text }
      );
      
      const result = await response.json();
      setSentimentResult(result);
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
      const response = await apiRequest(
        "POST",
        "/api/ai/auto-reply-test", 
        { message: data.text }
      );
      
      const result = await response.json();
      setAutoReplyResult(result);
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
      await apiRequest(
        "POST",
        "/api/ai/settings",
        data
      );
      
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
            <TabsList className="grid grid-cols-4 w-full max-w-2xl mb-6">
              <TabsTrigger value="demo">
                <MessageSquare className="mr-2 h-4 w-4" />
                Demonstração
              </TabsTrigger>
              <TabsTrigger value="settings">
                <Settings className="mr-2 h-4 w-4" />
                Configurações
              </TabsTrigger>
              <TabsTrigger value="training">
                <Brain className="mr-2 h-4 w-4" />
                Treinamento
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
            
            {/* Aba de Treinamento */}
            <TabsContent value="training">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center">
                    <Brain className="mr-2 h-5 w-5 text-primary" />
                    Treinamento do Cérebro IA
                  </CardTitle>
                  <CardDescription>
                    Alimente o cérebro da IA com diferentes tipos de conteúdo para melhorar sua capacidade de resposta.
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-6">
                    {/* Estatísticas de Base de Conhecimento */}
                    <div className="grid grid-cols-3 gap-4">
                      <div className="bg-gray-50 p-4 rounded-lg">
                        <div className="text-2xl font-bold text-primary">42</div>
                        <div className="text-xs text-gray-500 mt-1">Fontes de Conteúdo</div>
                      </div>
                      <div className="bg-gray-50 p-4 rounded-lg">
                        <div className="text-2xl font-bold text-primary">268</div>
                        <div className="text-xs text-gray-500 mt-1">Documentos Processados</div>
                      </div>
                      <div className="bg-gray-50 p-4 rounded-lg">
                        <div className="text-2xl font-bold text-primary">11.4K</div>
                        <div className="text-xs text-gray-500 mt-1">Tokens de Conhecimento</div>
                      </div>
                    </div>
                    
                    {/* Formulário de Upload de Conhecimento */}
                    <div className="border rounded-lg p-4">
                      <h3 className="text-lg font-medium mb-4">Adicionar Conhecimento</h3>
                      
                      <Tabs defaultValue="url" className="w-full">
                        <TabsList className="grid grid-cols-5 h-9 w-full">
                          <TabsTrigger value="url" className="text-xs px-2">URL</TabsTrigger>
                          <TabsTrigger value="youtube" className="text-xs px-2">YouTube</TabsTrigger>
                          <TabsTrigger value="pdf" className="text-xs px-2">PDF</TabsTrigger>
                          <TabsTrigger value="text" className="text-xs px-2">Texto</TabsTrigger>
                          <TabsTrigger value="qa" className="text-xs px-2">Perguntas</TabsTrigger>
                        </TabsList>
                        
                        {/* Conteúdo da aba URL */}
                        <TabsContent value="url" className="mt-4">
                          <div className="space-y-4">
                            <div className="grid grid-cols-[1fr,auto] gap-2">
                              <Input placeholder="https://exemplo.com.br/artigo" />
                              <Button size="sm">Adicionar</Button>
                            </div>
                            <div className="text-xs text-gray-500">
                              Insira URLs de sites, blogs e artigos para processamento.
                              O sistema extrairá o conteúdo textual e o adicionará à base de conhecimento.
                            </div>
                          </div>
                        </TabsContent>
                        
                        {/* Conteúdo da aba YouTube */}
                        <TabsContent value="youtube" className="mt-4">
                          <div className="space-y-4">
                            <div className="grid grid-cols-[1fr,auto] gap-2">
                              <Input placeholder="https://www.youtube.com/watch?v=exemplo" />
                              <Button size="sm">Adicionar</Button>
                            </div>
                            <div className="text-xs text-gray-500">
                              Insira URLs de vídeos do YouTube. O sistema extrairá a transcrição e o adicionará à base de conhecimento.
                            </div>
                          </div>
                        </TabsContent>
                        
                        {/* Conteúdo da aba PDF */}
                        <TabsContent value="pdf" className="mt-4">
                          <div className="space-y-4">
                            <div className="grid gap-2">
                              <label htmlFor="pdf-upload" className="w-full cursor-pointer">
                                <div className="border border-dashed rounded-lg p-8 text-center">
                                  <Cloud className="mx-auto h-8 w-8 text-gray-400 mb-2" />
                                  <p className="text-sm font-medium">
                                    Arraste e solte arquivos PDF aqui ou clique para selecionar
                                  </p>
                                  <input 
                                    id="pdf-upload" 
                                    type="file" 
                                    className="hidden" 
                                    accept=".pdf" 
                                    onChange={(e) => {
                                      // Aqui você pode adicionar a lógica para fazer o upload do arquivo
                                      console.log("Arquivo selecionado:", e.target.files?.[0]?.name);
                                    }}
                                  />
                                </div>
                              </label>
                              <Button 
                                size="sm"
                                onClick={() => {
                                  // Simular clique no input file quando o botão for clicado
                                  document.getElementById('pdf-upload')?.click();
                                }}
                              >
                                Fazer Upload
                              </Button>
                            </div>
                            <div className="text-xs text-gray-500">
                              Faça upload de documentos PDF para adicionar à base de conhecimento. Tamanho máximo: 10MB.
                            </div>
                          </div>
                        </TabsContent>
                        
                        {/* Conteúdo da aba Texto */}
                        <TabsContent value="text" className="mt-4">
                          <div className="space-y-4">
                            <div className="grid gap-2">
                              <Textarea 
                                placeholder="Digite ou cole o texto que deseja adicionar à base de conhecimento..."
                                className="min-h-[150px]"
                              />
                              <div className="grid grid-cols-2 gap-2">
                                <Input placeholder="Título do documento" />
                                <Button>Adicionar Texto</Button>
                              </div>
                            </div>
                          </div>
                        </TabsContent>
                        
                        {/* Conteúdo da aba Perguntas e Respostas */}
                        <TabsContent value="qa" className="mt-4">
                          <div className="space-y-4">
                            <div className="grid gap-3">
                              <div>
                                <label className="text-sm font-medium mb-1 block">Pergunta</label>
                                <Textarea placeholder="Digite uma pergunta..." className="min-h-[80px]" />
                              </div>
                              <div>
                                <label className="text-sm font-medium mb-1 block">Resposta</label>
                                <Textarea placeholder="Digite a resposta ideal..." className="min-h-[120px]" />
                              </div>
                              <Button>Adicionar par de Pergunta/Resposta</Button>
                            </div>
                            <div className="text-xs text-gray-500">
                              Adicione pares de perguntas e respostas para treinar a IA em cenários específicos.
                            </div>
                          </div>
                        </TabsContent>
                      </Tabs>
                    </div>
                    
                    {/* Lista de Fontes de Conhecimento */}
                    <div>
                      <h3 className="text-lg font-medium mb-4">Base de Conhecimento</h3>
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead className="w-[40%]">Fonte</TableHead>
                            <TableHead>Tipo</TableHead>
                            <TableHead>Adicionado</TableHead>
                            <TableHead>Status</TableHead>
                            <TableHead className="text-right">Ações</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          <TableRow>
                            <TableCell className="font-medium">Manual do Produto X</TableCell>
                            <TableCell>PDF</TableCell>
                            <TableCell>01/05/2025</TableCell>
                            <TableCell>
                              <span className="bg-green-100 text-green-800 px-2 py-1 rounded text-xs">Processado</span>
                            </TableCell>
                            <TableCell className="text-right">
                              <Button variant="ghost" size="icon">
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </TableCell>
                          </TableRow>
                          <TableRow>
                            <TableCell className="font-medium">https://exemplo.com.br/faq</TableCell>
                            <TableCell>URL</TableCell>
                            <TableCell>01/05/2025</TableCell>
                            <TableCell>
                              <span className="bg-green-100 text-green-800 px-2 py-1 rounded text-xs">Processado</span>
                            </TableCell>
                            <TableCell className="text-right">
                              <Button variant="ghost" size="icon">
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </TableCell>
                          </TableRow>
                          <TableRow>
                            <TableCell className="font-medium">Vídeo: Tutorial do Sistema</TableCell>
                            <TableCell>YouTube</TableCell>
                            <TableCell>01/05/2025</TableCell>
                            <TableCell>
                              <span className="bg-yellow-100 text-yellow-800 px-2 py-1 rounded text-xs">Processando</span>
                            </TableCell>
                            <TableCell className="text-right">
                              <Button variant="ghost" size="icon">
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </TableCell>
                          </TableRow>
                        </TableBody>
                      </Table>
                    </div>
                    
                    {/* Configurações Avançadas de Treinamento */}
                    <div className="border rounded-lg p-4">
                      <h3 className="text-lg font-medium mb-4">Configurações de Treinamento</h3>
                      <div className="space-y-4">
                        <div className="flex items-center justify-between">
                          <div>
                            <h4 className="text-sm font-medium">Atualização Automática</h4>
                            <p className="text-xs text-gray-500">Atualiza fontes periodicamente</p>
                          </div>
                          <Switch />
                        </div>
                        <div className="flex items-center justify-between">
                          <div>
                            <h4 className="text-sm font-medium">Processamento Profundo</h4>
                            <p className="text-xs text-gray-500">Análise mais detalhada (usa mais tokens)</p>
                          </div>
                          <Switch />
                        </div>
                        <div>
                          <h4 className="text-sm font-medium mb-2">Peso do Conhecimento</h4>
                          <div className="grid grid-cols-[1fr,80px] gap-4 items-center">
                            <Slider defaultValue={[75]} max={100} step={1} />
                            <span className="text-sm font-medium">75%</span>
                          </div>
                          <p className="text-xs text-gray-500 mt-1">
                            Define o quanto o conhecimento personalizado influencia nas respostas vs. conhecimento geral
                          </p>
                        </div>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>
            
            {/* Aba de Métricas */}
            <TabsContent value="metrics">
              <div className="grid gap-6 md:grid-cols-2">
                {/* Métricas de Utilização da IA */}
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center">
                      <BarChart className="mr-2 h-5 w-5 text-primary" />
                      Métricas de Utilização
                    </CardTitle>
                    <CardDescription>
                      Estatísticas de uso da inteligência artificial no sistema.
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-6">
                      {/* Métricas de Uso Total */}
                      <div>
                        <h4 className="text-sm font-medium mb-3">Uso Diário da IA</h4>
                        <div className="grid grid-cols-2 gap-4">
                          <div className="bg-gray-50 p-4 rounded-lg">
                            <div className="text-2xl font-bold text-primary">1,248</div>
                            <div className="text-xs text-gray-500 mt-1">Análises de Sentimento</div>
                          </div>
                          <div className="bg-gray-50 p-4 rounded-lg">
                            <div className="text-2xl font-bold text-primary">782</div>
                            <div className="text-xs text-gray-500 mt-1">Respostas Automáticas</div>
                          </div>
                          <div className="bg-gray-50 p-4 rounded-lg">
                            <div className="text-2xl font-bold text-primary">423</div>
                            <div className="text-xs text-gray-500 mt-1">Sugestões de Resposta</div>
                          </div>
                          <div className="bg-gray-50 p-4 rounded-lg">
                            <div className="text-2xl font-bold text-primary">95%</div>
                            <div className="text-xs text-gray-500 mt-1">Taxa de Sucesso</div>
                          </div>
                        </div>
                      </div>
                      
                      {/* Crescimento */}
                      <div>
                        <h4 className="text-sm font-medium mb-3">Crescimento (30 dias)</h4>
                        <div className="flex items-end space-x-1">
                          <div className="bg-primary h-10 w-4 rounded-t"></div>
                          <div className="bg-primary h-12 w-4 rounded-t"></div>
                          <div className="bg-primary h-16 w-4 rounded-t"></div>
                          <div className="bg-primary h-14 w-4 rounded-t"></div>
                          <div className="bg-primary h-20 w-4 rounded-t"></div>
                          <div className="bg-primary h-24 w-4 rounded-t"></div>
                          <div className="bg-primary h-28 w-4 rounded-t"></div>
                          <div className="bg-primary h-24 w-4 rounded-t"></div>
                          <div className="bg-primary h-32 w-4 rounded-t"></div>
                          <div className="bg-primary h-36 w-4 rounded-t"></div>
                          <div className="bg-primary h-40 w-4 rounded-t"></div>
                          <div className="bg-primary h-44 w-4 rounded-t"></div>
                        </div>
                        <div className="text-xs text-gray-500 mt-2 flex justify-between">
                          <span>01/04</span>
                          <span>01/05</span>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
                
                {/* Métricas de Performance */}
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center">
                      <Gauge className="mr-2 h-5 w-5 text-primary" />
                      Performance e Eficiência
                    </CardTitle>
                    <CardDescription>
                      Estatísticas de desempenho e qualidade das respostas.
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-5">
                      {/* Taxa de Intervenção */}
                      <div>
                        <div className="flex justify-between items-center mb-1">
                          <h4 className="text-sm font-medium">Taxa de Intervenção Humana</h4>
                          <span className="text-sm font-medium">28%</span>
                        </div>
                        <div className="w-full h-2 bg-gray-200 rounded-full">
                          <div className="h-full bg-amber-500 rounded-full" style={{ width: '28%' }}></div>
                        </div>
                        <p className="text-xs text-gray-500 mt-1">
                          Percentual de mensagens que foram encaminhadas para atendimento humano
                        </p>
                      </div>
                      
                      {/* Tempo de Resposta */}
                      <div>
                        <div className="flex justify-between items-center mb-1">
                          <h4 className="text-sm font-medium">Tempo Médio de Resposta</h4>
                          <span className="text-sm font-medium">1.4s</span>
                        </div>
                        <div className="w-full h-2 bg-gray-200 rounded-full">
                          <div className="h-full bg-green-500 rounded-full" style={{ width: '85%' }}></div>
                        </div>
                        <p className="text-xs text-gray-500 mt-1">
                          Tempo médio para gerar uma resposta com IA
                        </p>
                      </div>
                      
                      {/* Confiança */}
                      <div>
                        <div className="flex justify-between items-center mb-1">
                          <h4 className="text-sm font-medium">Confiança Média</h4>
                          <span className="text-sm font-medium">87%</span>
                        </div>
                        <div className="w-full h-2 bg-gray-200 rounded-full">
                          <div className="h-full bg-blue-500 rounded-full" style={{ width: '87%' }}></div>
                        </div>
                        <p className="text-xs text-gray-500 mt-1">
                          Nível médio de confiança nas análises de sentimento
                        </p>
                      </div>
                      
                      {/* Distribuição Sentimento */}
                      <div>
                        <h4 className="text-sm font-medium mb-2">Distribuição de Sentimento</h4>
                        <div className="flex w-full h-5 rounded-full overflow-hidden">
                          <div className="bg-green-500 h-full" style={{ width: '45%' }}></div>
                          <div className="bg-yellow-400 h-full" style={{ width: '30%' }}></div>
                          <div className="bg-red-500 h-full" style={{ width: '25%' }}></div>
                        </div>
                        <div className="flex justify-between text-xs text-gray-500 mt-1">
                          <span>Positivo (45%)</span>
                          <span>Neutro (30%)</span>
                          <span>Negativo (25%)</span>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
                
                {/* Tipo de Mensagens */}
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center">
                      <MessageSquare className="mr-2 h-5 w-5 text-primary" />
                      Análise de Conversas
                    </CardTitle>
                    <CardDescription>
                      Distribuição e categorização das mensagens processadas.
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-4">
                      <div className="grid grid-cols-2 gap-4">
                        <div className="rounded-lg border p-3">
                          <div className="text-xl font-bold">WhatsApp</div>
                          <div className="text-sm text-gray-500">56% das conversas</div>
                          <div className="flex justify-between mt-3 text-xs font-medium">
                            <span>Auto-resposta:</span>
                            <span>63%</span>
                          </div>
                        </div>
                        <div className="rounded-lg border p-3">
                          <div className="text-xl font-bold">Instagram</div>
                          <div className="text-sm text-gray-500">28% das conversas</div>
                          <div className="flex justify-between mt-3 text-xs font-medium">
                            <span>Auto-resposta:</span>
                            <span>42%</span>
                          </div>
                        </div>
                        <div className="rounded-lg border p-3">
                          <div className="text-xl font-bold">Facebook</div>
                          <div className="text-sm text-gray-500">10% das conversas</div>
                          <div className="flex justify-between mt-3 text-xs font-medium">
                            <span>Auto-resposta:</span>
                            <span>48%</span>
                          </div>
                        </div>
                        <div className="rounded-lg border p-3">
                          <div className="text-xl font-bold">Site</div>
                          <div className="text-sm text-gray-500">6% das conversas</div>
                          <div className="flex justify-between mt-3 text-xs font-medium">
                            <span>Auto-resposta:</span>
                            <span>71%</span>
                          </div>
                        </div>
                      </div>
                      
                      {/* Categorias */}
                      <div>
                        <h4 className="text-sm font-medium mb-2">Categorias de Mensagens</h4>
                        <div className="space-y-2">
                          <div className="flex justify-between">
                            <span className="text-xs">Dúvidas sobre Produtos</span>
                            <span className="text-xs font-medium">32%</span>
                          </div>
                          <div className="w-full h-1.5 bg-gray-200 rounded-full">
                            <div className="h-full bg-primary rounded-full" style={{ width: '32%' }}></div>
                          </div>
                          
                          <div className="flex justify-between">
                            <span className="text-xs">Suporte Técnico</span>
                            <span className="text-xs font-medium">28%</span>
                          </div>
                          <div className="w-full h-1.5 bg-gray-200 rounded-full">
                            <div className="h-full bg-primary rounded-full" style={{ width: '28%' }}></div>
                          </div>
                          
                          <div className="flex justify-between">
                            <span className="text-xs">Informações de Preços</span>
                            <span className="text-xs font-medium">22%</span>
                          </div>
                          <div className="w-full h-1.5 bg-gray-200 rounded-full">
                            <div className="h-full bg-primary rounded-full" style={{ width: '22%' }}></div>
                          </div>
                          
                          <div className="flex justify-between">
                            <span className="text-xs">Reclamações</span>
                            <span className="text-xs font-medium">10%</span>
                          </div>
                          <div className="w-full h-1.5 bg-gray-200 rounded-full">
                            <div className="h-full bg-primary rounded-full" style={{ width: '10%' }}></div>
                          </div>
                          
                          <div className="flex justify-between">
                            <span className="text-xs">Outros</span>
                            <span className="text-xs font-medium">8%</span>
                          </div>
                          <div className="w-full h-1.5 bg-gray-200 rounded-full">
                            <div className="h-full bg-primary rounded-full" style={{ width: '8%' }}></div>
                          </div>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
                
                {/* Economia e Eficiência */}
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center">
                      <Sparkles className="mr-2 h-5 w-5 text-primary" />
                      Impacto nos Negócios
                    </CardTitle>
                    <CardDescription>
                      Métricas de economia e otimização de recursos.
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-5">
                      <div className="grid grid-cols-2 gap-4">
                        <div className="bg-blue-50 p-4 rounded-lg text-center">
                          <div className="text-3xl font-bold text-blue-600">42h</div>
                          <div className="text-sm text-blue-700 mt-1">Tempo economizado</div>
                          <div className="text-xs text-blue-500 mt-1">por semana</div>
                        </div>
                        <div className="bg-green-50 p-4 rounded-lg text-center">
                          <div className="text-3xl font-bold text-green-600">35%</div>
                          <div className="text-sm text-green-700 mt-1">Redução no custo</div>
                          <div className="text-xs text-green-500 mt-1">de atendimento</div>
                        </div>
                      </div>
                      
                      {/* Métricas de Satisfação */}
                      <div>
                        <h4 className="text-sm font-medium mb-3">Impacto na Satisfação</h4>
                        <div className="space-y-3">
                          <div>
                            <div className="flex justify-between items-center">
                              <span className="text-xs">Tempo de Resposta</span>
                              <span className="text-xs bg-green-100 text-green-800 px-2 py-0.5 rounded-full">-65%</span>
                            </div>
                            <div className="w-full h-1.5 bg-gray-200 rounded-full mt-1">
                              <div className="h-full bg-green-500 rounded-full" style={{ width: '65%' }}></div>
                            </div>
                          </div>
                          
                          <div>
                            <div className="flex justify-between items-center">
                              <span className="text-xs">Precisão nas Respostas</span>
                              <span className="text-xs bg-green-100 text-green-800 px-2 py-0.5 rounded-full">+28%</span>
                            </div>
                            <div className="w-full h-1.5 bg-gray-200 rounded-full mt-1">
                              <div className="h-full bg-green-500 rounded-full" style={{ width: '28%' }}></div>
                            </div>
                          </div>
                          
                          <div>
                            <div className="flex justify-between items-center">
                              <span className="text-xs">Aumento na Satisfação (NPS)</span>
                              <span className="text-xs bg-green-100 text-green-800 px-2 py-0.5 rounded-full">+18%</span>
                            </div>
                            <div className="w-full h-1.5 bg-gray-200 rounded-full mt-1">
                              <div className="h-full bg-green-500 rounded-full" style={{ width: '18%' }}></div>
                            </div>
                          </div>
                        </div>
                      </div>
                      
                      {/* Métricas do Time */}
                      <div>
                        <h4 className="text-sm font-medium mb-2">Impacto no Time</h4>
                        <div className="grid grid-cols-2 gap-2">
                          <div className="flex items-center bg-gray-50 p-2 rounded">
                            <div className="w-2 h-2 bg-primary rounded-full mr-2"></div>
                            <div className="text-xs">
                              <span className="font-medium">12</span> agentes otimizados
                            </div>
                          </div>
                          <div className="flex items-center bg-gray-50 p-2 rounded">
                            <div className="w-2 h-2 bg-primary rounded-full mr-2"></div>
                            <div className="text-xs">
                              <span className="font-medium">+24%</span> eficiência
                            </div>
                          </div>
                          <div className="flex items-center bg-gray-50 p-2 rounded">
                            <div className="w-2 h-2 bg-primary rounded-full mr-2"></div>
                            <div className="text-xs">
                              <span className="font-medium">-35%</span> tempo ocioso
                            </div>
                          </div>
                          <div className="flex items-center bg-gray-50 p-2 rounded">
                            <div className="w-2 h-2 bg-primary rounded-full mr-2"></div>
                            <div className="text-xs">
                              <span className="font-medium">+5.2</span> clientes/hora
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>
            </TabsContent>
          </Tabs>
        </div>
      </div>
    </>
  );
}

export default AIAssistantPage;
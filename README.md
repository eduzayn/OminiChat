# Correção para o Erro 502 Bad Gateway na Integração Z-API

Este documento fornece instruções para corrigir o problema de "502 Bad Gateway" ao tentar gerar o QR code para conectar ao Z-API.

## Problema Identificado

O erro "502: Bad Gateway" ocorre quando há um problema de comunicação entre o aplicativo e o servidor da Z-API. Neste caso específico, o problema está relacionado a:

1. Falta de tratamento adequado para erros temporários de rede
2. Ausência de mecanismo de retry para lidar com falhas temporárias
3. Tratamento inadequado das respostas HTML recebidas quando esperamos JSON

## Solução Implementada

### 1. Melhoria no Cliente de Requisições HTTP (`client/src/lib/queryClient.ts`)

A função `apiRequest` foi atualizada para:
- Adicionar timeout para evitar requisições pendentes indefinidamente
- Tratar especificamente erros 502 e 504 com mensagens mais amigáveis
- Limitar o tamanho de mensagens de erro muito grandes
- Interpretar corretamente respostas HTML quando o status é de sucesso
- Adicionar tratamento adequado para erros de timeout

### 2. Melhoria no Componente de Integração Z-API (`client/src/pages/integrations/components/zapi-integration.tsx`)

O método `checkConnectionStatus` foi melhorado para:
- Implementar lógica de retry para erros temporários (502, 504, etc.)
- Adicionar feedback ao usuário durante as tentativas de reconexão
- Usar exponential backoff para espaçar as tentativas de reconexão
- Melhorar as mensagens de erro exibidas aos usuários

### 3. Melhoria no Serviço Z-API no Backend (`server/services/channels/zapi.ts`)

Foi adicionada uma função `zapiRequest` com:
- Implementação de retry automático para erros temporários
- Configuração de timeout personalizado para falhas rápidas
- Tratamento específico para diferentes tipos de erros de rede
- Exponential backoff para melhor gestão de retentativas

## Como Aplicar as Correções

Os arquivos com as correções estão disponíveis no diretório `backup`:

1. **Para o cliente de requisições HTTP**:
   - Substitua o conteúdo do arquivo `client/src/lib/queryClient.ts` pelo de `backup/queryClient-fix.txt`

2. **Para o componente de integração Z-API**:
   - Substitua a função `checkConnectionStatus` em `client/src/pages/integrations/components/zapi-integration.tsx` pelo código de `backup/zapi-integration-fix.txt`

3. **Para o serviço Z-API no backend**:
   - Adicione a função `zapiRequest` em `server/services/channels/zapi.ts`
   - Atualize as funções `checkConnectionStatus` e `getQRCodeForChannel` de acordo com `backup/zapi-service-fix.txt`

## Após a Aplicação

Depois de aplicar as correções:

1. Reinicie o servidor de desenvolvimento
2. Limpe o cache do navegador
3. Tente novamente a geração do QR code

Em caso de problemas persistentes, verifique:
- Logs do servidor para identificar erros adicionais
- Estado da conexão com a Internet
- Disponibilidade da API Z-API em https://api.z-api.io/status

## Pontos Importantes

- As soluções incluem log detalhado para facilitar o diagnóstico de problemas
- O mecanismo de retry é limitado (máximo 3 tentativas) para evitar consumo excessivo de recursos
- As alterações mantêm compatibilidade total com o código existente 
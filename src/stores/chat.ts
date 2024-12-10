// src/stores/chat.ts

import { defineStore } from 'pinia';
import { ref } from 'vue';
import type { Message } from '../types/chat';

export const useChatStore = defineStore('chat', () => {
  const messages = ref<Message[]>([]);
  const isProcessing = ref(false);
  const openAIKey = import.meta.env.VITE_OPENAI_API_KEY;

  const functions = [
    {
      name: 'convert_image',
      description: 'Converte uma imagem para outro formato',
      parameters: {
        type: 'object',
        properties: {
          output_format: { type: 'string', description: 'Formato de saída da imagem (ex: PNG, JPEG, GIF)' }
        },
        required: ['output_format']
      }
    },
    {
      name: 'convert_document',
      description: 'Converte um documento (ex: PDF para DOCX)',
      parameters: {
        type: 'object',
        properties: {
          output_format: { type: 'string', description: 'Formato de saída do documento (ex: docx)' }
        },
        required: ['output_format']
      }
    },
    {
      name: 'extract_audio',
      description: 'Extrai áudio de um vídeo',
      parameters: {
        type: 'object',
        properties: {
          output_format: { type: 'string', description: 'Formato de saída do áudio (ex: mp3)' }
        },
        required: ['output_format']
      }
    }
  ];

  function addMessage(message: Omit<Message, 'id' | 'timestamp'>) {
    const newMessage: Message = {
      id: crypto.randomUUID(),
      timestamp: new Date(),
      ...message,
    };
    messages.value.push(newMessage);
  }

  async function callOpenAIChat(history: Message[]) {
    const openAIMessages = history.map(msg => {
      let role: 'user' | 'assistant' | 'function' = 'assistant';
      if (msg.role === 'user' || msg.role === 'assistant') {
        role = msg.role;
      } else if (msg.role === 'function') {
        role = 'function';
      }

      const baseMsg: any = {
        role,
        content: msg.content,
      };
      if (role === 'function' && msg.name) {
        baseMsg.name = msg.name;
      }
      return baseMsg;
    });

    // Mensagem de sistema com o prompt desejado
    const systemMessage = {
      role: 'system' as const,
      content: `Você é um assistente especializado em conversão de arquivos.
Quando o usuário enviar um arquivo sem digitar nada, você deverá identificar o tipo do arquivo (imagem, documento, vídeo, áudio, etc.)
e apresentar ao usuário as opções de conversão disponíveis com base nesse tipo.
Caso o usuário já tenha enviado um arquivo e especificado um tipo de conversão, realize o procedimento solicitado.
Responda somente sobre assuntos relacionados à conversão de arquivos.`
    };

    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${openAIKey}`
      },
      body: JSON.stringify({
        model: 'gpt-4o-mini',
        messages: [systemMessage, ...openAIMessages],
        functions: functions,
        function_call: 'auto'
      })
    });

    const json = await response.json();
    return json;
  }

  async function processFileCommand(content: string, files: File[]) {
    // Caso o usuário não tenha digitado nada e tenha enviado apenas o arquivo,
    // identificamos o tipo do arquivo e apresentamos opções de conversão.
    if (!content.trim() && files.length) {
      const file = files[0];
      let fileTypeCategory: string;

      if (file.type.startsWith('image/')) {
        fileTypeCategory = 'imagem';
      } else if (file.type.startsWith('video/')) {
        fileTypeCategory = 'vídeo';
      } else if (file.type.startsWith('audio/')) {
        fileTypeCategory = 'áudio';
      } else if (file.type.startsWith('application/') || file.type.startsWith('text/')) {
        fileTypeCategory = 'documento';
      } else {
        fileTypeCategory = 'desconhecido';
      }

      let messageContent = `Identifiquei que você enviou um arquivo do tipo **${fileTypeCategory}**.\n\n`;

      switch (fileTypeCategory) {
        case 'imagem':
          messageContent += "Opções de conversão disponíveis: PNG, JPEG, GIF. Por favor, informe o formato desejado.";
          break;
        case 'vídeo':
          messageContent += "Opções de conversão disponíveis:\n- Extrair áudio (MP3)\n- Converter vídeo para outro formato (ex: MP4)\nPor favor, informe o formato desejado.";
          break;
        case 'áudio':
          messageContent += "Opções de conversão disponíveis: MP3, WAV, OGG. Por favor, informe o formato desejado.";
          break;
        case 'documento':
          messageContent += "Opções de conversão disponíveis: PDF, DOCX, TXT. Por favor, informe o formato desejado.";
          break;
        default:
          messageContent += "Não foi possível identificar o tipo do arquivo para sugerir opções de conversão.";
      }

      addMessage({ content: messageContent, role: 'assistant' });
      return;
    }

    // Se o usuário digitou algo, pode ser o formato desejado.
    // Se o usuário não enviou novos arquivos junto com o formato, vamos tentar recuperar o último arquivo enviado.
    let currentFiles = files;
    if (!currentFiles.length) {
      // Procura a última mensagem do usuário que contenha arquivos no histórico
      for (let i = messages.value.length - 1; i >= 0; i--) {
        const msg = messages.value[i];
        if (msg.role === 'user' && msg.files && msg.files.length) {
          currentFiles = msg.files;
          break;
        }
      }
    }

    addMessage({ content, role: 'user', files: currentFiles });
    isProcessing.value = true;

    try {
      let gptResponse = await callOpenAIChat(messages.value);
      if (!gptResponse || !gptResponse.choices || gptResponse.choices.length === 0) {
        addMessage({ content: 'Não foi possível obter resposta do assistente.', role: 'assistant' });
        isProcessing.value = false;
        return;
      }

      let assistantMsg = gptResponse.choices[0].message;

      // Caso o GPT chame uma função
      while (assistantMsg.function_call) {
        const { name, arguments: argsStr } = assistantMsg.function_call;
        const args = JSON.parse(argsStr || '{}');

        let functionResult: { message: string; downloadLink?: string };

        if (name === 'convert_image') {
          functionResult = await callImageConvertAPI(currentFiles, args.output_format);
        } else if (name === 'convert_document') {
          functionResult = await callDocConvertAPI(currentFiles, args.output_format);
        } else if (name === 'extract_audio') {
          functionResult = await callExtractAudioAPI(currentFiles, args.output_format);
        } else {
          functionResult = { message: 'Função não reconhecida ou não implementada.' };
        }

        messages.value.push({
          id: crypto.randomUUID(),
          timestamp: new Date(),
          role: 'function',
          content: functionResult.message,
          name: name,
          downloadLink: functionResult.downloadLink
        });

        gptResponse = await callOpenAIChat(messages.value);
        if (!gptResponse || !gptResponse.choices || gptResponse.choices.length === 0) {
          addMessage({ content: 'Não foi possível continuar a conversa após a função.', role: 'assistant' });
          isProcessing.value = false;
          return;
        }

        assistantMsg = gptResponse.choices[0].message;
      }

      if (assistantMsg.content) {
        addMessage({ content: assistantMsg.content, role: 'assistant' });
      }

    } catch (error) {
      console.error('Erro ao processar a mensagem:', error);
      addMessage({ content: 'Erro ao processar sua solicitação.', role: 'assistant' });
    } finally {
      isProcessing.value = false;
    }
  }

  async function callImageConvertAPI(files: File[], output_format: string): Promise<{ message: string; downloadLink?: string }> {
    if (!files.length) return { message: 'Nenhum arquivo fornecido.' };

    const url = `http://localhost:8000/images/convert?output_format=${encodeURIComponent(output_format)}`;
    const formData = new FormData();
    formData.append('file', files[0]);

    const resp = await fetch(url, {
      method: 'POST',
      body: formData
    });

    if (!resp.ok) {
      return { message: 'Falha na conversão de imagem.' };
    }

    const blob = await resp.blob();
    console.log('Tipo do blob recebido:', blob.type);
    const downloadURL = URL.createObjectURL(blob);

    return {
      message: `Imagem convertida com sucesso!`,
      downloadLink: downloadURL
    };
  }

  async function callDocConvertAPI(files: File[], output_format: string): Promise<{ message: string; downloadLink?: string }> {
    if (!files.length) return { message: 'Nenhum arquivo fornecido.' };

    const url = `http://localhost:8000/documents/convert?output_format=${encodeURIComponent(output_format)}`;
    const formData = new FormData();
    formData.append('file', files[0]);

    const resp = await fetch(url, {
      method: 'POST',
      body: formData
    });

    if (!resp.ok) return { message: 'Falha na conversão de documento.' };

    const blob = await resp.blob();
    console.log('Tipo do blob recebido (document):', blob.type);
    const downloadURL = URL.createObjectURL(blob);

    return {
      message: `Documento convertido com sucesso!`,
      downloadLink: downloadURL
    };
  }

  async function callExtractAudioAPI(files: File[], output_format: string): Promise<{ message: string; downloadLink?: string }> {
    if (!files.length) return { message: 'Nenhum arquivo fornecido.' };

    const url = `http://localhost:8000/video/extract-audio?output_format=${encodeURIComponent(output_format)}`;
    const formData = new FormData();
    formData.append('file', files[0]);

    const resp = await fetch(url, {
      method: 'POST',
      body: formData
    });

    if (!resp.ok) return { message: 'Falha na extração de áudio.' };

    const blob = await resp.blob();
    console.log('Tipo do blob recebido (audio):', blob.type);
    const downloadURL = URL.createObjectURL(blob);

    return {
      message: `Áudio extraído com sucesso!`,
      downloadLink: downloadURL
    };
  }

  return {
    messages,
    isProcessing,
    addMessage,
    processFileCommand,
  };
});

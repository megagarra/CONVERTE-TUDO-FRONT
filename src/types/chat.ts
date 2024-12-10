export interface Message {
  id: string;
  content: string;
  type: 'user' | 'assistant' | 'function';
  role: 'user' | 'assistant'; // Adicione esta linha
  timestamp: Date;
  files?: File[];
  status?: 'pending' | 'processing' | 'completed' | 'error';
  name?: string; // usado quando type = 'function' (para o GPT)
  downloadLink?: string; // link para download do arquivo convertido
}



export interface ChatState {
  messages: Message[];
  isProcessing: boolean;
}
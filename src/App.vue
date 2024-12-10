<!-- src/App.vue -->

<template>
  <div class="min-h-screen flex flex-col lg:flex-row bg-gray-900 text-white">
    <!-- Sidebar para o Chat -->
    <aside class="bg-gray-900 border-b border-gray-700 py-4 px-6 flex flex-col">
      <div class="p-6 text-2xl font-bold text-center">
        Chat
      </div>
      <!-- Container de mensagens com rolagem -->
      <div ref="messagesContainer" class="flex-1 overflow-y-auto p-4 space-y-4">
        <!-- Exibindo mensagens -->
        <ChatMessage
          v-for="message in chatStore.messages"
          :key="message.id"
          :message="message"
        />

        <!-- Indicador de digitação -->
        <div v-if="chatStore.isProcessing" class="flex items-start gap-3 mb-4">
          <div
            class="w-10 h-10 rounded-full flex items-center justify-center text-lg font-medium bg-purple-500 text-white">
            AI
          </div>
          <div class="bg-gray-700 border border-gray-600 rounded-lg p-4 max-w-md">
            <div class="text-sm text-gray-300 font-bold mb-1">Assistente</div>
            <div class="flex space-x-2">
              <span class="bg-gray-500 rounded-full h-2 w-2 animate-pulse"></span>
              <span class="bg-gray-500 rounded-full h-2 w-2 animate-pulse"></span>
              <span class="bg-gray-500 rounded-full h-2 w-2 animate-pulse"></span>
            </div>
          </div>
        </div>

        <!-- Mensagem quando não há mensagens -->
        <div v-if="chatStore.messages.length === 0 && !chatStore.isProcessing" class="text-center text-gray-500">
          Nenhuma mensagem ainda.
        </div>
      </div>
    </aside>

    <!-- Main Content -->
    <div class="flex-1 flex flex-col">
      <!-- Header -->
      <header class="bg-gray-900 py-4 px-6 flex justify-center items-center">
        <div class="text-2xl font-bold">Converta Tudo</div>
      </header>

      <!-- Main Area -->
      <main class="flex-1 flex flex-col items-center justify-center p-4 sm:p-6 bg-gray-900">
        <div class="text-center max-w-3xl w-full">
          <!-- Título principal -->
          <h1 class="text-3xl sm:text-4xl font-extrabold text-white mb-4">
            Converta seus Arquivos
          </h1>
          <!-- Subtítulo -->
          <p class="text-base sm:text-lg text-gray-400 mb-8">
            Transforme imagens, vídeos e documentos com facilidade.
          </p>

          <!-- Campo de entrada com ícones -->
          <div class="relative w-full mb-8">
            <textarea
              v-model="command"
              class="w-full bg-gray-800 border border-gray-700 rounded-lg p-4 pl-12 pr-12 text-white placeholder-gray-400 focus:outline-none focus:border-blue-500 transition resize-none"
              placeholder="O que vamos converter hoje?"
              @keyup.enter="handleSubmit"
              rows="3"
            ></textarea>

            <!-- Ícone do Paperclip -->
            <button
              @click="triggerFileInput"
              class="absolute left-4 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-white transition"
              aria-label="Anexar Arquivos"
            >
              <Paperclip class="w-5 h-5" />
            </button>

            <!-- Botão de Enviar -->
            <button
              @click="handleSubmit"
              class="absolute right-4 top-1/2 transform -translate-y-1/2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg p-2 transition"
              aria-label="Enviar"
            >
              <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M14 5l7 7m0 0l-7 7m7-7H3" />
              </svg>
            </button>
          </div>

          <!-- Pré-visualização de arquivos -->
          <div v-if="selectedFiles.length" class="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4 mb-8">
            <div
              v-for="(file, index) in selectedFiles"
              :key="file.name"
              class="relative bg-gray-800 border border-gray-700 rounded-lg overflow-hidden"
            >
              <img
                v-if="file.type.startsWith('image/')"
                :src="getFilePreview(file)"
                :alt="file.name"
                class="object-cover w-full h-40"
              />
              <div v-else class="p-4 text-gray-300 text-center">
                <p>{{ file.name }}</p>
              </div>
              <button
                @click="removeFile(index)"
                class="absolute top-2 right-2 bg-red-600 hover:bg-red-700 text-white rounded-full w-6 h-6 flex items-center justify-center transition"
              >
                &times;
              </button>
            </div>
          </div>

          <!-- Informações de conversão -->
          <div class="flex flex-wrap justify-center items-center gap-4">
            <span
              class="px-4 py-2 bg-transparent border border-gray-600 rounded-full text-gray-300 text-sm hover:bg-gray-700 hover:text-white transition cursor-pointer"
              @click="preFillCommand('Converta uma imagem para PNG')"
            >
              Converta Imagens
            </span>
            <span
              class="px-4 py-2 bg-transparent border border-gray-600 rounded-full text-gray-300 text-sm hover:bg-gray-700 hover:text-white transition cursor-pointer"
              @click="preFillCommand('Extraia o áudio de um vídeo em MP3')"
            >
              Converta Vídeos
            </span>
            <span
              class="px-4 py-2 bg-transparent border border-gray-600 rounded-full text-gray-300 text-sm hover:bg-gray-700 hover:text-white transition cursor-pointer"
              @click="preFillCommand('Converta um PDF para DOCX')"
            >
              Transforme PDFs
            </span>
            <span
              class="px-4 py-2 bg-transparent border border-gray-600 rounded-full text-gray-300 text-sm hover:bg-gray-700 hover:text-white transition cursor-pointer"
              @click="preFillCommand('Outro tipo de conversão')"
            >
              Outra Informação
            </span>
          </div>
        </div>
      </main>
    </div>

    <!-- Input de arquivo oculto -->
    <input
      type="file"
      id="fileInput"
      class="hidden"
      multiple
      @change="($event) => handleFiles(Array.from($event.target.files || []))"
    />
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, watch, nextTick } from 'vue';
import { useChatStore } from './stores/chat';
import { Paperclip } from 'lucide-vue-next';
import ChatMessage from './components/ChatMessage.vue';

const chatStore = useChatStore();
const command = ref('');
const selectedFiles = ref<File[]>([]);

// Referência para o container de mensagens
const messagesContainer = ref<HTMLElement | null>(null);

// Função para scroll automático
const scrollToBottom = () => {
  nextTick(() => {
    if (messagesContainer.value) {
      messagesContainer.value.scrollTo({
        top: messagesContainer.value.scrollHeight,
        behavior: 'smooth',
      });
    }
  });
};

// Monitora mudanças nas mensagens e no estado de digitação
watch(
  () => [chatStore.messages.length, chatStore.isProcessing],
  () => {
    scrollToBottom();
  }
);

// Scroll ao montar o componente
onMounted(() => {
  scrollToBottom();
});

function handleSubmit() {
  if (!command.value.trim() && !selectedFiles.value.length) return;
  chatStore.processFileCommand(command.value, selectedFiles.value);
  command.value = '';
  selectedFiles.value = [];
  scrollToBottom();
}

function triggerFileInput() {
  const fileInput = document.getElementById('fileInput') as HTMLInputElement;
  if (fileInput) fileInput.click();
}

function handleFiles(files: File[]) {
  selectedFiles.value = files;
}

function removeFile(index: number) {
  selectedFiles.value.splice(index, 1);
}

function getFilePreview(file: File) {
  if (file.type.startsWith('image/')) {
    return URL.createObjectURL(file);
  }
  return null;
}

// Função para pré-preencher o comando com base na seleção do usuário
function preFillCommand(text: string) {
  command.value = text;
}
</script>

<style scoped>
aside {
  height: 100vh;
}

.flex-1.overflow-y-auto {
  max-height: calc(100vh - 80px);
  overflow-y: auto;
}

.flex-1.overflow-y-auto::-webkit-scrollbar {
  width: 8px;
}

.flex-1.overflow-y-auto::-webkit-scrollbar-thumb {
  background-color: rgba(255, 255, 255, 0.2);
  border-radius: 4px;
}

.flex-1.overflow-y-auto::-webkit-scrollbar-thumb:hover {
  background-color: rgba(255, 255, 255, 0.3);
}

textarea {
  width: 100%;
  max-width: 100%;
}

button {
  padding: 0.5rem;
  min-width: 40px;
  height: 40px;
}

.text-white.text-sm {
  word-wrap: break-word;
  word-break: break-word;
}

/* Estilos para o indicador de digitação */
.animate-pulse {
  animation: pulse 1.5s infinite;
}

@keyframes pulse {
  0% {
    opacity: 0.5;
  }

  50% {
    opacity: 1;
  }

  100% {
    opacity: 0.5;
  }
}

/* Estilos para spans clicáveis */
span:hover {
  cursor: pointer;
}
</style>

<!-- src/components/ChatMessage.vue -->

<template>
  <div
    class="p-4 rounded-lg shadow-md"
    :class="[
      message.role === 'user'
        ? 'bg-blue-800 text-white self-end'
        : 'bg-gray-700 border border-gray-600 self-start',
      'mb-4 max-w-full md:max-w-md'
    ]"
  >
    <div class="flex items-start gap-3">
      <div
        :class="[
          'w-10 h-10 rounded-full flex items-center justify-center text-lg font-medium',
          message.role === 'user'
            ? 'bg-blue-500 text-white'
            : 'bg-purple-500 text-white'
        ]"
      >
        {{ message.role === 'user' ? 'U' : 'AI' }}
      </div>
      <div class="flex-1">
        <div class="text-sm text-gray-300 font-bold mb-1">
          {{ message.role === 'user' ? 'Você' : 'Assistente' }}
        </div>
        <div class="text-white text-sm whitespace-pre-wrap">
          {{ message.content }}
        </div>

        <!-- Pré-visualização de arquivos -->
        <div
          v-if="message.files?.length"
          class="mt-4 flex flex-wrap gap-4"
        >
          <div
            v-for="file in message.files"
            :key="file.name"
            class="relative rounded-lg overflow-hidden bg-gray-800 flex items-center justify-center"
            style="width: 120px; height: 120px;"
          >
            <!-- Imagem -->
            <img
              v-if="isImage(file)"
              :src="getFilePreview(file)"
              :alt="file.name"
              class="object-cover w-full h-full"
            />
            <!-- Nome do arquivo -->
            <div v-else class="text-xs text-gray-300 px-2 text-center">
              {{ file.name }}
            </div>
          </div>
        </div>

        <!-- Link de download -->
        <div v-if="message.downloadLink" class="mt-4">
          <a
            :href="message.downloadLink"
            class="text-blue-400 hover:text-blue-300 text-sm underline"
            download
          >
            Baixar arquivo convertido
          </a>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import type { Message } from "../types/chat";
import { onBeforeUnmount } from 'vue';

const props = defineProps<{
  message: Message;
}>();

const { message } = props;

let objectURLs: string[] = [];

function isImage(file: File): boolean {
  return file.type.startsWith("image/");
}

function getFilePreview(file: File): string | null {
  if (isImage(file)) {
    const url = URL.createObjectURL(file);
    objectURLs.push(url);
    return url;
  }
  return null;
}

// Revoke the created URLs when the component is destroyed to prevent memory leaks
onBeforeUnmount(() => {
  objectURLs.forEach((url) => {
    URL.revokeObjectURL(url);
  });
});
</script>

<style scoped>
/* Remover margem inferior do último elemento para evitar espaço extra */
:last-child {
  margin-bottom: 0;
}

/* Ajuste para mensagens alinhadas à direita e esquerda */
.self-end {
  align-self: flex-end;
}

.self-start {
  align-self: flex-start;
}

/* Garantir que as mensagens não ultrapassem a largura em telas maiores */
@media (min-width: 768px) {
  .max-w-md {
    max-width: 50%;
  }
}
</style>

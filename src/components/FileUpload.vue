<script setup lang="ts">
import { ref } from 'vue';
import { Upload } from 'lucide-vue-next';
import { useDropZone } from '@vueuse/core';

const emit = defineEmits<{
  (e: 'filesSelected', files: File[]): void;
}>();

const dropZoneRef = ref<HTMLDivElement>();
const files = ref<File[]>([]);

const { isOverDropZone } = useDropZone(dropZoneRef, {
  onDrop: (files) => handleFiles(Array.from(files)),
});

function handleFiles(newFiles: File[]) {
  files.value = newFiles;
  emit('filesSelected', newFiles);
}
</script>

<template>
  <div
    ref="dropZoneRef"
    class="border-4 border-dashed rounded-lg p-10 text-center transition-colors duration-300 bg-gradient-to-r from-gray-800 via-gray-700 to-gray-800 hover:from-purple-600 hover:to-indigo-600 shadow-md"
    :class="{
      'border-purple-400 bg-purple-600 bg-opacity-20': isOverDropZone,
      'border-gray-500': !isOverDropZone,
    }"
  >
    <Upload class="w-16 h-16 mx-auto mb-6 text-indigo-400 animate-pulse" />
    <p class="text-2xl font-semibold mb-4 text-indigo-300">Drag and drop files here</p>
    <p class="text-sm text-gray-300 mb-6">or</p>
    <label
      class="cursor-pointer bg-gradient-to-r from-purple-500 via-blue-500 to-indigo-600 text-white px-6 py-3 rounded-lg hover:from-purple-600 hover:to-indigo-700"
    >
      Choose Files
      <input
        type="file"
        multiple
        class="hidden"
        @change="handleFiles(Array.from($event.target.files || []))"
      />
    </label>
    <div v-if="files.length" class="mt-6">
      <p class="text-lg font-semibold text-purple-300">Selected files:</p>
      <ul class="text-sm text-gray-300 mt-2">
        <li v-for="file in files" :key="file.name" class="mb-2">
          {{ file.name }} ({{ (file.size / 1024).toFixed(1) }} KB)
        </li>
      </ul>
    </div>
  </div>
</template>

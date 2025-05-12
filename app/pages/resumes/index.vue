<template>
  <UContainer>
    <UPageHeader
      title="My Resume"
      description="Upload and manage your base resume."
    />

    <UPageBody>
      <UCard>
        <template #header>
          <h3 class="text-lg font-semibold">
            Upload Resume YO
          </h3>
        </template>

        <div v-if="!file" class="flex flex-col items-center gap-4">
          <UIcon name="i-heroicons-document-arrow-up" class="text-4xl text-gray-400 dark:text-gray-500" />
          <p class="text-sm text-gray-500 dark:text-gray-400">
            Upload your resume file (PDF, DOCX).
          </p>
          <UButton
            label="Select File"
            color="primary"
            variant="solid"
            @click="openFilePicker"
          />
          <input
            ref="fileInput"
            type="file"
            class="hidden"
            accept=".pdf,.doc,.docx,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
            @change="onFileChange"
          >
        </div>

        <div v-else class="flex flex-col items-center gap-4">
          <UIcon name="i-heroicons-document-check" class="text-4xl text-green-500" />
          <p class="font-medium">
            {{ file.name }}
          </p>
          <p class="text-sm text-gray-500 dark:text-gray-400">
            Size: {{ (file.size / 1024).toFixed(2) }} KB
          </p>
          <div class="flex gap-2">
            <UButton
              label="Change File"
              color="neutral"
              variant="solid"
              @click="openFilePicker"
            />
            <!-- TODO: Add view/delete functionality -->
          </div>
          <input
            ref="fileInput"
            type="file"
            class="hidden"
            accept=".pdf,.doc,.docx,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
            @change="onFileChange"
          >
        </div>
      </UCard>
    </UPageBody>
  </UContainer>
</template>

<script setup lang="ts">
// No need to import ref, Nuxt 3 auto-imports it
// import { ref } from 'vue'

const file = ref<File | null>(null)

function onFileChange(event: Event) {
  const input = event.target as HTMLInputElement
  if (input.files?.length) {
    const selectedFile = input.files[0]
    if (selectedFile) {
      file.value = selectedFile
      // TODO: Implement resume upload logic
      console.log('Selected file:', file.value.name)
    }
  } else {
    file.value = null
  }
}

const fileInput = ref<HTMLInputElement | null>(null)

function openFilePicker() {
  fileInput.value?.click()
}
</script>

<style lang="scss" scoped>

</style>

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

        <div v-if="!file && !uploading" class="flex flex-col items-center gap-4">
          <UIcon name="i-heroicons-document-arrow-up" class="text-4xl text-gray-400 dark:text-gray-500" />
          <p class="text-sm text-gray-500 dark:text-gray-400">
            Upload your resume file (PDF, DOCX, max 2MB).
          </p>
          <UButton
            label="Select File"
            color="primary"
            variant="solid"
            :loading="uploading"
            :disabled="uploading"
            @click="openFilePicker"
          />
          <input
            ref="fileInput"
            type="file"
            name="resumeFile"
            class="hidden"
            accept=".pdf,.doc,.docx,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
            @change="onFileChange"
          >
        </div>

        <div v-else-if="uploading" class="flex flex-col items-center gap-4 py-8">
          <UProgress animation="carousel" />
          <p class="text-sm text-gray-500 dark:text-gray-400">
            Uploading...
          </p>
        </div>

        <div v-else class="flex flex-col items-center gap-4">
          <UIcon name="i-heroicons-document-check" class="text-4xl text-green-500" />
          <p class="font-medium">
            {{ file?.name }}
          </p>
          <p v-if="file" class="text-sm text-gray-500 dark:text-gray-400">
            Size: {{ (file.size / 1024).toFixed(2) }} KB
          </p>
          <div class="flex gap-2">
            <UButton
              label="Change File"
              color="neutral"
              variant="solid"
              :loading="uploading"
              :disabled="uploading"
              @click="openFilePicker"
            />
            <!-- TODO: Add view/delete functionality -->
          </div>
          <input
            ref="fileInput"
            type="file"
            name="resumeFile"
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
// Assuming useUpload is auto-imported or available via #imports
// import { useUpload } from '#hub/vue' // Potential import path if not auto-imported

const toast = useToast()
const file = ref<File | null>(null)
const uploading = ref(false)
const fileInput = ref<HTMLInputElement | null>(null)

// Instantiate useUpload for the resumes endpoint
// The second argument configures the underlying $fetch request
const upload = useUpload('/api/resumes', {
  method: 'POST'
  // Removed 'key' option, as it's inferred from the input's name attribute
  // key: 'resumeFile'
})

async function onFileChange(event: Event) {
  const input = event.target as HTMLInputElement
  if (!input.files?.length) {
    file.value = null
    return
  }

  const selectedFile = input.files[0]
  if (!selectedFile) {
    file.value = null
    return
  }

  console.log(
    `UI: Selected file - Name: ${selectedFile.name}, Size: ${selectedFile.size}, Type: ${selectedFile.type}`
  )

  uploading.value = true
  file.value = selectedFile // Optimistically show selected file

  try {
    // Call the upload function provided by useUpload
    // It expects the HTMLInputElement as argument
    console.log('UI: Calling upload(input)...')
    const result = await upload(input)
    console.log('UI: upload(input) returned:', result)

    // On success, keep the file displayed
    toast.add({ title: 'Resume uploaded successfully!', icon: 'i-heroicons-check-circle' })
    console.log('Upload result:', result)
  } catch (error) {
    console.error('Upload error:', error)
    // Reset file ref on error
    file.value = null

    let description = 'Could not upload resume.'
    // Check if the error object has a 'data' property and a 'message' within it
    if (error && typeof error === 'object' && 'data' in error && error.data && typeof error.data === 'object' && 'message' in error.data) {
      description = String(error.data.message) // Use specific API message
    } else if (error instanceof Error) {
      description = error.message // Use generic error message
    }

    toast.add({ title: 'Upload failed', description, color: 'error' })
  } finally {
    uploading.value = false
    // Reset the file input value so the same file can be selected again if needed
    if (fileInput.value) {
      fileInput.value.value = ''
    }
  }
}

// Removed the uploadResume function as its logic is now handled by useUpload

function openFilePicker() {
  // Don't open picker if already uploading
  if (uploading.value) return
  fileInput.value?.click()
}
</script>

<style lang="scss" scoped>

</style>

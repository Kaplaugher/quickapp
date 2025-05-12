<template>
  <UContainer>
    <UPageHeader
      title="My Resume"
      description="Upload and manage your base resume."
    />

    <UPageBody>
      <UCard class="mb-8">
        <template #header>
          <h3 class="text-lg font-semibold">
            Upload New Resume
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
          <p class="text-sm text-green-600 dark:text-green-400">
            Uploaded successfully!
          </p>
          <UButton
            label="Upload Another"
            color="primary"
            variant="outline"
            :loading="uploading"
            :disabled="uploading"
            @click="resetUploadState"
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
      </UCard>

      <UCard>
        <template #header>
          <h3 class="text-lg font-semibold">
            My Uploaded Resumes
          </h3>
        </template>

        <div v-if="pending" class="flex justify-center items-center py-4">
          <UIcon name="i-heroicons-arrow-path" class="animate-spin text-2xl" />
        </div>
        <div v-else-if="error || !resumes" class="text-center py-4 text-red-500">
          Error loading resumes: {{ error?.data?.message || 'Unknown error' }}
        </div>
        <div v-else-if="resumes.length === 0" class="text-center py-4 text-gray-500 dark:text-gray-400">
          No resumes uploaded yet.
        </div>
        <div v-else>
          <ul class="divide-y divide-gray-200 dark:divide-gray-700">
            <li v-for="resume in resumes" :key="resume.pathname" class="py-3 flex justify-between items-center">
              <div>
                <p class="font-medium truncate">
                  {{ getFileName(resume.pathname) }}
                </p>
                <p class="text-sm text-gray-500 dark:text-gray-400">
                  Uploaded: {{ formatDate(resume.uploadedAt) }}
                </p>
              </div>
              <div class="flex items-center gap-2">
                <UButton
                  icon="i-heroicons-eye"
                  size="sm"
                  color="neutral"
                  variant="ghost"
                  aria-label="View"
                  disabled
                />
                <UButton
                  icon="i-heroicons-trash"
                  size="sm"
                  color="error"
                  variant="ghost"
                  aria-label="Delete"
                  disabled
                />
              </div>
            </li>
          </ul>
        </div>
      </UCard>
    </UPageBody>
  </UContainer>
</template>

<script setup lang="ts">
// Define the structure based on the API response
interface ResumeBlobObject {
  pathname: string
  contentType?: string
  size: number
  uploadedAt: string // API likely returns string
  customMetadata?: { userId?: string }
  httpEtag?: string
  httpMetadata?: Record<string, string>
}

const toast = useToast()
const file = ref<File | null>(null)
const uploading = ref(false)
const fileInput = ref<HTMLInputElement | null>(null)

// Fetch the list of resumes
const { data: resumes, pending, error, refresh } = useFetch<ResumeBlobObject[]>('/api/resumes', {
  lazy: true, // Don't block navigation
  server: false // Fetch only on the client-side after mount
})

const upload = useUpload('/api/resumes', {
  method: 'POST'
})

// Helper to extract filename from pathname
function getFileName(pathname: string): string {
  return pathname.split('/').pop() || pathname
}

// Helper to format date
function formatDate(dateString: string): string {
  return new Date(dateString).toLocaleDateString(undefined, {
    year: 'numeric', month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit'
  })
}

// Function to clear the upload state and show the initial upload prompt
function resetUploadState() {
  file.value = null
  // We don't necessarily need to clear fileInput.value here
  // as selecting a new file will trigger onFileChange anyway.
}

async function onFileChange(event: Event) {
  const input = event.target as HTMLInputElement
  if (!input.files?.length) {
    // No file selected or selection cancelled
    // Don't reset file.value here if an upload was just successful
    return
  }

  const selectedFile = input.files[0]
  if (!selectedFile) {
    return
  }

  console.log(
    `UI: Selected file - Name: ${selectedFile.name}, Size: ${selectedFile.size}, Type: ${selectedFile.type}`
  )

  uploading.value = true
  // Don't set file.value here yet, set it only on *successful* upload
  // file.value = selectedFile

  try {
    console.log('UI: Calling upload(input)...')
    const result = await upload(input)
    console.log('UI: upload(input) returned:', result)

    // Upload succeeded, now set the file value for display
    file.value = selectedFile
    toast.add({ title: 'Resume uploaded successfully!', icon: 'i-heroicons-check-circle' })
    console.log('Upload result:', result)

    // Refresh the list of resumes after successful upload
    await refresh()
  } catch (error) {
    console.error('Upload error:', error)
    file.value = null // Clear file display on error

    let description = 'Could not upload resume.'
    if (error && typeof error === 'object' && 'data' in error && error.data && typeof error.data === 'object' && 'message' in error.data) {
      description = String(error.data.message)
    } else if (error instanceof Error) {
      description = error.message
    }

    toast.add({ title: 'Upload failed', description, color: 'error' })
  } finally {
    uploading.value = false
    // Reset the file input value so the same file can be selected again
    if (fileInput.value) {
      fileInput.value.value = ''
    }
  }
}

function openFilePicker() {
  if (uploading.value) return
  fileInput.value?.click()
}
</script>

<style  scoped>
/* Add any specific styles if needed */
</style>

<script setup lang="ts">
interface ResumeBlob {
  pathname: string
  contentType?: string
  size: number
  uploadedAt: Date | string
  customMetadata?: {
    userId?: string
    [key: string]: string | undefined
  }
  httpEtag?: string
  httpMetadata?: Record<string, string>
}

interface SelectMenuItem {
  label: string
  value: string
}

const props = defineProps<{
  modelValue?: string
}>()

const emit = defineEmits<{
  (e: 'update:modelValue', value?: string): void
}>()

const { data: rawResumes, pending, error } = await useFetch<ResumeBlob[]>(
  '/api/resumes',
  {
    default: () => [],
    lazy: true // Non-blocking, but will fetch on server if possible
  }
)

const resumes = computed<SelectMenuItem[]>(() => {
  if (!rawResumes.value || !Array.isArray(rawResumes.value)) {
    return []
  }
  const mappedItems = rawResumes.value.map(resume => ({
    label: resume.pathname.split('/').pop() || 'Unnamed Resume',
    value: resume.pathname
  }))
  return mappedItems
})

const currentSelection = computed({
  get: () => props.modelValue,
  set: (value) => {
    emit('update:modelValue', value)
  }
})

if (error.value) {
  console.error('Error fetching resumes in ResumeSelect:', error.value)
  // Consider providing a user-facing error message or state here
  // For example, you could set a ref that the template can use to show an error.
}
</script>

<template>
  <USelectMenu
    v-if="!error"
    :key="`resume-select-${resumes.length}`"
    v-model="currentSelection"
    :items="resumes"
    placeholder="Select a resume"
    value-key="value"
    option-attribute="label"
    :loading="pending"
  />
  <div v-else class="text-sm text-red-500">
    Could not load resumes. (Are you logged in?)
  </div>
</template>

<script setup lang="ts">
import type { DefineComponent } from 'vue'
import { useChat, type Message } from '@ai-sdk/vue'
import { useClipboard } from '@vueuse/core'
import ProseStreamPre from '../../components/prose/PreStream.vue'

// Define the Attachment type based on AI SDK expectations
interface Attachment {
  name?: string
  contentType?: string
  url: string // URL is required by the SDK's type
  content?: Uint8Array | string // Provide content directly for robustness
}

// Helper function to convert ArrayBuffer to Base64
function arrayBufferToBase64(buffer: ArrayBuffer): string {
  let binary = ''
  const bytes = new Uint8Array(buffer)
  const len = bytes.byteLength
  for (let i = 0; i < len; i++) {
    binary += String.fromCharCode(bytes[i] as number)
  }
  return btoa(binary)
}

const components = {
  pre: ProseStreamPre as unknown as DefineComponent
}

const route = useRoute()
const toast = useToast()
const clipboard = useClipboard()

const selectedFileForAttachment = ref<File | null>(null)

function handleFileChange(event: Event) {
  const target = event.target as HTMLInputElement
  if (target.files && target.files[0]) {
    selectedFileForAttachment.value = target.files[0]
  } else {
    selectedFileForAttachment.value = null
  }
}

const { data: chat } = await useFetch(`/api/chats/${route.params.id}`, {
  cache: 'force-cache'
})
if (!chat.value) {
  throw createError({ statusCode: 404, statusMessage: 'Chat not found', fatal: true })
}

const { messages, input, handleSubmit, reload, stop, status, error } = useChat({
  id: chat.value.id,
  api: `/api/chats/${chat.value.id}`,
  initialMessages: chat.value.messages.map(message => ({
    id: message.id,
    content: message.content,
    role: message.role
  })),

  onResponse(response) {
    if (response.headers.get('X-Chat-Title')) {
      refreshNuxtData('chats')
    }
  },
  onError(error) {
    const { message } = typeof error.message === 'string' && error.message[0] === '{' ? JSON.parse(error.message) : error
    toast.add({
      description: message,
      icon: 'i-lucide-alert-circle',
      color: 'error',
      duration: 0
    })
  }
})

const copied = ref(false)

function copy(e: MouseEvent, message: Message) {
  clipboard.copy(message.content)

  copied.value = true

  setTimeout(() => {
    copied.value = false
  }, 2000)
}

async function submitMessage(event: Event | undefined) {
  let attachmentsForSubmit: Attachment[] | undefined

  if (selectedFileForAttachment.value) {
    try {
      const file = selectedFileForAttachment.value
      const fileContentArrayBuffer = await file.arrayBuffer()
      const fileContentUint8Array = new Uint8Array(fileContentArrayBuffer)
      const base64String = arrayBufferToBase64(fileContentArrayBuffer)
      const dataUrl = `data:${file.type};base64,${base64String}`

      attachmentsForSubmit = [{
        name: file.name,
        contentType: file.type,
        url: dataUrl,
        content: fileContentUint8Array
      }]
    } catch (e) {
      console.error('Error processing file:', e)
      toast.add({
        title: 'Error Processing File',
        description: 'Could not process the selected file.',
        icon: 'i-lucide-alert-circle',
        color: 'error'
      })
      return // Stop submission if file can't be processed
    }
  }

  await handleSubmit(event, {
    experimental_attachments: attachmentsForSubmit
  })

  // Reset file input and selection
  selectedFileForAttachment.value = null
}

onMounted(() => {
  if (chat.value?.messages.length === 1) {
    reload()
  }
})
</script>

<template>
  <UDashboardPanel id="chat" class="relative" :ui="{ body: 'p-0 sm:p-0' }">
    <template #header>
      <DashboardNavbar />
    </template>

    <template #body>
      <UContainer class="flex-1 flex flex-col gap-4 sm:gap-6">
        <UChatMessages
          :messages="messages"
          :status="status"
          :assistant="{ actions: [{ label: 'Copy', icon: copied ? 'i-lucide-copy-check' : 'i-lucide-copy', onClick: copy }] }"
          class="lg:pt-(--ui-header-height) pb-4 sm:pb-6"
          :spacing-offset="160"
        >
          <template #content="{ message }">
            <MDCCached
              :value="message.content"
              :cache-key="message.id"
              unwrap="p"
              :components="components"
              :parser-options="{ highlight: false }"
            />
          </template>
        </UChatMessages>

        <UChatPrompt
          v-model="input"
          :error="error"
          variant="subtle"
          class="sticky bottom-0 [view-transition-name:chat-prompt] rounded-b-none z-10"
          placeholder="Type a message..."
          autofocus
          :autofocus-delay="100"
          autoresize
          :autoresize-delay="100"
          :rows="1"
          :maxrows="5"
          icon="i-heroicons-chat-bubble-left-right"
          :loading="status === 'streaming' || status === 'submitted'"
          loading-icon="i-heroicons-arrow-path"
          :avatar="{ src: '', alt: 'User' }"
          @submit="submitMessage"
        >
          <UChatPromptSubmit
            :status="status"
            color="neutral"
            @stop="stop"
            @reload="reload"
          />
          <template #footer>
            <UInput
              type="file"
              accept=".pdf,.doc,.docx,.txt,.md"
              class="mt-2"
              @change="handleFileChange"
            />
          </template>
        </UChatPrompt>
      </UContainer>
    </template>
  </UDashboardPanel>
</template>

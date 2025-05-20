import { streamText, generateText } from 'ai'
import { createGoogleGenerativeAI } from '@ai-sdk/google'

defineRouteMeta({
  openAPI: {
    description: 'Chat with AI.',
    tags: ['ai']
  }
})

export default defineEventHandler(async (event) => {
  const session = await getUserSession(event)

  const { id } = getRouterParams(event)
  // TODO: Use readValidatedBody
  const { model: modelId, messages, data } = await readBody(event)
  const resumeId = data?.resumeId

  const db = useDrizzle()

  // Initialize Google AI
  const apiKey = useRuntimeConfig().googleAiApiKey as string
  if (!apiKey) throw new Error('Missing Google API key')
  const google = createGoogleGenerativeAI({
    apiKey
  })

  interface MessageContentPart {
    type: 'text' | 'image' | 'file' | 'tool-call' | 'tool-result' // Added more general types from Vercel AI SDK
    text?: string
    toolCallId?: string
    toolName?: string
    args?: unknown
    result?: unknown
    // Add other part-specific properties like 'url' for images/files if applicable
  }

  let resumeContent: string | undefined
  if (resumeId) {
    const resumeResult = await db.select({
      id: tables.resumes.id,
      content: tables.resumes.content
    })
      .from(tables.resumes)
      .where(eq(tables.resumes.id, resumeId as string))
      .limit(1)

    if (resumeResult.length > 0) {
      resumeContent = resumeResult[0].content
    }
  }

  const chat = await db.query.chats.findFirst({
    where: (chat, { eq }) => and(eq(chat.id, id as string), eq(chat.userId, session.user?.id || session.id)),
    with: {
      messages: true
    }
  })
  if (!chat) {
    throw createError({ statusCode: 404, statusMessage: 'Chat not found' })
  }

  if (!chat.title) {
    // Use generateText for non-streaming title generation
    const { text: title } = await generateText({
      model: google('gemini-2.0-flash'),
      system: `You are a title generator for a chat:
        - Generate a short title based on the first user's message
        - The title should be less than 30 characters long
        - The title should be a summary of the user's message
        - Do not use quotes (' or ") or colons (:) or any other punctuation
        - Do not use markdown, just plain text`,
      messages: [{
        role: 'user',
        content: chat.messages[0]!.content
      }]
    })
    const cleanTitle = title.replace(/:/g, '').split('\n')[0]
    setHeader(event, 'X-Chat-Title', cleanTitle)
    await db.update(tables.chats).set({ title: cleanTitle }).where(eq(tables.chats.id, id as string))
  }

  const lastMessage = messages[messages.length - 1]
  if (lastMessage.role === 'user' && messages.length > 1) {
    // The Vercel AI SDK sends attachments as part of the content array.
    // We need to extract the text part to save to the database.
    let userContent = ''
    if (Array.isArray(lastMessage.content)) {
      const textPart = lastMessage.content.find((part: MessageContentPart) => part.type === 'text')
      if (textPart && textPart.text) {
        userContent = textPart.text
      }
    } else {
      userContent = lastMessage.content
    }

    if (userContent) {
      await db.insert(tables.messages).values({
        chatId: id as string,
        role: 'user',
        content: userContent
      })
    }
  }

  // Construct the system prompt, including resume context if available
  let systemPrompt = 'You are a helpful assistant that can answer questions and help.'
  if (resumeContent) {
    systemPrompt += `\n\nThe user has provided the following resume. Please use it to inform your answers if relevant:\n\n<resume_content>
${resumeContent}
</resume_content>`
  }
  if (resumeId && !resumeContent) {
    systemPrompt += '\n\nNote: The user attempted to provide a resume, but it could not be loaded. You can inform the user if their query seems to relate to a resume.'
  }

  return streamText({
    model: google(modelId || 'gemini-1.5-flash-latest'), // Updated to a newer model that is more likely to support multimodal inputs if the SDK handles it.
    maxTokens: 10000,
    system: systemPrompt,
    messages,
    async onFinish(response) {
      await db.insert(tables.messages).values({
        chatId: chat.id,
        role: 'assistant',
        content: response.text
      })
    }
  }).toDataStreamResponse()
})

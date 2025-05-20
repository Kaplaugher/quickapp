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
  const { model: modelId, messages } = await readBody(event)

  const db = useDrizzle()

  // Initialize Google AI
  const apiKey = useRuntimeConfig().googleAiApiKey as string
  if (!apiKey) throw new Error('Missing Google API key')
  const google = createGoogleGenerativeAI({
    apiKey
  })

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
    await db.insert(tables.messages).values({
      chatId: id as string,
      role: 'user',
      content: lastMessage.content
    })
  }

  return streamText({
    model: google(modelId || 'gemini-2.0-flash'),
    maxTokens: 10000,
    system: 'You are a helpful assistant that can answer questions and help.',
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

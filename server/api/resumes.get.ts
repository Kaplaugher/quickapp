// Define an interface for the expected structure of BlobObject with customMetadata
// Adjust this based on the actual structure if needed
interface ResumeBlobObject {
  pathname: string
  contentType?: string
  size: number
  uploadedAt: Date | string // uploadedAt might be string or Date
  customMetadata?: {
    userId?: string
    [key: string]: string | undefined
  }
  // Include other potential fields from BlobObject if necessary
  httpEtag?: string
  httpMetadata?: Record<string, string>
}

export default defineEventHandler(async (event) => {
  console.log('API: /api/resumes GET received')
  const session = await getUserSession(event)
  const userId = session.user?.id || session.id
  console.log('API: Fetched userId:', userId)

  if (!userId) {
    console.error('API: Unauthorized - User session not found for GET.')
    throw createError({
      statusCode: 401,
      statusMessage: 'Unauthorized: User session not found.'
    })
  }

  try {
    const userPrefix = `resumes/${userId}/`
    console.log(`API: Listing blobs with prefix '${userPrefix}'...`)

    const { blobs } = await hubBlob().list({ prefix: userPrefix })

    console.log(`API: Found ${blobs.length} blobs directly for user ${userId}.`)

    const userResumes = blobs as ResumeBlobObject[]

    // Sort by upload date, newest first (optional)
    userResumes.sort((a, b) => {
      const dateA = new Date(a.uploadedAt).getTime()
      const dateB = new Date(b.uploadedAt).getTime()
      return dateB - dateA
    })

    return userResumes
  } catch (error) {
    console.error('API: Error listing resumes:', error)
    let message = 'Failed to list resumes.'
    if (error instanceof Error) {
      message = error.message
    }
    throw createError({
      statusCode: 500,
      statusMessage: message
    })
  }
})

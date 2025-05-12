export default defineEventHandler(async (event) => {
  // Extract the full pathname from the route parameters
  // Use the parameter name defined in the file name: 'pathname'
  const pathname = getRouterParam(event, 'pathname') || ''
  console.log(`API: DELETE /api/resumes/${pathname} received`)

  if (!pathname) {
    throw createError({
      statusCode: 400,
      statusMessage: 'Missing resume pathname.'
    })
  }

  // Get user session data
  const session = await getUserSession(event)
  const userId = session.user?.id || session.id
  console.log('API: Fetched userId:', userId)

  if (!userId) {
    console.error('API: Unauthorized - User session not found for DELETE.')
    throw createError({
      statusCode: 401,
      statusMessage: 'Unauthorized: User session not found.'
    })
  }

  try {
    // 1. Fetch blob metadata to verify ownership
    console.log(`API: Fetching metadata for pathname: ${pathname}`)
    const blobMeta = await hubBlob().head(pathname)

    if (!blobMeta) {
      console.warn(`API: Blob not found for deletion: ${pathname}`)
      throw createError({
        statusCode: 404,
        statusMessage: 'Resume not found.'
      })
    }

    // 2. Verify ownership using customMetadata
    if (blobMeta.customMetadata?.userId !== userId) {
      console.error(`API: Unauthorized delete attempt by user ${userId} on blob owned by ${blobMeta.customMetadata?.userId}`)
      throw createError({
        statusCode: 403,
        statusMessage: 'Forbidden: You do not own this resume.'
      })
    }

    // 3. Delete the blob if verification passes
    console.log(`API: Deleting blob: ${pathname} for user: ${userId}`)
    await hubBlob().del(pathname)
    console.log(`API: Successfully deleted blob: ${pathname}`)

    // 4. Send No Content response
    return sendNoContent(event, 204)
  } catch (error) {
    // Handle potential errors (e.g., blob not found, permission issues)
    console.error(`API: Error deleting resume ${pathname}:`, error)
    // Don't throw the original error if it's one we already created (like 404, 403)
    // Check if it's an H3Error with a statusCode
    if (error && typeof error === 'object' && 'statusCode' in error && typeof error.statusCode === 'number' && error.statusCode >= 400 && error.statusCode < 500) {
      throw error
    }
    // Throw a generic server error for unexpected issues
    let message = 'Failed to delete resume.'
    if (error instanceof Error) {
      message = error.message
    }
    throw createError({
      statusCode: 500,
      statusMessage: message
    })
  }
})

export default eventHandler(async (event) => {
  console.log('API: /api/resumes POST received')
  // Get user session data
  const session = await getUserSession(event)
  const userId = session.user?.id || session.id
  console.log('API: Fetched userId:', userId)

  // Ensure userId is available
  if (!userId) {
    console.error('API: Unauthorized - User session not found.')
    throw createError({
      statusCode: 401,
      statusMessage: 'Unauthorized: User session not found.'
    })
  }

  try {
    console.log('API: Attempting hubBlob().handleUpload with formKey: \'files\', multiple: true, and validation...')
    // Use handleUpload for simplified file handling
    const blobs = await hubBlob().handleUpload(event, {
      // ---> Changed to 'files' based on examples and hypothesis <---
      formKey: 'files',
      // Changed to true based on working example
      multiple: true,
      // ---> Reinstated ensure block <---
      ensure: {
        types: ['application/pdf', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'],
        maxSize: '2MB'
      },
      // Options for storing the blob
      put: {
        // Store files under a 'resumes/' prefix
        prefix: 'resumes',
        // Keep the original filename, don't add a random suffix
        addRandomSuffix: false,
        // Add user-specific metadata
        customMetadata: { userId }
      }
    })

    console.log('API: hubBlob().handleUpload returned:', JSON.stringify(blobs, null, 2))

    // Since multiple is true, result is an array. Return the first element if it exists.
    if (blobs && blobs.length > 0) {
      console.log('API: Returning first blob from array.')
      return blobs[0]
    } else {
      // This case might indicate an issue if a file was expected
      console.error('API: handleUpload returned empty array. Check formKey and ensure file is sent correctly.')
      throw createError({
        statusCode: 400,
        statusMessage: 'No valid resume file was uploaded or file key mismatch.'
      })
    }
  } catch (error) {
    console.error('API: Error in hubBlob().handleUpload:', error)
    // Handle potential errors (e.g., validation errors)
    let errorMessage = 'Unknown error during resume upload'
    if (error instanceof Error) {
      errorMessage = error.message
    }
    // Log the original error for debugging if needed
    // console.error('Resume upload error:', error)

    throw createError({
      statusCode: 400,
      statusMessage: `Failed to upload resume: ${errorMessage}`
    })
  }
})

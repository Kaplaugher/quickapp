interface SelectedResume {
  file: Ref<File | null>
  id: Ref<string | null>
}

export const useSelectedResume = (): SelectedResume => {
  const selectedResumeFile = useState<File | null>('selectedResumeFile', () => null)
  const selectedResumeId = useState<string | null>('selectedResumeId', () => null)

  return {
    file: selectedResumeFile,
    id: selectedResumeId
  }
}

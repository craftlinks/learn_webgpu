export const loadFile = async (path: string): Promise<string> => {
  const response = await fetch(path)
  if (response.ok) {
    const content = await response.text()
    return content
  } else {
    throw new Error(`Error loading: ${path}`)
  }
}

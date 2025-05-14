import type { Document } from '../types/regions';

export async function loadDocumentContent(contentPath: string): Promise<Document> {
  try {
    const response = await fetch(`/data/${contentPath}`);
    if (!response.ok) {
      throw new Error(`Failed to load document content: ${response.statusText}`);
    }
    return await response.json();
  } catch (error) {
    console.error('Error loading document content:', error);
    throw error;
  }
} 
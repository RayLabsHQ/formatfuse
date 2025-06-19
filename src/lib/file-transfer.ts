/**
 * File transfer utilities for passing files between pages
 * Uses sessionStorage for temporary file storage
 */

const FILE_STORAGE_KEY = 'ff_pending_file';
const FILE_METADATA_KEY = 'ff_pending_file_meta';

export interface FileMetadata {
  name: string;
  size: number;
  type: string;
  lastModified: number;
}

/**
 * Store a file temporarily for transfer to another page
 */
export async function storeFileForTransfer(file: File): Promise<boolean> {
  try {
    // Store file metadata
    const metadata: FileMetadata = {
      name: file.name,
      size: file.size,
      type: file.type,
      lastModified: file.lastModified
    };
    sessionStorage.setItem(FILE_METADATA_KEY, JSON.stringify(metadata));

    // Convert file to base64 for storage
    const arrayBuffer = await file.arrayBuffer();
    const base64 = btoa(
      new Uint8Array(arrayBuffer)
        .reduce((data, byte) => data + String.fromCharCode(byte), '')
    );
    
    // Check if file is too large for sessionStorage (typically ~5-10MB limit)
    try {
      sessionStorage.setItem(FILE_STORAGE_KEY, base64);
      return true;
    } catch (e) {
      // If storage fails (likely quota exceeded), clean up
      sessionStorage.removeItem(FILE_METADATA_KEY);
      console.error('File too large for session storage');
      return false;
    }
  } catch (error) {
    console.error('Error storing file:', error);
    return false;
  }
}

/**
 * Retrieve a stored file and clear storage
 */
export async function retrieveStoredFile(): Promise<File | null> {
  try {
    const base64 = sessionStorage.getItem(FILE_STORAGE_KEY);
    const metadataJson = sessionStorage.getItem(FILE_METADATA_KEY);
    
    if (!base64 || !metadataJson) {
      return null;
    }

    // Parse metadata
    const metadata: FileMetadata = JSON.parse(metadataJson);

    // Convert base64 back to file
    const binaryString = atob(base64);
    const bytes = new Uint8Array(binaryString.length);
    for (let i = 0; i < binaryString.length; i++) {
      bytes[i] = binaryString.charCodeAt(i);
    }
    
    const blob = new Blob([bytes], { type: metadata.type });
    const file = new File([blob], metadata.name, {
      type: metadata.type,
      lastModified: metadata.lastModified
    });

    // Clear storage after retrieval
    clearStoredFile();
    
    return file;
  } catch (error) {
    console.error('Error retrieving stored file:', error);
    clearStoredFile();
    return null;
  }
}

/**
 * Check if there's a file waiting to be processed
 */
export function hasStoredFile(): boolean {
  return sessionStorage.getItem(FILE_STORAGE_KEY) !== null;
}

/**
 * Clear stored file data
 */
export function clearStoredFile(): void {
  sessionStorage.removeItem(FILE_STORAGE_KEY);
  sessionStorage.removeItem(FILE_METADATA_KEY);
}

/**
 * Alternative approach using a simple in-memory store for same-session transfers
 * This won't persist across page refreshes but works for larger files
 */
class FileTransferStore {
  private static instance: FileTransferStore;
  private pendingFile: File | null = null;

  static getInstance(): FileTransferStore {
    if (!FileTransferStore.instance) {
      FileTransferStore.instance = new FileTransferStore();
    }
    return FileTransferStore.instance;
  }

  setFile(file: File): void {
    this.pendingFile = file;
  }

  getFile(): File | null {
    const file = this.pendingFile;
    this.pendingFile = null; // Clear after retrieval
    return file;
  }

  hasFile(): boolean {
    return this.pendingFile !== null;
  }
}

export const fileTransferStore = FileTransferStore.getInstance();
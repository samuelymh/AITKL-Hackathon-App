import { supabase } from "@/lib/supabase";

export interface UploadedFile {
  id: string;
  name: string;
  size: number;
  url: string;
  path: string;
  uploadedAt: Date;
}

export interface FileUploadOptions {
  storageName?: string;
  maxFileSize?: number; // in bytes
  allowedTypes?: string[];
}

export class SupabaseStorageService {
  private defaultOptions: FileUploadOptions = {
    storageName: 'medical-records',
    maxFileSize: 100 * 1024 * 1024, // 100MB
    allowedTypes: ['application/pdf']
  };

  /**
   * Upload a file to Supabase storage
   */
  async uploadFile(
    file: File, 
    userId: string, 
    options: FileUploadOptions = {}
  ): Promise<UploadedFile> {
    const opts = { ...this.defaultOptions, ...options };
    
    // Validate file type
    if (opts.allowedTypes && !opts.allowedTypes.some(type => file.type.includes(type))) {
      throw new Error(`Invalid file type. Allowed types: ${opts.allowedTypes.join(', ')}`);
    }

    // Validate file size
    if (opts.maxFileSize && file.size > opts.maxFileSize) {
      throw new Error(`File size must be less than ${this.formatFileSize(opts.maxFileSize)}`);
    }

    // Generate unique filename with user ID folder
    const timestamp = Date.now();
    const fileName = `${userId}/${timestamp}-${file.name}`;
    
    const { data, error } = await supabase.storage
      .from(opts.storageName!)
      .upload(fileName, file, {
        cacheControl: '3600',
        upsert: false
      });

    if (error) {
      throw new Error(`Upload failed: ${error.message}`);
    }

    // Get public URL
    const { data: urlData } = supabase.storage
      .from(opts.storageName!)
      .getPublicUrl(fileName);

    return {
      id: data.path,
      name: file.name,
      size: file.size,
      url: urlData.publicUrl,
      path: data.path,
      uploadedAt: new Date(),
    };
  }

  /**
   * List all files for a user
   */
  async listUserFiles(
    userId: string, 
    storageName: string = 'medical-records'
  ): Promise<UploadedFile[]> {
    const { data: files, error } = await supabase.storage
      .from(storageName)
      .list(`${userId}/`, {
        limit: 100,
        offset: 0,
        sortBy: { column: 'created_at', order: 'desc' }
      });

    if (error) {
      throw new Error(`Failed to list files: ${error.message}`);
    }

    if (!files?.length) {
      return [];
    }

    const uploadedFiles: UploadedFile[] = [];
    
    for (const file of files) {
      if (file?.name) {
        // Get public URL for each file
        const { data: urlData } = supabase.storage
          .from(storageName)
          .getPublicUrl(`${userId}/${file.name}`);

        // Extract original filename from the stored filename (remove timestamp prefix)
        const originalName = file.name.replace(/^\d+-/, '');
        
        const uploadedFile: UploadedFile = {
          id: `${userId}/${file.name}`, // Use the full path as unique ID
          name: originalName,
          size: file.metadata?.size || 0,
          url: urlData.publicUrl,
          path: `${userId}/${file.name}`,
          uploadedAt: new Date(file.created_at || Date.now()),
        };

        uploadedFiles.push(uploadedFile);
      }
    }

    return uploadedFiles;
  }

  /**
   * Get a signed URL for viewing a file
   */
  async getSignedUrl(
    filePath: string, 
    storageName: string = 'medical-records',
    expirySeconds: number = 60
  ): Promise<string> {
    const { data, error } = await supabase.storage
      .from(storageName)
      .createSignedUrl(filePath, expirySeconds);

    if (error) {
      throw new Error(`Failed to create signed URL: ${error.message}`);
    }

    return data.signedUrl;
  }

  /**
   * Delete a file from storage
   */
  async deleteFile(
    filePath: string, 
    storageName: string = 'medical-records'
  ): Promise<void> {
    const { error } = await supabase.storage
      .from(storageName)
      .remove([filePath]);

    if (error) {
      throw new Error(`Failed to delete file: ${error.message}`);
    }
  }

  /**
   * View a file (opens in new tab)
   */
  async viewFile(
    file: UploadedFile, 
    storageName: string = 'medical-records'
  ): Promise<void> {
    try {
      // First, try to get a fresh download URL (in case the previous one expired)
      const signedUrl = await this.getSignedUrl(file.path, storageName, 60);
      window.open(signedUrl, '_blank');
    } catch (error) {
      // Fallback to the stored URL if signed URL fails
      if (file.url) {
        window.open(file.url, '_blank');
      } else {
        throw new Error('Unable to open the file. Please try again.');
      }
    }
  }

  /**
   * Utility function to format file size
   */
  formatFileSize(bytes: number): string {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  }
}

// Export a singleton instance
export const supabaseStorageService = new SupabaseStorageService(); 
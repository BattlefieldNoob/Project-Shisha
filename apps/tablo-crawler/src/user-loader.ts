import { readFile } from 'fs/promises';

export interface UserLoader {
  loadUserIds(filePath: string): Promise<number[]>;
}

export class FileUserLoader implements UserLoader {
  async loadUserIds(filePath: string): Promise<number[]> {
    try {
      console.log(`📂 Loading user IDs from ${filePath}...`);
      const content = await readFile(filePath, 'utf-8');
      const userIds: number[] = [];
      const errors: string[] = [];
      
      const lines = content.split('\n');
      
      for (let i = 0; i < lines.length; i++) {
        const line = lines[i].trim();
        
        // Skip empty lines and comments
        if (!line || line.startsWith('#')) {
          continue;
        }
        
        // Extract user ID (handle inline comments)
        const userIdStr = line.split('#')[0].trim();
        
        if (!userIdStr) {
          continue;
        }
        
        const userId = parseInt(userIdStr, 10);
        
        if (isNaN(userId)) {
          const errorMsg = `Invalid user ID "${userIdStr}" on line ${i + 1}`;
          console.warn(`⚠️  ${errorMsg}, skipping`);
          errors.push(errorMsg);
          continue;
        }

        if (userId <= 0) {
          const errorMsg = `User ID must be positive on line ${i + 1}: ${userId}`;
          console.warn(`⚠️  ${errorMsg}, skipping`);
          errors.push(errorMsg);
          continue;
        }

        // Check for duplicates
        if (userIds.includes(userId)) {
          console.warn(`⚠️  Duplicate user ID ${userId} on line ${i + 1}, skipping`);
          continue;
        }
        
        userIds.push(userId);
      }
      
      if (errors.length > 0) {
        console.warn(`⚠️  Found ${errors.length} errors while parsing user IDs file`);
      }
      
      console.log(`✅ Loaded ${userIds.length} unique user IDs from ${filePath}`);
      
      if (userIds.length === 0) {
        console.warn(`⚠️  No valid user IDs found in ${filePath}. Monitoring will continue but no notifications will be sent.`);
      }
      
      return userIds;
      
    } catch (error) {
      const nodeError = error as NodeJS.ErrnoException;
      
      if (nodeError.code === 'ENOENT') {
        console.warn(`⚠️  User IDs file not found at ${filePath}. Create this file with user IDs (one per line) to start monitoring.`);
        console.warn(`⚠️  Example file content:`);
        console.warn(`⚠️    # Monitored users`);
        console.warn(`⚠️    12345  # John Doe`);
        console.warn(`⚠️    67890  # Jane Smith`);
        return [];
      }
      
      if (nodeError.code === 'EACCES') {
        console.error(`❌ Permission denied reading user IDs file at ${filePath}. Check file permissions.`);
        return [];
      }

      if (nodeError.code === 'EISDIR') {
        console.error(`❌ ${filePath} is a directory, not a file. Please specify a file path.`);
        return [];
      }
      
      console.error(`❌ Unexpected error reading user IDs file at ${filePath}:`, error);
      return [];
    }
  }
}
import { constants } from 'fs';
import { access, readFile, writeFile } from 'fs/promises';

/**
 * Interface for loading restaurant IDs from a configuration source
 */
export interface RestaurantLoader {
    /**
     * Load restaurant IDs from the specified file path
     * @param filePath Path to the restaurant IDs file
     * @returns Array of valid restaurant IDs
     */
    loadRestaurantIds(filePath: string): Promise<string[]>;

    /**
     * Create a template file with instructions and examples
     * @param filePath Path where the template file should be created
     */
    createTemplateFile(filePath: string): Promise<void>;
}

/**
 * File-based implementation of RestaurantLoader
 * Loads restaurant IDs from a text file with support for comments and validation
 */
export class FileRestaurantLoader implements RestaurantLoader {
    /**
     * Load restaurant IDs from a file
     * - Ignores comment lines (starting with #)
     * - Ignores inline comments (after # on a line)
     * - Ignores empty lines and whitespace
     * - Validates restaurant IDs (non-empty strings)
     * - Creates template file if file doesn't exist
     */
    async loadRestaurantIds(filePath: string): Promise<string[]> {
        try {
            // Check if file exists
            await access(filePath, constants.F_OK);
        } catch (_error) {
            // File doesn't exist, create template
            console.log(`📄 Restaurant IDs file not found at ${filePath}. Creating template file...`);
            try {
                await this.createTemplateFile(filePath);
                console.log(`✅ Template file created successfully at ${filePath}`);
            } catch (createError) {
                console.error(`❌ Failed to create template file at ${filePath}:`, createError);
                console.log(`⚠️  Continuing with empty restaurant list`);
            }
            return [];
        }

        try {
            const content = await readFile(filePath, 'utf-8');
            const lines = content.split('\n');
            const restaurantIds: string[] = [];

            for (let i = 0; i < lines.length; i++) {
                const lineNumber = i + 1;
                const restaurantId = this.parseRestaurantLine(lines[i]);

                if (restaurantId !== null) {
                    if (this.isValidRestaurantId(restaurantId)) {
                        restaurantIds.push(restaurantId);
                    } else {
                        console.warn(`⚠️  Invalid restaurant ID on line ${lineNumber}: "${restaurantId}"`);
                    }
                }
            }

            console.log(`✅ Loaded ${restaurantIds.length} restaurant ID(s) from ${filePath}`);
            return restaurantIds;
        } catch (error) {
            console.error(`❌ Error reading restaurant IDs file at ${filePath}:`, error);
            console.log(`⚠️  Continuing with empty restaurant list`);
            return [];
        }
    }

    /**
     * Create a template file with instructions and examples
     */
    async createTemplateFile(filePath: string): Promise<void> {
        const template = `# Monitored Restaurants Configuration
# 
# This file contains the list of restaurant IDs to monitor for table activity.
# Each line should contain a single restaurant ID.
#
# Format:
#   - One restaurant ID per line
#   - Lines starting with # are comments and will be ignored
#   - Inline comments after # are supported
#   - Empty lines are ignored
#   - Restaurant IDs should be non-empty strings (typically numeric)
#
# Examples:
# 12345  # Favorite Italian restaurant
# 67890  # Popular sushi place
# 11111  # Another restaurant
#
# To add a restaurant:
#   1. Find the restaurant ID from the Tablo platform
#   2. Add it on a new line below
#   3. Optionally add a comment to describe the restaurant
#
# To temporarily disable a restaurant:
#   - Add # at the beginning of the line to comment it out
#
# Add your restaurant IDs below:

`;

        try {
            await writeFile(filePath, template, 'utf-8');
            console.log(`✅ Created template restaurant IDs file at ${filePath}`);
        } catch (error) {
            console.error(`❌ Error creating template file at ${filePath}:`, error);
            throw error;
        }
    }

    /**
     * Parse a single line from the restaurant file
     * Returns the restaurant ID if valid, null if the line should be ignored
     */
    private parseRestaurantLine(line: string): string | null {
        // Remove inline comments (everything after #)
        const commentIndex = line.indexOf('#');
        const lineWithoutComment = commentIndex >= 0 ? line.substring(0, commentIndex) : line;

        // Trim whitespace
        const trimmed = lineWithoutComment.trim();

        // Ignore empty lines
        if (trimmed === '') {
            return null;
        }

        return trimmed;
    }

    /**
     * Validate that a restaurant ID is valid
     * A valid restaurant ID is a non-empty string
     */
    private isValidRestaurantId(id: string): boolean {
        return id.length > 0;
    }
}

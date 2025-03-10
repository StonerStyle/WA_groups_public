const fs = require('fs').promises;
const path = require('path');

// Get the prompts directory path
const PROMPTS_DIR = path.join(process.cwd(), 'prompts');

// Available prompt files
const PROMPT_FILES = {
    'groups_listener': {
        path: path.join(PROMPTS_DIR, 'groups_listener.txt'),
        description: 'עיבוד הודעות קבוצות WhatsApp והסקת מידע על נכסים'
    },
    'query_interpret': {
        path: path.join(PROMPTS_DIR, 'query_interpret.txt'),
        description: 'פירוש שאילתות חיפוש נכסים'
    },
    'query_summarize': {
        path: path.join(PROMPTS_DIR, 'query_summarize.txt'),
        description: 'סיכום תוצאות חיפוש נכסים'
    }
};

/**
 * Get list of available prompts with descriptions
 * @returns {Array} Array of prompt objects with id, name, and description
 */
async function getPromptsList() {
    const promptsList = [];
    
    for (const [id, info] of Object.entries(PROMPT_FILES)) {
        const name = id.replace(/_/g, ' ');
        promptsList.push({
            id,
            name,
            description: info.description
        });
    }
    
    return promptsList;
}

/**
 * Get the content of a prompt file
 * @param {string} promptId - The ID of the prompt to retrieve
 * @returns {Promise<string>} The content of the prompt file
 */
async function getPromptContent(promptId) {
    if (!PROMPT_FILES[promptId]) {
        throw new Error(`Prompt not found: ${promptId}`);
    }
    
    try {
        const content = await fs.readFile(PROMPT_FILES[promptId].path, 'utf8');
        return content;
    } catch (error) {
        console.error(`Error reading prompt file ${promptId}:`, error);
        throw error;
    }
}

/**
 * Save content to a prompt file
 * @param {string} promptId - The ID of the prompt to save
 * @param {string} content - The content to save
 * @returns {Promise<void>}
 */
async function savePromptContent(promptId, content) {
    if (!PROMPT_FILES[promptId]) {
        throw new Error(`Prompt not found: ${promptId}`);
    }
    
    try {
        await fs.writeFile(PROMPT_FILES[promptId].path, content, 'utf8');
    } catch (error) {
        console.error(`Error saving prompt file ${promptId}:`, error);
        throw error;
    }
}

module.exports = {
    getPromptsList,
    getPromptContent,
    savePromptContent
}; 
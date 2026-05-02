import { runClaude } from "../utils/llm/claude.ts";
import { makeYoutubeAnalyzePrompt } from "../prompts/youtube.ts";
import { readRedditJson } from "../utils/reddit/index.ts";

// const schema = `{
//   "files": [FileOrDirectory]
// }

// Where FileOrDirectory is:
// {
//   "name": string,       // file or directory name
//   "depth": number,      // depth in folder structure, root = 0
//   "children": FileOrDirectory[]  // empty array for files
// }`;

// const prompt = `

// Explain what files exist here, ignoring the ones in .gitignore.
// Then rank them by how deep they are in the folder structure.

// Return ONLY a valid JSON object matching this exact schema — no markdown fences, 
// no explanation, no preamble, no trailing text. Start with { and end with }.

// Schema:
// ${schema}

// `

async function loadRedditPostsForPrompt() {
    try {
        const content = await readRedditJson("2026-04-29", "learnprogramming");
        const prompt = makeYoutubeAnalyzePrompt(content);

        const response = await runClaude(prompt)
        
        console.log("Claude response:", response);
        try {
            const parsed = JSON.parse(response);
            console.log("Parsed file structure:", parsed);
            return parsed;
        } catch (err) {
            console.error("Failed to parse Claude response as JSON:", err);
            throw err;
        }
    } catch (err) {
        console.error("Failed to load Reddit posts for prompt:", err);
        return [];
    }
}




loadRedditPostsForPrompt();

/**
 * Recursively searches through email parts to find the body content.
 * Prefers plain text over HTML.
 * @param {Array} parts - The parts array from the email payload.
 * @returns {string} The decoded email body.
 */
function getBody(parts = []) {
  let body = "";
  for (const part of parts) {
    if (part.mimeType === 'text/plain' && part.body.data) {
      // Gmail API uses URL-safe Base64. Replace '-' with '+' and '_' with '/' to be safe.
      const text = Buffer.from(part.body.data.replace(/-/g, '+').replace(/_/g, '/'), 'base64').toString('utf-8');
      // Only return if we actually found text, otherwise keep looking (e.g. for HTML).
      if (text.trim()) return text;
    } else if (part.mimeType === 'text/html' && part.body.data) {
      body = Buffer.from(part.body.data.replace(/-/g, '+').replace(/_/g, '/'), 'base64').toString('utf-8');
    } else if (part.parts) {
      // If parts have sub-parts, search deeper.
      const nestedBody = getBody(part.parts);
      if (nestedBody) return nestedBody;
    }
  }
  return body;
}

/**
 * Extracts YouTube links from a string of text.
 * @param {string} text - The text to search for links.
 * @returns {Array<string>} A unique list of YouTube URLs.
 */
function extractYoutubeLinks(text) {
  const regex = /(https?:\/\/(?:www\.)?(?:youtube\.com\/watch\?v=|youtu\.be\/)[\w-]{11})/g;
  const matches = text.match(regex) || [];
  return [...new Set(matches)];
}

/**
 * Parses the email payload and extracts key information.
 * @param {object} payload - The email payload object from the Gmail API.
 * @returns {object} An object containing the body and youtubeLinks.
 */
export function parseEmailBody(payload) {
  const body = getBody(payload.parts);
  const youtubeLinks = extractYoutubeLinks(body);
  return { body, youtubeLinks };
}
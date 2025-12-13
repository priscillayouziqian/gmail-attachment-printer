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
 * Removes forwarded email headers (English and Chinese) from the body text.
 * @param {string} text - The raw email body.
 * @returns {string} The cleaned body text.
 */
function cleanEmailBody(text) {
  const lines = text.split('\n');
  const cleanedLines = [];
  let isSkipping = false;

  // Regex to detect the start of a forwarded block (e.g., ---------- 转发的邮件 ---------)
  const forwardStartRegex = /^-+\s*(?:Forwarded message|转发的邮件)\s*-+/i;
  // Regex to detect header lines (From, Date, Subject, To, Cc in English or Chinese)
  const headerRegex = /^(?:From|Date|Subject|To|Cc|发件人|日期|主题|收件人)[：:]/i;

  for (const line of lines) {
    if (forwardStartRegex.test(line)) {
      isSkipping = true;
      continue;
    }

    if (isSkipping) {
      // If we are in the header block, skip header lines and empty lines.
      if (headerRegex.test(line) || line.trim() === "") {
        continue;
      }
      // Found the start of the actual message.
      isSkipping = false;
    }
    cleanedLines.push(line);
  }
  return cleanedLines.join('\n').trim();
}

/**
 * Parses the email payload and extracts key information.
 * @param {object} payload - The email payload object from the Gmail API.
 * @returns {object} An object containing the body and youtubeLinks.
 */
export function parseEmailBody(payload) {
  const rawBody = getBody(payload.parts);
  const body = cleanEmailBody(rawBody);
  const youtubeLinks = extractYoutubeLinks(body);
  return { body, youtubeLinks };
}
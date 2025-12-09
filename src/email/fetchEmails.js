import fs from "fs";
import path from "path";
// Import our custom function to get an authenticated Gmail API client.
import { getGmailClient } from "./gmailClient.js";

// Where I will save the downloaded attachments.
// `path.resolve` creates an absolute path to ensure it's always correct.
const ATTACH_DIR = path.resolve("data/attachments");

// main function
// It's an `async` function because it will make several network requests to the Gmail API.
export async function fetchEmails(maxResults = 10) {
  // Ensure the attachment directory exists before we try to save files.
  // The { recursive: true } option prevents errors if the directory already exists.
  if (!fs.existsSync(ATTACH_DIR)) {
    fs.mkdirSync(ATTACH_DIR, { recursive: true });
  }

  // First, get an authenticated client to interact with the Gmail API.
  const gmail = await getGmailClient();

  // Get the teacher's email address from our environment variables (.env file).
  const teacherEmail = process.env.TEACHER_EMAIL;

  // Create a search query for the Gmail API. This is just like the search bar in Gmail.
  // We're looking for emails that are:
  // 1. from the teacher's email address
  // 2. have an attachment
  // 3. were received in the last 7 days
  const query = `from:${teacherEmail} has:attachment newer_than:7d`;

  // Call the Gmail API to list all messages that match our query.
  const res = await gmail.users.messages.list({
    userId: "me", // "me" is a special keyword for the currently authenticated user.
    q: query, // The search query we just built.
    maxResults: maxResults // Limit the number of results.
  });

  // If the API response has no messages, return an empty array and stop.
  if (!res.data.messages) return [];
  const messages = [];

  // The API returns a list of message summaries. We need to loop through each one.
  for (const msg of res.data.messages) {
    // For each message summary, fetch the full email details using its ID.
    const email = await gmail.users.messages.get({
      userId: "me",
      id: msg.id
    });

    // The email's content and metadata are in the 'payload' object.
    const payload = email.data.payload;
    const headers = payload.headers;

    // Find and extract the 'From', 'Date', and 'Subject' headers.
    const from = headers.find(h => h.name === "From")?.value || "";
    const date = headers.find(h => h.name === "Date")?.value || "";
    const subject = headers.find(h => h.name === "Subject")?.value || "";

    // --- NEW: Create a date-stamped folder for attachments ---
    // Create a standardized folder name like "2025-12-09" from the email's date.
    const emailDate = new Date(date);
    const dateFolderName = emailDate.toISOString().split('T')[0]; // Gets YYYY-MM-DD
    const dateSpecificDir = path.join(ATTACH_DIR, dateFolderName);

    // Ensure this date-specific directory exists before saving files into it.
    // This is only created once per unique date.
    fs.mkdirSync(dateSpecificDir, { recursive: true });

    // --- NEW FEATURE: Extract YouTube links from the email body ---
    // This function recursively searches through email parts to find the body content.
    function getBody(parts = []) {
      let body = "";
      for (const part of parts) {
        if (part.mimeType === 'text/plain' && part.body.data) {
          // Prefer plain text body if available.
          return Buffer.from(part.body.data, 'base64').toString();
        } else if (part.mimeType === 'text/html' && part.body.data) {
          // Use HTML body as a fallback.
          body = Buffer.from(part.body.data, 'base64').toString();
        } else if (part.parts) {
          // If parts have sub-parts, search deeper.
          return getBody(part.parts);
        }
      }
      return body;
    }
    const emailBody = getBody(payload.parts);
    const youtubeLinks = [...new Set(emailBody.match(/(https?:\/\/(?:www\.)?(?:youtube\.com\/watch\?v=|youtu\.be\/)[\w-]{11})/g) || [])];

    // This array will hold information about attachments found in this specific email.
    const attachments = [];

    // An email can have multiple 'parts' (e.g., text body, HTML body, attachments).
    // We loop through these parts to find the ones that are actual attachments.
    const parts = payload.parts || [];
    for (const part of parts) {
      // An attachment part will have a 'filename' and an 'attachmentId' in its body.
      if (part.filename && part.body && part.body.attachmentId) {
        const attachmentId = part.body.attachmentId;
        // Create the full local path inside the new date-specific folder.
        const filePath = path.join(dateSpecificDir, part.filename);

        // --- IMPROVEMENT ---
        // Check if the file already exists. If so, skip downloading it again.
        // This prevents the 'EBUSY' error and avoids redundant downloads.
        if (fs.existsSync(filePath)) {
          console.log(`- Skipping "${part.filename}" (already exists).`);
          // Even if skipped, we add it to the list to acknowledge its presence.
          attachments.push({ name: part.filename, localPath: filePath, type: getFileType(part.filename) });
          continue; // Move to the next part in the loop.
        }

        // Use the attachmentId to fetch the actual file content from the API.
        const attach = await gmail.users.messages.attachments.get({
          userId: "me",
          messageId: msg.id,
          id: attachmentId
        });

        // The attachment data comes in a base64 encoded string. We need to decode it.
        // `Buffer.from(..., "base64")` converts it back into binary data (a file).
        const fileBuffer = Buffer.from(attach.data.data, "base64");

        // Write the decoded file data to our local file system.
        fs.writeFileSync(filePath, fileBuffer);

        // Store the details of the downloaded attachment.
        attachments.push({
          name: part.filename,
          localPath: filePath,
          type: getFileType(part.filename)
        });
      }
    }

    // Add the structured information for this email to our main `messages` array.
    messages.push({
      id: msg.id,
      from,
      date,
      subject,
      attachments,
      youtubeLinks // Add the found YouTube links to the final object.
    });
  }

  // After processing all emails, return the array of message objects.
  return messages;
}

// A simple helper function to determine the file type based on its extension.
function getFileType(filename) {
  if (filename.endsWith(".pdf")) return "pdf";
  if (filename.endsWith(".docx")) return "docx";
  if (filename.endsWith(".doc")) return "doc";
  return "other";
}

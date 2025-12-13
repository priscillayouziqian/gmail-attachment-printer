import fs from "fs";
import path from "path";
import { getGmailClient } from "./gmailClient.js";
import { parseEmailBody } from "./emailParser.js";
import { generateSummaryDocx } from "./docxGenerator.js";
import { handleAttachments } from "./attachmentHandler.js";

// The root directory where all attachments will be saved.
// `path.resolve` creates an absolute path to ensure it's always correct.
const ATTACH_DIR = path.resolve("data/attachments");

// main function
// It's an `async` function because it will make several network requests to the Gmail API.
export async function fetchEmails(maxResults = 10) {
  // Ensure the attachment directory exists before we try to save files.
  fs.mkdirSync(ATTACH_DIR, { recursive: true });

  // First, get an authenticated client to interact with the Gmail API.
  const gmail = await getGmailClient();

  // Get the teacher's email address from our environment variables (.env file).
  const teacherEmail = process.env.TEACHER_EMAIL;

  // We're looking for emails that are:
  // 1. from the teacher's email address
  // 2. sent in the last 2 days (we will filter for content later)
  const query = `from:${teacherEmail} newer_than:2d`;

  // Call the Gmail API to list all messages that match our query.
  const res = await gmail.users.messages.list({
    userId: "me", // "me" is a special keyword for the currently authenticated user.
    q: query, // The search query we just built.
    maxResults: maxResults // Limit the number of results.
  });

  // If the API response has no messages, return an empty array and stop.
  if (!res.data.messages) return [];

  const messages = [];

  // Loop through each message summary.
  for (const msg of res.data.messages) {
    // Fetch the full email details using its ID.
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

    // Create a standardized folder name like "2025-12-09" from the email's date.
    const emailDate = new Date(date);
    const dateFolderName = emailDate.toISOString().split('T')[0]; // Gets YYYY-MM-DD
    const dateSpecificDir = path.join(ATTACH_DIR, dateFolderName);
    fs.mkdirSync(dateSpecificDir, { recursive: true });

    // Use our specialized modules to process the email content.
    const { body, youtubeLinks } = parseEmailBody(payload);
    
    // Generate the summary doc and get its path (if created).
    const summaryFilePath = await generateSummaryDocx(subject, body, youtubeLinks, dateSpecificDir);
    
    const attachments = await handleAttachments(gmail, msg.id, payload.parts, dateSpecificDir);

    // If a summary file was created, add it to the attachments list so it gets printed.
    if (summaryFilePath) {
      attachments.push({
        name: path.basename(summaryFilePath),
        localPath: summaryFilePath,
        type: "docx"
      });
    }

    // Only add the email to our list if it has attachments or a generated summary.
    if (attachments.length > 0) {
      messages.push({
        id: msg.id,
        from,
        date,
        subject,
        attachments,
        youtubeLinks,
      });
    }
  }

  // After processing all emails, return the array of message objects.
  return messages;
}

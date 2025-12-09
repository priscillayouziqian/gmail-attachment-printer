import fs from "fs";
import path from "path";

/**
 * Determines the file type based on its extension.
 * @param {string} filename - The name of the file.
 * @returns {string} The file type ('pdf', 'docx', etc.).
 */
function getFileType(filename) {
  if (filename.endsWith(".pdf")) return "pdf";
  if (filename.endsWith(".docx")) return "docx";
  if (filename.endsWith(".doc")) return "doc";
  return "other";
}

/**
 * Processes and downloads all attachments from an email's parts.
 * @param {object} gmail - The authenticated Gmail API client.
 * @param {string} messageId - The ID of the email message.
 * @param {Array} parts - The parts array from the email payload.
 * @param {string} directory - The directory to save attachments in.
 * @returns {Promise<Array<object>>} A promise that resolves to a list of attachment details.
 */
export async function handleAttachments(gmail, messageId, parts = [], directory) {
  const attachments = [];
  for (const part of parts) {
    if (part.filename && part.body && part.body.attachmentId) {
      const attachmentId = part.body.attachmentId;
      const filePath = path.join(directory, part.filename);

      if (fs.existsSync(filePath)) {
        console.log(`- Skipping "${part.filename}" (already exists).`);
        attachments.push({ name: part.filename, localPath: filePath, type: getFileType(part.filename) });
        continue;
      }

      const attach = await gmail.users.messages.attachments.get({
        userId: "me",
        messageId: messageId,
        id: attachmentId,
      });

      const fileBuffer = Buffer.from(attach.data.data, "base64");
      fs.writeFileSync(filePath, fileBuffer);

      attachments.push({ name: part.filename, localPath: filePath, type: getFileType(part.filename) });
    }
  }
  return attachments;
}
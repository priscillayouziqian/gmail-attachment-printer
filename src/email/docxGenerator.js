// src/email/docxGenerator.js
import fs from "fs";
import path from "path";
import { Document, Packer, Paragraph, TextRun, ExternalHyperlink } from "docx";

/**
 * Generates a .docx file from the email body and a list of links.
 * @param {string} subject - The email subject, used for the filename.
 * @param {string} body - The plain text body of the email.
 * @param {Array<string>} links - A list of YouTube links.
 * @param {string} directory - The directory to save the file in.
 */
export async function generateSummaryDocx(subject, body, links, directory) {
  if (!links || links.length === 0 || !body) {
    return;
  }

  // Remove "Fwd:", "Re:", etc. from the start of the subject to clean up the filename.
  const cleanSubject = subject.replace(/^(?:Fwd|FW|Re|转发|回复)[:：]\s*/i, "");

  // Sanitize the email subject to create a safe filename.
  const sanitizedSubject = cleanSubject.replace(/[\\?%*:|"<>]/g, '-').slice(0, 50);
  const docxFilename = `${sanitizedSubject}_summary.docx`;
  const docxFilePath = path.join(directory, docxFilename);

  // Split the body into lines to preserve the "letter" formatting.
  const lines = body.split('\n');
  const docChildren = [];

  // Regex to find YouTube links (same as in emailParser.js)
  // We use a capturing group () to include the URL in the split results.
  const urlRegex = /(https?:\/\/(?:www\.)?(?:youtube\.com\/watch\?v=|youtu\.be\/)[\w-]{11})/;

  for (const line of lines) {
    // If the line is empty, add an empty paragraph for spacing.
    if (!line.trim()) {
      docChildren.push(new Paragraph({ text: "" }));
      continue;
    }

    // Split the line by the URL regex to separate text from links.
    const parts = line.split(urlRegex);
    const paragraphChildren = parts.map(part => {
      if (urlRegex.test(part)) {
        // It's a link: make it clickable.
        return new ExternalHyperlink({
          children: [new TextRun({ text: part, style: "Hyperlink" })],
          link: part,
        });
      } else {
        // It's regular text.
        return new TextRun({ text: part });
      }
    });

    docChildren.push(new Paragraph({ children: paragraphChildren }));
  }

  const doc = new Document({
    sections: [{
      children: docChildren,
    }],
  });

  // Use the Packer to convert the document into a buffer that can be saved.
  const buffer = await Packer.toBuffer(doc);
  // Write the buffer to the file system.
  fs.writeFileSync(docxFilePath, buffer);
  console.log(`- Created summary document: "${docxFilename}"`);
}
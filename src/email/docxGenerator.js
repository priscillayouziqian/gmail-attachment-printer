import fs from "fs";
import path from "path";
import { Document, Packer, Paragraph, TextRun } from "docx";

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

  // Sanitize the email subject to create a safe filename.
  const sanitizedSubject = subject.replace(/[\\?%*:|"<>]/g, '-').slice(0, 50);
  const docxFilename = `${sanitizedSubject}_summary.docx`;
  const docxFilePath = path.join(directory, docxFilename);

  const doc = new Document({
    sections: [{
      children: [
        new Paragraph({ text: body }),
        new Paragraph({ text: "" }),
        new Paragraph({
          children: [new TextRun({ text: "Assignment Links:", bold: true })],
        }),
        ...links.map(link => new Paragraph({ text: link })),
      ],
    }],
  });

  // Use the Packer to convert the document into a buffer that can be saved.
  const buffer = await Packer.toBuffer(doc);
  // Write the buffer to the file system.
  fs.writeFileSync(docxFilePath, buffer);
  console.log(`- Created summary document: "${docxFilename}"`);
}
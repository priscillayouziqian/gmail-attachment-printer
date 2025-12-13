// tests/test-docx-generator.js
import "dotenv/config";
import fs from "fs";
import path from "path";
import { getGmailClient } from "../src/email/gmailClient.js";
import { parseEmailBody } from "../src/email/emailParser.js";
import { generateSummaryDocx } from "../src/email/docxGenerator.js";

// Define a specific folder for this test to keep things organized.
const TEST_DIR = path.resolve("data/attachments/test_docx_gen");

async function runTest() {
  console.log("🧪 Testing DOCX Generator with REAL Email Data...");

  // 1. Setup: Ensure the test directory exists.
  if (!fs.existsSync(TEST_DIR)) {
    fs.mkdirSync(TEST_DIR, { recursive: true });
  }

  try {
    // 2. Fetch Real Data
    const gmail = await getGmailClient();
    const teacherEmail = process.env.TEACHER_EMAIL;

    if (!teacherEmail) {
      throw new Error("TEACHER_EMAIL is not defined in .env file.");
    }

    console.log(`Searching for the most recent email from: ${teacherEmail}`);
    const res = await gmail.users.messages.list({
      userId: "me",
      q: `from:${teacherEmail}`,
      maxResults: 1,
    });

    if (!res.data.messages || res.data.messages.length === 0) {
      console.log("❌ No emails found from this sender.");
      return;
    }

    const messageId = res.data.messages[0].id;
    console.log(`Fetching content for message ID: ${messageId}...`);
    
    const email = await gmail.users.messages.get({
      userId: "me",
      id: messageId,
    });

    const subject = email.data.payload.headers.find(h => h.name === "Subject")?.value || "No Subject";
    const { body, youtubeLinks } = parseEmailBody(email.data.payload);

    console.log(`Subject: "${subject}"`);
    console.log(`Body length: ${body.length} chars`);
    console.log(`YouTube Links found: ${youtubeLinks.length}`);

    // 3. Execute the function with real data
    await generateSummaryDocx(subject, body, youtubeLinks, TEST_DIR);

    // 4. Verify the file was created
    // Replicate the filename sanitization logic to check for the file
    const sanitizedSubject = subject.replace(/[\\?%*:|"<>]/g, '-').slice(0, 50);
    const expectedFilename = `${sanitizedSubject}_summary.docx`;
    const expectedPath = path.join(TEST_DIR, expectedFilename);

    if (fs.existsSync(expectedPath)) {
      console.log(`\n✅ Success! File created at: ${expectedPath}`);
      const stats = fs.statSync(expectedPath);
      console.log(`File size: ${stats.size} bytes`);
      console.log("You can open this file manually to verify the formatting.");
    } else if (youtubeLinks.length > 0) {
      console.error(`\n❌ Error: File was not created at ${expectedPath}`);
    } else {
      console.log("\nℹ️ No file expected because no links were found in this email.");
    }

  } catch (error) {
    console.error("\n❌ Test Failed with error:", error);
  }
}

runTest();
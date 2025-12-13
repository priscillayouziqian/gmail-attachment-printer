// tests/test-email-parser.js
import "dotenv/config"; // Load environment variables (TEACHER_EMAIL)
import { getGmailClient } from "../src/email/gmailClient.js";
import { parseEmailBody } from "../src/email/emailParser.js";

async function testWithRealEmail() {
  console.log("🧪 Testing Email Parser with LATEST REAL email...");

  try {
    // 1. Authenticate with Gmail
    const gmail = await getGmailClient();
    const teacherEmail = process.env.TEACHER_EMAIL;

    if (!teacherEmail) {
      throw new Error("TEACHER_EMAIL is not defined in .env file.");
    }

    console.log(`Searching for the most recent email from: ${teacherEmail}`);

    // 2. Find the latest message from the teacher
    const res = await gmail.users.messages.list({
      userId: "me",
      q: `from:${teacherEmail}`,
      maxResults: 1, // We only need the latest one
    });

    if (!res.data.messages || res.data.messages.length === 0) {
      console.log("❌ No emails found from this sender.");
      return;
    }

    const messageId = res.data.messages[0].id;
    console.log(`Fetching full content for message ID: ${messageId}...`);

    // 3. Get full message details (payload)
    const email = await gmail.users.messages.get({
      userId: "me",
      id: messageId,
    });

    const subject = email.data.payload.headers.find(h => h.name === "Subject")?.value;
    console.log(`Subject: "${subject}"`);

    // 4. Run the parser on the real payload
    const result = parseEmailBody(email.data.payload);

    // 5. Output results
    console.log("\n--- Extracted Body (First 500 chars) ---");
    console.log(result.body.substring(0, 500) + (result.body.length > 500 ? "..." : ""));
    
    console.log("\n--- Extracted YouTube Links ---");
    if (result.youtubeLinks.length > 0) {
      result.youtubeLinks.forEach(link => console.log(`🔗 ${link}`));
    } else {
      console.log("No YouTube links found.");
    }

  } catch (error) {
    console.error("\n❌ Error during test:", error);
  }
}

testWithRealEmail();
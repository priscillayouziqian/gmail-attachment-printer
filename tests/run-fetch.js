import { fetchEmails } from "../src/email/fetchEmails.js";

/**
 * This is a test runner script to execute the fetchEmails function
 * and see its output.
 */
async function runTest() {
  console.log("🚀 Starting email fetch process...");

  try {
    // Call the main function to find and download attachments.
    const messages = await fetchEmails();

    if (messages.length > 0) {
      console.log(`\n✅ Success! Found and processed ${messages.length} email(s).`);
      console.log("📂 Attachments have been saved to the 'data/attachments' directory.");
      console.log("\nHere is the summary of fetched data:");
      console.dir(messages, { depth: null }); // console.dir provides a nice, readable object view.
    } else {
      console.log("\nℹ️  The script ran successfully, but no new emails matched the criteria.");
    }
  } catch (error) {
    console.error("\n❌ An error occurred during the fetch process:", error);
  }
}

runTest();
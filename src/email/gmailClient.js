// src/email/gmailClient.js
import { google } from "googleapis";
import dotenv from "dotenv";
dotenv.config();

export async function getGmailClient() {
  const oAuth2Client = new google.auth.OAuth2(
    process.env.GMAIL_CLIENT_ID,
    process.env.GMAIL_CLIENT_SECRET,
    process.env.GMAIL_REDIRECT_URI
  );

  // Token previously saved from OAuth consent (manual step)
  oAuth2Client.setCredentials({
    refresh_token: process.env.GMAIL_REFRESH_TOKEN
  });

  return google.gmail({ version: "v1", auth: oAuth2Client });
}

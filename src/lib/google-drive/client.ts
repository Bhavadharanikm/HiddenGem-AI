import { google } from "googleapis";
import { createOAuthClient } from "./oauth";

export function createDriveClient(accessToken: string, refreshToken: string) {
  const oauth2 = createOAuthClient();
  oauth2.setCredentials({
    access_token: accessToken,
    refresh_token: refreshToken,
  });
  return google.drive({ version: "v3", auth: oauth2 });
}

/** Extract the Drive file ID from a share URL */
export function extractDriveFileId(url: string): string | null {
  // Handles:
  // https://docs.google.com/document/d/FILE_ID/edit
  // https://drive.google.com/file/d/FILE_ID/view
  // https://drive.google.com/open?id=FILE_ID
  const patterns = [
    /\/d\/([a-zA-Z0-9_-]{20,})/,
    /[?&]id=([a-zA-Z0-9_-]{20,})/,
  ];
  for (const re of patterns) {
    const m = url.match(re);
    if (m) return m[1];
  }
  return null;
}

/** Fetch plain-text content of a Google Drive file */
export async function fetchDocumentContent(
  accessToken: string,
  refreshToken: string,
  fileId: string,
  mimeType: string
): Promise<string> {
  const drive = createDriveClient(accessToken, refreshToken);

  if (mimeType === "application/vnd.google-apps.document") {
    // Export as plain text
    const res = await drive.files.export(
      { fileId, mimeType: "text/plain" },
      { responseType: "text" }
    );
    return res.data as string;
  }

  // For PDFs and other binary files, export as text
  const res = await drive.files.export(
    { fileId, mimeType: "text/plain" },
    { responseType: "text" }
  ).catch(async () => {
    // Fall back to downloading the file directly for non-Google formats
    const dl = await drive.files.get(
      { fileId, alt: "media" },
      { responseType: "text" }
    );
    return dl;
  });

  return res.data as string;
}

/** Get file metadata (name, mimeType, modifiedTime) */
export async function getFileMetadata(
  accessToken: string,
  refreshToken: string,
  fileId: string
) {
  const drive = createDriveClient(accessToken, refreshToken);
  const { data } = await drive.files.get({
    fileId,
    fields: "id,name,mimeType,modifiedTime",
  });
  return data;
}

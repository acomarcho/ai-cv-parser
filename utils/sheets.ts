import { GoogleSpreadsheet } from "google-spreadsheet";
import { JWT } from "google-auth-library";

// Initialize auth - see https://theoephraim.github.io/node-google-spreadsheet/#/guides/authentication
const SCOPES = ["https://www.googleapis.com/auth/spreadsheets"];

const jwt = new JWT({
  email: process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL,
  key: process.env.GOOGLE_PRIVATE_KEY?.replace(/\\n/g, "\n"),
  scopes: SCOPES,
});

const SPREADSHEET_ID = process.env.GOOGLE_SPREADSHEET_ID;

class SheetQueue {
  private queue: Array<() => Promise<void>> = [];
  private isProcessing = false;

  async add(operation: () => Promise<void>) {
    this.queue.push(operation);
    if (!this.isProcessing) {
      await this.processQueue();
    }
  }

  private async processQueue() {
    if (this.isProcessing) return;

    this.isProcessing = true;
    while (this.queue.length > 0) {
      const operation = this.queue.shift();
      if (operation) {
        try {
          await operation();
        } catch (error) {
          console.error("Error processing sheet operation:", error);
        }
      }
    }
    this.isProcessing = false;
  }
}

const sheetQueue = new SheetQueue();

export async function appendToSheet(data: {
  name: string;
  email: string;
  phone: string;
  companies: string[];
}) {
  return new Promise<boolean>((resolve, reject) => {
    sheetQueue.add(async () => {
      try {
        const doc = new GoogleSpreadsheet(SPREADSHEET_ID!, jwt);
        await doc.loadInfo();

        const sheet = doc.sheetsByIndex[0]; // Get the first sheet

        await sheet.addRow({
          Name: data.name,
          Email: data.email,
          Phone: data.phone,
          Companies: data.companies.join(", "),
        });

        resolve(true);
      } catch (error) {
        console.error("Error appending to sheet:", error);
        reject(error);
      }
    });
  });
}

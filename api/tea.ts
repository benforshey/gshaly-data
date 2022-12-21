require("dotenv").config();

import { google } from "googleapis";
import type { VercelRequest, VercelResponse } from "@vercel/node";

const sheets = google.sheets("v4");

function transformData(data: { [key: string]: any }) {
  const headers = data[0];
  const body = data.slice(1);
  
  // pair the headers with the value
  const paired = body.map((outerValue: any) => {
    const obj: any = {};

    outerValue.map((innerValue: any, innerIndex: any) => {
      obj[headers[innerIndex]] = innerValue;

      return obj;
    });

    return obj;
  });
  
  // group by unique type
  const uniqueTypes = Array.from(new Set(body.map((el: any) => el[0])));

  // put objects under parent by type
  const sorted = uniqueTypes.map((type: any) => {
    const arr = paired.filter((pair: any) => pair.Type === type);

    return { [type]: arr };
  });
  return sorted;
}

export default async (_: VercelRequest, response: VercelResponse) => {
  try {
    sheets.spreadsheets.values.batchGet(
      {
        auth: new google.auth.JWT(
          process.env.WEBHOOK_SERVICE_EMAIL,
          undefined,
          Buffer.from(process.env.WEBHOOK_PRIVATE_KEY as string, "base64").toString(
            "utf8"
          ),
          process.env.WEBHOOK_PERMISSIONS,
          undefined
        ),
        ranges: ["Tea Information"],
        spreadsheetId: process.env.SPREADSHEET_ID,
      },
      (error, batchResponse) => {
        if (error) {
          throw error;
        }

        response.json(transformData(batchResponse?.data.valueRanges?.[0].values as {[key: string]: any}));
      }
    );
  } catch (error: any) {
    response.status(400).end(JSON.parse(error.message));
  }
};

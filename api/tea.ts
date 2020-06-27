import { NowRequest, NowResponse } from "@now/node";

require("dotenv").config();

const { google } = require("googleapis");
const sheets = google.sheets("v4");

function transformData(data: { [key: string]: any }) {
  const headers = data[0];
  const body = data.slice(1);
  // pair the headers with the value
  const paired = body.map((outerValue) => {
    const obj = {};
    outerValue.map((innerValue, innerIndex) => {
      obj[headers[innerIndex]] = innerValue;
      return obj;
    });
    return obj;
  });
  // group by unique type
  const uniqueTypes = Array.from(new Set(body.map((el) => el[0])));
  // put objects under parent by type
  const sorted = uniqueTypes.map((type: string) => {
    const arr = paired.filter((pair) => pair.Type === type);
    return { [type]: arr };
  });
  return sorted;
}

export default async (_: NowRequest, response: NowResponse) => {
  try {
    sheets.spreadsheets.values.batchGet(
      {
        auth: new google.auth.JWT(
          process.env.WEBHOOK_SERVICE_EMAIL,
          null,
          Buffer.from(process.env.WEBHOOK_PRIVATE_KEY, "base64").toString(
            "utf8"
          ),
          process.env.WEBHOOK_PERMISSIONS,
          null
        ),
        ranges: "Tea Information",
        spreadsheetId: process.env.SPREADSHEET_ID,
      },
      (error, batchResponse) => {
        if (error) {
          throw error;
        }

        response.json(transformData(batchResponse.data.valueRanges[0].values));
      }
    );
  } catch (error) {
    response.status(400).end(JSON.parse(error.message));
  }
};

//const path = require('path')
//require('dotenv').config({ path: path.resolve(__dirname, '../.env') })
require("dotenv").config();
var util = require("util");
const { google } = require("googleapis");
const qrcode = require("qrcode-terminal");
const { Client, LocalAuth } = require("whatsapp-web.js");

serviceStatus = true;

//Read excel sheet
async function getReplyFromFile() {
  const auth = new google.auth.GoogleAuth({
    keyFile: "credentials.json",
    scopes: "https://www.googleapis.com/auth/spreadsheets",
  });
  // Create client instance for auth
  const client = await auth.getClient();

  // Instance of Google Sheets API
  const googleSheets = google.sheets({ version: "v4", auth: client });

  const spreadsheetId = process.env.SHEETID;

  // Get metadata about spreadsheet
  const metaData = await googleSheets.spreadsheets.get({
    auth,
    spreadsheetId,
  });

  // Read rows from spreadsheet
  const getRows = await googleSheets.spreadsheets.values.get({
    auth,
    spreadsheetId,
    range: "Sheet1",
    //range: "Sheet1!A:A",
  });
  return getRows.data.values;
}

// Use the saved values
const client = new Client({
  authStrategy: new LocalAuth({
    clientId: "client-one",
  }),
});

// Save session values to the file upon successful auth
client.on("authenticated", (session) => {
  console.log("Auth done");
});

// Generate and scan this code with your phone
client.on("qr", (qr) => {
  console.log("QR RECEIVED", qr);
  qrcode.generate(qr, { small: true });
});
//Client ready
client.on("ready", () => {
  console.log("Client is ready! " + util.inspect(client.info.pushname));
  console.log("Admin : " + process.env.ADMIN_MOBILE);
  client.sendMessage(
    process.env.ADMIN_MOBILE,
    "Auth Done, Client is ready! \n*Client Name :*  " +
      util.inspect(client.info.pushname)
  );
});

//Message handler
client.on("message", (msg) => {
  if (msg.from == process.env.ADMIN_MOBILE && msg.body == "STOP SERVICE") {
    stopService(msg);
  } else if (
    msg.from == process.env.ADMIN_MOBILE &&
    msg.body == "START SERVICE"
  ) {
    startService(msg);
  } else if (serviceStatus) {
    if (msg.id.remote.includes("@g.us") ||msg.id.remote =="status@broadcast") {
        console.log("Ignoring Status or Group message "+msg.id.remote+" | Messge from "+msg.from + "Message: " + msg.body)
    } else {
      //console.log("Msg received " + JSON.stringify(msg));
      console.log("Msg received " + msg.from + " msg " + msg.body);
      sendReply(msg);
    }
  } else {
    console.log("Service Status: " + serviceStatus);
  }

  async function sendReply(msg) {
    let sheetData = await getReplyFromFile();
    //console.log('Data '+JSON.stringify(sheetData));
    sheetData.map((item) => {
      //console.log('item '+JSON.stringify(item)+'type '+typeof(item));
      //console.log('Message '+item[0]+'type '+typeof(item[0])+'| reply '+item[1]+'type '+typeof(item[1]));
      if (item[0] == msg.body) {
        //msg.reply(item[1]);
        client.sendMessage(msg.from, item[1]);
        console.log("sent | Message " + item[0] + "reply " + item[1]);
      }
    });
  }
});
function stopService(msg) {
  console.log("Admin requested to STOP SERVICE");
  msg.reply("Admin requested to *STOP SERVICE*");
  client.sendMessage(msg.from, "------ STOPPING SERVICE ------");
  serviceStatus = false;
  client.sendMessage(
    msg.from,
    '*SERVICE STOPPED SUCCESSFULLY* \n To Restart the Service, Send Message  *"START SERVICE"*. Client is still listening to Admin! '
  );
  console.log("SERVICE STOPPED");
}
function startService(msg) {
  console.log("Admin requested to START SERVICE");
  msg.reply("Admin requested to *START SERVICE*");
  client.sendMessage(msg.from, "------ STARTING SERVICE ------");
  serviceStatus = true;
  client.sendMessage(
    msg.from,
    '*SERVICE STARTED SUCCESSFULLY* \n To STOP the Service, Send Message  *"STOP SERVICE"*. Client is still listening to Admin! '
  );
  console.log("SERVICE STARTED");
}
client.initialize();

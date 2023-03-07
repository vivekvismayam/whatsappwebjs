//const path = require('path')
//require('dotenv').config({ path: path.resolve(__dirname, '../.env') })
require("dotenv").config();
var util = require("util");
const { google } = require("googleapis");
const qrcode = require("qrcode-terminal");
const { Client, LocalAuth } = require("whatsapp-web.js");

serviceStatus = true;
dndStatus=false;
dndReason='123';
dndMessages=[];

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

  if (msg.id.remote.includes("@g.us") ||msg.id.remote =="status@broadcast") {
    console.log("Ignoring Status or Group message "+msg.id.remote+" | Messge from "+msg.from + "Message: " + msg.body)
} else {
      if (msg.from == process.env.ADMIN_MOBILE && msg.body == "STOP SERVICE") {
        stopService(msg);
      } 
      else if (msg.from == process.env.ADMIN_MOBILE &&msg.body == "START SERVICE") {
        startService(msg);
      } 
      else if (msg.from == process.env.ADMIN_MOBILE &&msg.body.startsWith("DND START")) {
        dndStart(msg);
      }else if (msg.from == process.env.ADMIN_MOBILE &&msg.body=="DND END") {
        dndEnd(msg);
      }else if (dndStatus) {
        console.log("DND Is Turned ON" + msg.from +" - "+msg._data.notifyName+ " Message " + msg.body);
        //console.log("Message Full"+JSON.stringify(msg))
        dndMessages.push("\n|"+msg.from+" - "+msg._data.notifyName+" : "+msg.body+"  |");
        sendReply(msg);
      }
      else if (serviceStatus) {
          //console.log("Msg received " + JSON.stringify(msg));
          console.log("Msg received From " + msg.from + " Message " + msg.body);
          sendReply(msg);
      } 
      else {
        console.log("Service Status: " + serviceStatus);
      }
}
 

  async function sendReply(msg) {
    console.log("SEND REPLY | DND STATUS "+dndStatus);

    let sheetData = await getReplyFromFile();
    //console.log('Data '+JSON.stringify(sheetData));
    sheetData.map((item) => {
      if (item[0] == msg.body&&!dndStatus) {
        //msg.reply(item[1]);
        client.sendMessage(msg.from, item[1]);
        console.log("Success! | Message Received " + item[0] + " | Reply Sent" + item[1]);
      }
      if (item[0] == 'DND Message Template'&&dndStatus) {
        //msg.reply(item[1]);
        let formattedDNDMesaage=item[1].replace("{DNDreason}", dndReason);
        client.sendMessage(msg.from, formattedDNDMesaage);
        console.log("DND Success! | Message Received " + item[0] + " | Reply Sent" + formattedDNDMesaage);
      }
    });
  }
  
});

function stopService(msg) {
  console.log("Admin requested to STOP SERVICE");
  msg.reply("Admin requested to *STOP SERVICE*"+"\n------ STOPPING SERVICE ------");
  serviceStatus = false;
  dndStatus=false;
  dndReason='';
  client.sendMessage(
    msg.from,
    '*SERVICE STOPPED SUCCESSFULLY* \n To Restart the Service, Send Message  *"START SERVICE"*. Client is still listening to Admin! '
  );
  console.log("SERVICE STOPPED");
}
function startService(msg) {
  console.log("Admin requested to START SERVICE");
  msg.reply("Admin requested to *START SERVICE*"+"\n------ STARTING SERVICE ------");
  serviceStatus = true;
  dndStatus=false;
  dndReason='';
  client.sendMessage(
    msg.from,
    '*SERVICE STARTED SUCCESSFULLY NO DND SET* \n To STOP the Service, Send Message  *"STOP SERVICE"*. Client  always listens to Admin! '
  );
  console.log("SERVICE STARTED");
}
function dndStart(msg) {
  console.log("Admin requested for DND ");
  dndReason=msg.body.split("DND START")[1]||"Busy";
  msg.reply("Admin requested to *START DND* Reason :"+dndReason+"\n------ STARTING DND ------");
  serviceStatus = true;
  dndStatus=true;
  client.sendMessage(
    msg.from,
    '*DND STARTED SUCCESSFULLY* \n To STOP the DND, Send Message  *"DND END"*. Client  always listens to Admin! '
  );
  console.log("DND STARTED"+dndReason);
}
function dndEnd(msg) {
  let messageString=dndMessages.toString();
  console.log("Admin requested for DND END"+messageString);
  msg.reply("Admin requested  *DND END*\n------ ENDING DND ------");
  serviceStatus = true;
  dndStatus=false;
  dndReason='';
  dndMessages=[];
  client.sendMessage(msg.from,    '*DND END SUCCESSFULLY* \n Messages you need to reply \n------------------------'+messageString  );
  console.log("DND ENDED Reason reset to: "+dndReason);
}
client.initialize();

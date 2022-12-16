const fs = require('fs');
const { google } = require("googleapis");
const qrcode = require('qrcode-terminal');
const { Client,LocalAuth } = require('whatsapp-web.js');

//Read excel sheet
async function getReplyFromFile(){
    const auth = new google.auth.GoogleAuth({
        keyFile: "credentials.json",
        scopes: "https://www.googleapis.com/auth/spreadsheets",
      });      
      // Create client instance for auth
      const client = await auth.getClient();
    
      // Instance of Google Sheets API
      const googleSheets = google.sheets({ version: "v4", auth: client });
    
      const spreadsheetId = "1UXKXANjdu6_geknW-AHvj7QYDxofjNuWV3lioGHcr_g";
    
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
         clientId: "client-one" 
    })
})

// Save session values to the file upon successful auth
client.on('authenticated', (session) => {
    console.log('Auth done');
});

// Generate and scan this code with your phone
client.on('qr', (qr) => {
    console.log('QR RECEIVED', qr);
    qrcode.generate(qr, {small: true});
});
//Client ready
client.on('ready', () => {
    console.log('Client is ready!');
});
//Message handler
client.on('message', msg => {
    if (msg.body == '!ping') {
        msg.reply('pong');
    }else{
        console.log('Msg received '+msg.from+' '+' msg '+msg.body);
        sendReply(msg);
    }
    async function sendReply(msg){
        let sheetData=await getReplyFromFile();
        console.log('Data '+JSON.stringify(sheetData));
        sheetData.map((item)=>{
           
            //console.log('item '+JSON.stringify(item)+'type '+typeof(item));
            //console.log('Message '+item[0]+'type '+typeof(item[0])+'| reply '+item[1]+'type '+typeof(item[1]));
             if(item[0]==msg.body){
                //msg.reply(item[1]);
                client.sendMessage(msg.from, item[1]);
                console.log('sent | Message '+item[0]+'reply '+item[1]);
            }
        }) ;
    }
});
client.initialize();
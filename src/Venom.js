import { create } from 'venom-bot';
require('dotenv').config();
const JSON_DIALOGFLOW = require(process.env.GOOGLE_API_KEY);
const dialogflow = require('./Dialogflow');

const fs = require('fs');
const express = require('express');
let serverRest;
const path = require('path');
const restApi = express();

(function () {
    serverRest = require('http').createServer(restApi);
    serverRest.listen(process.env.PORT, process.env.HOST, () => { });
    console.info(`Servidor HTTP rodando em: http://${process.env.HOST}:${process.env.PORT}/`);
    
    restApi.get('/', (req, res) => {
        res.sendFile(path.resolve('./', 'iframe.html'));
    })
    
    restApi.get('/qrcode', (req, res) => {
        const tempDir = path.resolve('./', 'Temp')
        const QrCode = path.resolve(tempDir, 'qrcode.png');
        const QrOut = path.resolve(tempDir, 'out.png');
        
        res.setHeader('Refresh', 5);
        
        fs.readFile(QrCode, (err, data) => {
            if (err) {
                fs.readFile(QrOut, (err, data) => {
                    if (err) {
                        res.status(500).json("Unavaliable");
                    }
                    else {
                        res.writeHead(200, { 'Content-Type': 'image/png' });
                        res.end(data);
                    }
                });
            } else {
                res.writeHead(200, { 'Content-Type': 'image/png' });
                res.end(data);
            }
        });
    });
}());

create('session',
(Base64QR => {
    let matches = Base64QR.match(/^data:([A-Za-z-+\/]+);base64,(.+)$/);
    let buffer = new Buffer.from(matches[2], 'base64');
    fs.writeFile(path.resolve('./', 'Temp', 'qrcode.png'), buffer, () => { });
}), (status) => {
    if (status == 'qrReadSuccess') {
        fs.unlink(path.resolve('./', 'Temp', 'qrcode.png'), () => { });
    }
}, {
    disableWelcome: true, autoClose: 0, updatesLog: true, disableSpins: true, browserArgs: [
        '--js-flags="--max_old_space_size=80"',
        '--disable-web-security',
        '--no-sandbox',
        '--disable-web-security',
        '--aggressive-cache-discard',
        '--disable-cache',
        '--disable-application-cache',
        '--disable-offline-load-stale-cache',
        '--disk-cache-size=0',
        '--disable-background-networking',
        '--disable-default-apps',
        '--disable-extensions',
        '--disable-sync',
        '--disable-translate',
        '--hide-scrollbars',
        '--metrics-recording-only',
        '--mute-audio',
        '--no-first-run',
        '--safebrowsing-disable-auto-update',
        '--ignore-certificate-errors',
        '--ignore-ssl-errors',
        '--ignore-certificate-errors-spki-list'
    ]
}
).then((client) => start(client)).catch((erro) => {  console.log(erro); });

function start(client) {
    client.onMessage(async (message) => {
        if(message.isGroupMsg===false){
            async function processPayload(fulfillmentMessages, fullName, message) {
                for (let responses of fulfillmentMessages) {
                    try {
                        if (responses.text) {
                            let messageResponse = responses.text.text[0].replace('%USER-NAME%', fullName);
                            await client.reply(message.from, messageResponse, message.id.toString());
                        }
                        
                        if (responses.payload) {
                            if (responses.payload.fields.mediaUrl) {
                                let link = responses.payload.fields.mediaUrl.stringValue;
                                let name = responses.payload.fields.mediaName.stringValue ? responses.payload.fields.mediaName.stringValue : "file";
                                let text = responses.payload.fields.mediaText.stringValue ? responses.payload.fields.mediaText.stringValue : "";
                                try {
                                    await client.sendFile(message.from, link, name, text);
                                } catch (e) {
                                    try {
                                        await client.sendVoice(message.from, link, name, text);
                                    } catch (e) {
                                        console.log(e);
                                    }
                                }
                            }
                        }
                        
                    } catch (e) {
                        console.log(e);
                    }
                }
            }
            
            let bot = new dialogflow(
                JSON_DIALOGFLOW.project_id,
                process.env.JSON_LOCATION,
                'pt-BR',
                message.from
                );
                
                if (message.type === 'chat') {
                    let response = await bot.sendText(message.body);
                    
                    if (response.fulfillmentText) {
                        processPayload(response.fulfillmentMessages, "NAME", message);                 
                    } else {
                        await client.reply(message.from, fallbackresponses(), message.id.toString());
                    }
                }  
        }        
    }
    );
}
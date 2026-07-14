
require('dotenv').config();
const fs = require('fs');
const jwt = require('jsonwebtoken');
const axios = require('axios');
const WebSocket = require('ws');
const lastPublishTime = new Map();
const THROTTLE_MS = 2000;

let cachedToken = null;
let cachedInstanceUrl = null;

function generateJwt() {
  const privateKey = fs.readFileSync(process.env.SF_PRIVATE_KEY_PATH, 'utf8');

  const claims = {
    iss: process.env.SF_CONSUMER_KEY,
    sub: process.env.SF_USERNAME,
    aud: process.env.SF_LOGIN_URL,
    exp: Math.floor(Date.now() / 1000) + 180
  };

  const token = jwt.sign(claims, privateKey, { algorithm: 'RS256' });
  return token;
}

async function getAccessToken() {
    const jwtToken = generateJwt();

    const params = new URLSearchParams();
    params.append('grant_type', 'urn:ietf:params:oauth:grant-type:jwt-bearer');
    params.append('assertion', jwtToken);

    const response = await axios.post(
        `${process.env.SF_LOGIN_URL}/services/oauth2/token`,
        params
    );

    return response.data;
    }

async function publishStockEvent(access_token, instanceUrl, eventData)
{
    const response = await axios.post(
        `${instanceUrl}/services/data/v60.0/sobjects/Stock_Price_Event__e`,
        eventData,
        {
            headers: {
                Authorization: `Bearer ${access_token}`,
                'Content-Type': 'application/json'
            }
        }
    );
    return response.data;
}
async function main() {
    try{
    const {access_token, instance_url} = await getAccessToken();
    console.log('Authenticated. Instance URL: ',instance_url);

    //publish platform event here 
    const testEvent ={
        Symbol__c: 'AAPL',
        Price__c: 189.42,
        Volume__c: 1200,
        Trade_Timestamp__c : Date.now()

    };

    const result =await publishStockEvent(access_token, instance_url, testEvent);
    console.log('Event publoshed:', result);

    } catch (err) {
        console.error('relay failed: ', err.response ? err.response.data: err.message);
    }
}

//main();

function startFinnhubStream() {
    const socket = new WebSocket(`wss://ws.finnhub.io?token=${process.env.FINNHUB_API_KEY}`);
  
    socket.on('open', () => {
      console.log('Connected to Finnhub');
      socket.send(JSON.stringify({ type: 'subscribe', symbol: 'AAPL' }));
    });
  
    socket.on('message', (data) => {
        console.log('RAW:', data.toString());
      const parsed = JSON.parse(data);
      if(parsed.type === 'ping'){
        console.log('keepalive ping received');
      }
      else if(parsed.type ==='trade'){
        parsed.data.forEach(trade => {
            processTrade(trade);
            console.log('trade: ', trade);
        });
          }
    });
  
    socket.on('error', (err) => {
      console.error('WebSocket error:', err.message);
    });
  
    socket.on('close', () => {
      console.log('Finnhub connection closed');
    });
  }

    //startFinnhubStream();
    if (process.env.SIMULATE === 'true') {
        simulateTrades();
      } else {
        startFinnhubStream();
      }


    async function processTrade(trade) {

        const lastTime = lastPublishTime.get(trade.s);
        const now = Date.now();

        if(lastTime !== undefined && (now - lastTime) < THROTTLE_MS) {
            console.log('Throttled skipping:', trade.s);
            return;
        }
        lastPublishTime.set(trade.s, now);


        try{
                const {access_token, instance_url} = await getValidAccessToken();

                const eventData = {
                    Symbol__c: trade.s,
                    Price__c: trade.p,
                    Volume__c: trade.v,
                    Trade_Timestamp__c: trade.t
                };

                const result= await publishStockEvent(access_token, instance_url, eventData);
                console.log('Published:', trade.s, trade.p, '->', result.id);
                
                
        } catch(err){
            console.error('Publish failed:', err.response ? err.response.data : err.message);        
        }
      }

      //simulated trade generator
    function simulateTrades() {
        console.log('Running in simulation mode');

        setInterval(() => {
            const fakeTrade = {
                s: 'AAPL',
                p: +(180 + Math.random()*20).toFixed(2),
                v: Math.floor(Math.random()*500)+1,
                t: Date.now()
            };
            processTrade(fakeTrade);
        }, 3000);
    }

    async function getValidAccessToken() {
        if(cachedToken !== null ){
            return {
                access_token: cachedToken,
                instance_url: cachedInstanceUrl
            };
            
        }else {
            const {access_token, instance_url} = await getAccessToken();
            cachedToken = access_token;
            cachedInstanceUrl = instance_url;

            return{
                access_token: cachedToken,
                instance_url: cachedInstanceUrl
            };

        }
    }




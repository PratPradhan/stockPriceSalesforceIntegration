
# stockPriceSalesforceIntegration

A live stock price ticker built on Salesforce Experience Cloud, streaming real-time trade data from Finnhub into an LWC via a Node.js relay, Platform Events, and Apex — built as a hands-on integration architecture project.

Architecture:

Finnhub WebSocket → Node.js relay (JWT auth, throttled) → Salesforce Platform Event
    → Apex trigger (bulk upsert using stock Symbol as Key) → Stock_Price_Snapshot__c (custom object to hold latest updated record using symbol as external id(key))
    → Apex controller (guest-accessible with sharing but object OWD is Public READ ONLY) → LWC on Experience Cloud (polling using relay in node js to get latest updates in a time span of 3000ms)

Tech stack


Data source: Finnhub WebSocket API (free tier) - It has some considearble lag in getting response for the free tier.
Middleware: Node.js relay (ws, axios, jsonwebtoken) -first time hands on in Node.Js  so interesting stuff to explore
Auth: Salesforce JWT Bearer OAuth flow (Connected App + self-signed certificate) - generated certificate in local compiuter and uploaded that in external connected app in salesforce.
Salesforce: Platform Events, Apex Trigger, Apex Controller, Custom Object
Frontend: Lightning Web Component on an Experience Cloud (LWR) guest site (very simple UI just to display record (heavy area of improvement) but backend steps are most important here)



Architecture Diagram

<img width="1440" height="1440" alt="image" src="https://github.com/user-attachments/assets/737a6329-61db-4b9f-8517-d1195619d147" />
>>>>>>> 2f4d8f8559f2fce8ec8e27aa9f81661c16dbbf0c

Implementation steps

1. Platform event


Created Stock_Price_Event__e platform event with Symbol__c, Price__c, Volume__c, Trade_Timestamp__c
Set Publish Behavior to Publish Immediately (no dependent transaction to protect)

2. Authentication (JWT Bearer flow)


Generated a self-signed cert/key pair with OpenSSL
Created a Connected App with digital signatures enabled, uploaded the public certificate
Set Permitted Users to Admin approved users are pre-authorized
Added the refresh_token/offline_access scope — required by Salesforce for JWT Bearer flow even though no refresh token is persisted

3. Relay (Node.js)


Signs a short-lived JWT (iss/sub/aud/exp) and exchanges it for an access token
Caches the access token in memory to avoid re-authenticating on every trade
Connects to Finnhub's WebSocket, subscribes to a symbol, and handles both real trade messages and simulated data (for testing outside market hours)
Throttles publishes per symbol (one publish per ~2 seconds) to respect Platform Event limits and collapse duplicate trade reports from the exchange feed
Publishes each throttled tick to Salesforce via the sObject REST API

4. Apex trigger


after insert trigger on the platform event
Builds a bulk list of Stock_Price_Snapshot__c records and upserts them in a single DML call, matching on Symbol__c (marked as External ID + Unique) so each symbol has exactly one row

5. Guest-accessible read path


Stock_Price_Snapshot__c OWD set to Public Read Only
Guest User Profile granted object + field-level Read access
with sharing Apex controller exposing an @AuraEnabled(cacheable=false) method (deliberately not cacheable, since the UI needs a fresh read every poll)

6. LWC on Experience Cloud


Calls the Apex controller imperatively (not @wire, since the method isn't cacheable)
Polls on a setInterval timer, cleaned up in disconnectedCallback
Chose LWC polling over empApi/CometD streaming, since lightning/empApi isn't supported on Experience Cloud sites, and CometD would require enabling guest streaming access — polling avoids both constraints with a negligible UX trade-off given the throttled publish rate

DESIGN CONSIDERATION:
No token-expiry retry logic in the relay (acceptable for demo-length sessions)
Single symbol (AAPL) tracked end-to-end; both the Apex controller and platform event schema are designed to extend to multiple symbols
<img width="1056" height="592" alt="Screenshot 2026-07-14 at 9 33 36 PM" src="https://github.com/user-attachments/assets/46a5fedc-9648-49b7-99b1-caee91384863" />
<img width="1056" height="592" alt="Screenshot 2026-07-14 at 9 33 36 PM" src="https://github.com/user-attachments/assets/8dcd8066-3ad4-448f-a0bd-7a30debf813c" />
<img width="1319" height="327" alt="Screenshot 2026-07-14 at 9 34 05 PM" src="https://github.com/user-attachments/assets/7e3f46b7-e6c8-446b-b973-b2a7fff441da" />
<img width="1328" height="944" alt="Screenshot 2026-07-14 at 9 34 30 PM" src="https://github.com/user-attachments/assets/91ba07f2-e0b3-4412-8560-bbc92ec29cdb" />




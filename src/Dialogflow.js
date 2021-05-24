"use strict";
const dialogflow = require('@google-cloud/dialogflow');
const util = require('util');
const fs = require('fs');

module.exports = class {
    #sessionClient;
    #projectID;
    #languageCode;
    #sessionID;

    constructor(ProjectID, JSON_LOCATION, languageCode, session) {
        this.#sessionClient = new dialogflow.SessionsClient({ keyFilename: JSON_LOCATION });
        this.#projectID = ProjectID;
        this.#languageCode = languageCode;
        this.#sessionID = session;
    }

    get sessionClient() {
        return this.sessionClient;
    }

    get projectID() {
        return this.#projectID;
    }

    get languageCode() {
        return this.#languageCode;
    }

    get sessionID() {
        return this.#sessionID;
    }

    async detectIntent(query, contexts) {
        const sessionPath = this.#sessionClient.projectAgentSessionPath(
            this.#projectID,
            this.#sessionID
        );

        const request = {
            session: sessionPath,
            queryInput: {
                text: {
                    text: query,
                    languageCode: this.#languageCode,
                },
            },
        };

        if (contexts && contexts.length > 0) {
            request.queryParams = {
                contexts: contexts,
            };
        }

        const responses = await this.#sessionClient.detectIntent(request);
        return responses[0];
    }

    async sendText(query) {
        let context;
        let intentResponse;
        try {
            intentResponse = await this.detectIntent(
                query,
                context,
            );
            return intentResponse.queryResult;
        } catch (error) {
            console.log(error);
        }
    }

}
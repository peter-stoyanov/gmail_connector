const fs = require('fs');
const readline = require('readline');
const { google } = require('googleapis');

/**
 * Creates gmail messages query filter with fluid API
 */
var queryBuilder = (function() {
    let _query = [];
    let _builder = {};

    _builder.new = function() {
        _query = [];
        return _builder;
    }

    _builder.from = function(emailAddress) {
        _query.push(`from:${emailAddress}`);
        return _builder;
    }

    _builder.read = function(isRead) {
        _query.push(`is:${isRead ? 'read' : 'unread'}`);
        return _builder;
    }

    _builder.withSubject = function(subject) {
        _query.push(`subject:${subject}`);
        return _builder;
    }

    _builder.withText = function(text) {
        _query.push(`"${text}"`);
        return _builder;
    }

    _builder.withAttachment = function() {
        _query.push(`has:attachment`);
        return _builder;
    }

    _builder.withFile = function(fileName) {
        _query.push(`filename:${fileName}`);
        return _builder;
    }

    _builder.newerThan = function(timeSpan) {
        _query.push(`newer_than:${timeSpan}`);
        return _builder;
    }

    _builder.build = function() {
        return _query.join(' ');
    }

    return _builder;
}());

/**
 * Access the google gmail API
 */
var gmailApi = (function() {
    'use strict';

    // If modifying these scopes, delete token.json.
    const SCOPES = ['https://www.googleapis.com/auth/gmail.readonly'];
    // The file token.json stores the user's access and refresh tokens, and is
    // created automatically when the authorization flow completes for the first
    // time.

    // Go to https://developers.google.com/gmail/api/quickstart/nodejs to create and store credentials.json for your account
    const TOKEN_PATH = 'credentials/token.json';

    function getCredentials() {
        try {
            // Load client secrets from a local file.
            const content = fs.readFileSync('credentials/credentials.json');
            const credentials = JSON.parse(content);

            return credentials;

        } catch (error) {
            return console.log('Error loading client secret file:', error);
        }
    }

    /**
     * Create an OAuth2 client with the given credentials
     * @param {Object} credentials The authorization client credentials.
     */
    async function getOAuth2Client(credentials) {
        return new Promise(async (resolve, reject) => {
            const { client_secret, client_id, redirect_uris } = credentials.installed;
            const oAuth2Client = new google.auth.OAuth2(
                client_id, client_secret, redirect_uris[0]);

            let token;
            try {
                // Check if we have previously stored a token.
                token = fs.readFileSync(TOKEN_PATH);
            } catch (error) {
                token = await getNewToken(oAuth2Client);
            }

            oAuth2Client.setCredentials(JSON.parse(token));

            resolve(oAuth2Client);
        });
    }

    /**
     * Get and store new token after prompting for user authorization
     * @param {google.auth.OAuth2} oAuth2Client The OAuth2 client to get token for.
     */
    async function getNewToken(oAuth2Client) {
        return new Promise((resolve, reject) => {
            const authUrl = oAuth2Client.generateAuthUrl({
                access_type: 'offline',
                scope: SCOPES,
            });
            console.log('Authorize this app by visiting this url:', authUrl);
            const rl = readline.createInterface({
                input: process.stdin,
                output: process.stdout,
            });
            rl.question('Enter the code from that page here: ', (code) => {
                rl.close();
                oAuth2Client.getToken(code, (err, token) => {
                    if (err) return reject('Error retrieving access token ' + err);
                    // Store the token to disk for later program executions
                    fs.writeFile(TOKEN_PATH, JSON.stringify(token), (err) => {
                        if (err) return reject(err);
                        console.log('Token stored to', TOKEN_PATH);
                        resolve(token);
                    });
                });
            });
        });
    }

    async function messageExists(query) {
        return new Promise(async (resolve, reject) => {
            const credentials = getCredentials();
            const auth = await getOAuth2Client(credentials);
            const gmail = google.gmail({ version: 'v1', auth });

            gmail.users.messages.list({
                userId: 'me',
                maxResults: 2,
                q: query
            }, (err, res) => {
                if (err) {
                    reject('The API returned an error: ' + err);
                    return;
                }

                const messages = res.data.messages;
                if (!messages) {
                    reject('No messages found for query:\n' + query);
                    return;
                }

                if (messages.length > 1) {
                    reject('More than one message found for query:\n' + query);
                    return;
                }

                console.log('Messages:');

                messages.forEach((message) => {
                    console.log(`- ${message.id}`);

                    gmail.users.messages.get({
                        userId: 'me',
                        id: message.id,
                        format: 'full'
                    }, (err, res) => {
                        if (err) {
                            reject('The message GET returned an error: ' + err);
                            return;
                        }
                        console.log(res.data.snippet);
                        resolve(true);
                        return;
                    });
                });
            });
        });
    }

    return {
        messageExists: messageExists
    };
}());


module.exports = {
    api: gmailApi,
    queryBuilder: queryBuilder
};


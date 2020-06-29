'use strict';
var express = require('express');
var logger = require('connect-logger');
var cookieParser = require('cookie-parser');
var session = require('cookie-session');
var fs = require('fs');
var crypto = require('crypto');
var keytar = require('keytar');
var opn = require('open');

var AuthenticationContext = require('adal-node').AuthenticationContext;

var app = express();
app.use(logger());
app.use(cookieParser('a deep secret'));
app.use(session({secret: '1234567890QWERTY'}));
var client_id_graph = '3c2ff05c-d8db-48bf-ac19-9b0d7294e050';
const client_id_arm = '33c31634-d8df-4199-99f6-ae4b3fef50cd';

var sampleParameters = {
    "tenant" : "common",
    "authorityHostUrl" : "https://login.microsoftonline.com",
    "clientId" : "3c2ff05c-d8db-48bf-ac19-9b0d7294e050"
};
var authorityUrl = sampleParameters.authorityHostUrl + '/' + sampleParameters.tenant;
var redirectUri = 'http://localhost:3000/callback';
var resource_graph = 'https://graph.microsoft.com';
var resource_arm = 'https://management.azure.com';
// resource = '00000003-0000-0000-c000-000000000000';
var templateAuthzUrl = 'https://login.microsoftonline.com/' + sampleParameters.tenant + '/oauth2/authorize?response_type=code&client_id=<client_id>&redirect_uri=<redirect_uri>&state=<state>&resource=<resource>&scope=<scope>';
var scopeForGraph = 'offline_access%20user.read%20Directory.AccessAsUser.All';
var scopeForARM = 'https://management.azure.com//user_impersonation';
var val;

/**
 * Open the Authentication URL in default browser
 * @param  	{String} 	scope 			The scopes required by the OAuth app
 * @param  	{String} 	callback 		The redirect URL for the OAuth app
 * @param  	{String} 	client_id 		Client ID of the OAuth app
 * @param  	{Object} 	userDetails 	The object that stores user's information
 */
async function openSignInLink(scope, callback, client_id, tenant_id, resource){
	await opn('https://login.microsoftonline.com/'+tenant_id+'/oauth2/authorize?client_id='+client_id+'&response_type=code&redirect_uri='+callback+'&response_mode=query&scope='+scope+'&resource='+resource);
}
/**
 * Get the redirect  URL for the OAuth process
 * @param  {String} callback 	The redirect page for the OAuth app
 * @return {Promise}			Resolves after sending the data to the redirect page
 */
async function getCallback(callback, resource, redirectUri, client_id){
	return new Promise((resolve) => {
		// app.get(callback, function(req, res){
		// 	code = req.query['code'];
		// 	res.send("You are logged in, now you can go back to your terminal!");
		// 	resolve();
        // });
        app.get('/'+callback, function(req, res) {
            var authenticationContext = new AuthenticationContext(authorityUrl);
            authenticationContext.acquireTokenWithAuthorizationCode(req.query.code, redirectUri, resource, client_id, undefined, async function(err, response) {
              var message = req.query.code + '\n' + redirectUri + '\n' + resource+'\n';
              if (err) {
                message += 'error: ' + err.message + '\n';
              }
              message += JSON.stringify(response);
              if (err) {
                res.send(message);
                return;
              }
          
            //   authenticationContext.acquireTokenWithRefreshToken(response.refreshToken, client_id, resource, function(refreshErr, refreshResponse) {
            //     if (refreshErr) {
            //       message += 'refreshError: ' + refreshErr.message + '\n';
            //     }
            //     message += '\nrefreshResponse: ' + JSON.stringify(refreshResponse);
            //     message += '\n\n\nksnjksbjsbjsbjsbhjsbjksb';
            //   });
            //   console.log(message);
              res.send(message);
              val = response;
              resolve();
            });
        });
	});
}
/**
 * Authenticate the user's azure account for the Microsoft Graph endpoint
 * @param 	{Object} 	userDetails		The object that stores user's information
 */
async function OAuthGraph(){
	await openSignInLink(scopeForGraph, 'http://localhost:3000/callback', client_id_graph, 'common',resource_graph);
	await getCallback('callback',resource_graph, 'http://localhost:3000/callback', client_id_graph);
}
/**
 * Authenticate the user's azure account for the Microsoft Graph endpoint
 * @param 	{Object} 	userDetails		The object that stores user's information
 */
async function OAuthARM(){
	await openSignInLink(scopeForARM, 'http://localhost:3000/callbackarm', client_id_arm, 'common',resource_arm);
	await getCallback('callbackarm', resource_arm, 'http://localhost:3000/callbackarm', client_id_arm);
}



(async function(){
    await OAuthGraph();
    console.log("GRAPH DONE");
    const graph_token = 'graph';
    await keytar.setPassword('graph', 'access_token', val['accessToken']);
    await keytar.setPassword('graph', 'token_type', val['tokenType']);
    await keytar.setPassword('graph', 'refresh_token', val['refreshToken']);

    var pass = await keytar.getPassword(graph_token, 'access_token');
    console.log(pass);
    pass = await keytar.getPassword(graph_token, 'token_type');
    console.log(pass);
    pass = await keytar.getPassword(graph_token, 'refresh_token');
    console.log(pass);


    await OAuthARM();
    console.log("ARM DONE");
    const arm_token = 'arm';
    await keytar.setPassword(arm_token, 'access_token', val['accessToken']);
    await keytar.setPassword(arm_token, 'token_type', val['tokenType']);
    await keytar.setPassword(arm_token, 'refresh_token', val['refreshToken']);

    pass = await keytar.getPassword(arm_token, 'access_token');
    console.log(pass);
    pass = await keytar.getPassword(arm_token, 'token_type');
    console.log(pass);
    pass = await keytar.getPassword(arm_token, 'refresh_token');
    console.log(pass);
    

})();
app.listen(3000);
console.log('listening on 3000');
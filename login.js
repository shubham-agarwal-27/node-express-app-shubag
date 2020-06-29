'use strict';
var express = require('express');
var logger = require('connect-logger');
var cookieParser = require('cookie-parser');
var session = require('cookie-session');
var fs = require('fs');
var crypto = require('crypto');
var keytar = require('keytar');
const { getPackedSettings } = require('http2');

var AuthenticationContext = require('adal-node').AuthenticationContext;

var app = express();
app.use(logger());
app.use(cookieParser('a deep secret'));
app.use(session({secret: '1234567890QWERTY'}));

var sampleParameters = {
    "tenant" : "shubhvanraj27gmail.onmicrosoft.com",
    "authorityHostUrl" : "https://login.microsoftonline.com",
    "clientId" : "3c2ff05c-d8db-48bf-ac19-9b0d7294e050"
};
var authorityUrl = sampleParameters.authorityHostUrl + '/' + sampleParameters.tenant;
var redirectUri = 'http://localhost:3000/callback';
var resource = 'https://graph.microsoft.com';
resource = 'https://management.azure.com';
// resource = '00000003-0000-0000-c000-000000000000';
var templateAuthzUrl = 'https://login.microsoftonline.com/' + sampleParameters.tenant + '/oauth2/authorize?response_type=code&client_id=<client_id>&redirect_uri=<redirect_uri>&state=<state>&resource=<resource>&scope=<scope>';
var scopeForGraph = 'offline_access%20user.read%20Directory.AccessAsUser.All';
var scopeForARM = 'https://management.azure.com//user_impersonation';

// app.get('/', function(req, res) {
//     res.redirect('login');
// });

// app.get('/login', function(req, res) {
//   console.log(req.cookies);
//   res.cookie('acookie', 'this is a cookie');
//   res.send('\
// <head>\
//   <title>FooBar</title>\
// </head>\
// <body>\
//   <a href="./auth">Login</a>\
// </body>\
//     ');
// });

// function createAuthorizationUrl(state) {
//   var authorizationUrl = templateAuthzUrl.replace('<client_id>', sampleParameters.clientId);
//   authorizationUrl = authorizationUrl.replace('<redirect_uri>',redirectUri);
//   authorizationUrl = authorizationUrl.replace('<state>', state);
//   authorizationUrl = authorizationUrl.replace('<resource>', resource);
//   authorizationUrl = authorizationUrl.replace('<scope>', scopeForARM);
//   return authorizationUrl;
// }

// app.get('/auth', function(req, res) {
//   crypto.randomBytes(48, function(ex, buf) {
//     var token = buf.toString('base64').replace(/\//g,'_').replace(/\+/g,'-');

//     res.cookie('authstate', token);
//     var authorizationUrl = createAuthorizationUrl(token);

//     res.redirect(authorizationUrl);
//   });
// });

// app.get('/callback', function(req, res) {
//   if (req.cookies.authstate !== req.query.state) {
//     res.send('error: state does not match');
//   }
//   var authenticationContext = new AuthenticationContext(authorityUrl);
//   authenticationContext.acquireTokenWithAuthorizationCode(req.query.code, redirectUri, resource, sampleParameters.clientId, undefined, function(err, response) {
//     var message = req.query.code + '\n' + redirectUri + '\n' + resource+'\n';
//     if (err) {
//       message += 'error: ' + err.message + '\n';
//     }
//     message += 'response: ' + JSON.stringify(response);

//     if (err) {
//       res.send(message);
//       return;
//     }

//     authenticationContext.acquireTokenWithRefreshToken(response.refreshToken, sampleParameters.clientId, resource, function(refreshErr, refreshResponse) {
//       if (refreshErr) {
//         message += 'refreshError: ' + refreshErr.message + '\n';
//       }
//       message += 'refreshResponse: ' + JSON.stringify(refreshResponse);
//     });
//     console.log(message);
//     res.send("MY debug\n"+message);
//   });
// });

(async function(){
    // const credentialsSection = 'testing';
    // await keytar.setPassword(credentialsSection, 'Azure', "eyJ0eXAiOiJKV1QiLCJub25jZSI6InBzeVBCdkZQWi1kck9acFEtZ052Ukdza3dOeXBDb2QycEpBRDZqWWtFYWsiLCJhbGciOiJSUzI1NiIsIng1dCI6IlNzWnNCTmhaY0YzUTlTNHRycFFCVEJ5TlJSSSIsImtpZCI6IlNzWnNCTmhaY0YzUTlTNHRycFFCVEJ5TlJSSSJ9.eyJhdWQiOiIwMDAwMDAwMy0wMDAwLTAwMDAtYzAwMC0wMDAwMDAwMDAwMDAiLCJpc3MiOiJodHRwczovL3N0cy53aW5kb3dzLm5ldC9hNDVjNzcyMy0xNmQ0LTQyZWYtOTliMy1kMmNiNTFmZWEyZmUvIiwiaWF0IjoxNTkzNDEyNTM0LCJuYmYiOjE1OTM0MTI1MzQsImV4cCI6MTU5MzQxNjQzNCwiYWNjdCI6MCwiYWNyIjoiMSIsImFpbyI6IkFVUUF1LzhRQUFBQWdDNGJEVThndS9LYmppYVNLVXB4R01iYm1zTWdUOVFvbGlxN0E1RXNIMFJlRVZYcDFiMnJJaStYay9NVjFrak5PalJrZEpyeC9kUkdPNnZ3dXhiY3J3PT0iLCJhbHRzZWNpZCI6IjE6bGl2ZS5jb206MDAwMzdGRkUwQzI2RjcyMSIsImFtciI6WyJwd2QiXSwiYXBwX2Rpc3BsYXluYW1lIjoiU2h1YmhhbU9BdXRoQXBwIiwiYXBwaWQiOiIzYzJmZjA1Yy1kOGRiLTQ4YmYtYWMxOS05YjBkNzI5NGUwNTAiLCJhcHBpZGFjciI6IjAiLCJlbWFpbCI6InNodWJodmFucmFqMjdAZ21haWwuY29tIiwiZmFtaWx5X25hbWUiOiJBZ2Fyd2FsIiwiZ2l2ZW5fbmFtZSI6IlNodWJoYW0iLCJpZHAiOiJsaXZlLmNvbSIsImlwYWRkciI6IjExNy45OC4xNTUuMjM5IiwibmFtZSI6IlNodWJoYW0gQWdhcndhbCIsIm9pZCI6IjA0NzY4YzA5LTFmODgtNGRhMS05MzQ3LTk4NDQ2Mjc2OTFiNyIsInBsYXRmIjoiMyIsInB1aWQiOiIxMDAzMjAwMEM3MUEzRkRDIiwic2NwIjoiRGlyZWN0b3J5LkFjY2Vzc0FzVXNlci5BbGwgU2l0ZXMuUmVhZFdyaXRlLkFsbCBVc2VyLlJlYWQgcHJvZmlsZSBvcGVuaWQgZW1haWwiLCJzdWIiOiJKa29sZ2h5WUVVejBGaEZSek9nbEtoTG9rcmw3WmowM3RobVptQmQ4ZmpBIiwidGVuYW50X3JlZ2lvbl9zY29wZSI6IkFTIiwidGlkIjoiYTQ1Yzc3MjMtMTZkNC00MmVmLTk5YjMtZDJjYjUxZmVhMmZlIiwidW5pcXVlX25hbWUiOiJsaXZlLmNvbSNzaHViaHZhbnJhajI3QGdtYWlsLmNvbSIsInV0aSI6IklQQXM2QWZ0bzB1ZGVoUXdjdG55QVEiLCJ2ZXIiOiIxLjAiLCJ3aWRzIjpbIjYyZTkwMzk0LTY5ZjUtNDIzNy05MTkwLTAxMjE3NzE0NWUxMCJdLCJ4bXNfc3QiOnsic3ViIjoia292aVpFSUlUZnRVSnBxN25YZXdWUUZqb1dLY1R1VjRpazJuRE9JbEdzayJ9LCJ4bXNfdGNkdCI6MTU5MTY5NDM4MX0.JpGgAOeKMdvsJerv3NahVxwFZqq3GMKpz-eYD6Wkc2Z_ErvRnvhjTpv7b6JYi8Lgs5OqtTehHxcA7lZQnd4cjFBsNSiANmXb2M4ApdkaUYq0XtRBKENZqKvNZdPxuwssCVZHyUjF5rvKDnfyonKDyz87U7Pk9KX8jf4fVj_u8cRyr34u3LGi5-jmuRRLDHS7vLiaYTaeuBu3N_gpJt2bnsNGw9Jizjzglyuge0UIWokCut28Z8zgrMIvETiRHpDAPbJnWaoHwq1cXuhbRhY_r-5GoS6c6EYY2ALsycKxbR-SwCmOnCrsmfdK-fpnJaYFH6HJWtH5pewxqZ_Bjeo6mQ");
    // // console.log("hey");
    // var pass = await keytar.getPassword(credentialsSection, 'Azure');
    // console.log(pass);

    const credentialsSection = 'git:https://github.com';
    // await keytar.setPassword(credentialsSection, '', "eyJ0eXAiOiJKV1QiLCJub25jZSI6InBzeVBCdkZQWi1kck9acFEtZ052Ukdza3dOeXBDb2QycEpBRDZqWWtFYWsiLCJhbGciOiJSUzI1NiIsIng1dCI6IlNzWnNCTmhaY0YzUTlTNHRycFFCVEJ5TlJSSSIsImtpZCI6IlNzWnNCTmhaY0YzUTlTNHRycFFCVEJ5TlJSSSJ9.eyJhdWQiOiIwMDAwMDAwMy0wMDAwLTAwMDAtYzAwMC0wMDAwMDAwMDAwMDAiLCJpc3MiOiJodHRwczovL3N0cy53aW5kb3dzLm5ldC9hNDVjNzcyMy0xNmQ0LTQyZWYtOTliMy1kMmNiNTFmZWEyZmUvIiwiaWF0IjoxNTkzNDEyNTM0LCJuYmYiOjE1OTM0MTI1MzQsImV4cCI6MTU5MzQxNjQzNCwiYWNjdCI6MCwiYWNyIjoiMSIsImFpbyI6IkFVUUF1LzhRQUFBQWdDNGJEVThndS9LYmppYVNLVXB4R01iYm1zTWdUOVFvbGlxN0E1RXNIMFJlRVZYcDFiMnJJaStYay9NVjFrak5PalJrZEpyeC9kUkdPNnZ3dXhiY3J3PT0iLCJhbHRzZWNpZCI6IjE6bGl2ZS5jb206MDAwMzdGRkUwQzI2RjcyMSIsImFtciI6WyJwd2QiXSwiYXBwX2Rpc3BsYXluYW1lIjoiU2h1YmhhbU9BdXRoQXBwIiwiYXBwaWQiOiIzYzJmZjA1Yy1kOGRiLTQ4YmYtYWMxOS05YjBkNzI5NGUwNTAiLCJhcHBpZGFjciI6IjAiLCJlbWFpbCI6InNodWJodmFucmFqMjdAZ21haWwuY29tIiwiZmFtaWx5X25hbWUiOiJBZ2Fyd2FsIiwiZ2l2ZW5fbmFtZSI6IlNodWJoYW0iLCJpZHAiOiJsaXZlLmNvbSIsImlwYWRkciI6IjExNy45OC4xNTUuMjM5IiwibmFtZSI6IlNodWJoYW0gQWdhcndhbCIsIm9pZCI6IjA0NzY4YzA5LTFmODgtNGRhMS05MzQ3LTk4NDQ2Mjc2OTFiNyIsInBsYXRmIjoiMyIsInB1aWQiOiIxMDAzMjAwMEM3MUEzRkRDIiwic2NwIjoiRGlyZWN0b3J5LkFjY2Vzc0FzVXNlci5BbGwgU2l0ZXMuUmVhZFdyaXRlLkFsbCBVc2VyLlJlYWQgcHJvZmlsZSBvcGVuaWQgZW1haWwiLCJzdWIiOiJKa29sZ2h5WUVVejBGaEZSek9nbEtoTG9rcmw3WmowM3RobVptQmQ4ZmpBIiwidGVuYW50X3JlZ2lvbl9zY29wZSI6IkFTIiwidGlkIjoiYTQ1Yzc3MjMtMTZkNC00MmVmLTk5YjMtZDJjYjUxZmVhMmZlIiwidW5pcXVlX25hbWUiOiJsaXZlLmNvbSNzaHViaHZhbnJhajI3QGdtYWlsLmNvbSIsInV0aSI6IklQQXM2QWZ0bzB1ZGVoUXdjdG55QVEiLCJ2ZXIiOiIxLjAiLCJ3aWRzIjpbIjYyZTkwMzk0LTY5ZjUtNDIzNy05MTkwLTAxMjE3NzE0NWUxMCJdLCJ4bXNfc3QiOnsic3ViIjoia292aVpFSUlUZnRVSnBxN25YZXdWUUZqb1dLY1R1VjRpazJuRE9JbEdzayJ9LCJ4bXNfdGNkdCI6MTU5MTY5NDM4MX0.JpGgAOeKMdvsJerv3NahVxwFZqq3GMKpz-eYD6Wkc2Z_ErvRnvhjTpv7b6JYi8Lgs5OqtTehHxcA7lZQnd4cjFBsNSiANmXb2M4ApdkaUYq0XtRBKENZqKvNZdPxuwssCVZHyUjF5rvKDnfyonKDyz87U7Pk9KX8jf4fVj_u8cRyr34u3LGi5-jmuRRLDHS7vLiaYTaeuBu3N_gpJt2bnsNGw9Jizjzglyuge0UIWokCut28Z8zgrMIvETiRHpDAPbJnWaoHwq1cXuhbRhY_r-5GoS6c6EYY2ALsycKxbR-SwCmOnCrsmfdK-fpnJaYFH6HJWtH5pewxqZ_Bjeo6mQ");
    // console.log("hey");
    var pass = await keytar.getPassword(credentialsSection, 'PersonalAccessToken');
    console.log(pass);



})();
// app.listen(3000);
// console.log('listening on 3000');
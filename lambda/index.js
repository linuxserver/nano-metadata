'use strict';
var AWS = require('aws-sdk');
var s3 = new AWS.S3();
var NanoCurrency = require('nanocurrency');
var https = require('https');
var blake = require('blakejs');
var fetch = require('node-fetch');

exports.handler = async function(event, context, callback) {
  var responseCode = 200;
  var networks = {
    lsio: {
      url: 'https://nano.linuxserver.io:7077'
    },
    live: {
      url: 'https://proxy.nanos.cc/proxy',
      headers: {
        'Content-Type': 'application/json'
      }
    }
  }
  if (event.queryStringParameters !== null && event.queryStringParameters !== undefined) {
    if (event.queryStringParameters.trans && event.queryStringParameters.pub && event.queryStringParameters.data && event.queryStringParameters.sig && event.queryStringParameters.net) {
      var trans = event.queryStringParameters.trans;
      var pub = event.queryStringParameters.pub;
      var data = event.queryStringParameters.data;
      var sig = event.queryStringParameters.sig;
      var net = event.queryStringParameters.net;
      var re = /^[0-9a-fA-F]+$/;
      if (NanoCurrency.checkHash(trans) && NanoCurrency.checkKey(pub) && NanoCurrency.checkSignature(sig) && re.test(data) && data.length < 65 && net in networks) {
        const res = await new Promise(resolve => https.get('https://s3-us-west-2.amazonaws.com/nanometadata.com/' + trans, {method: 'HEAD'}, resolve));
        if (res.statusCode !== 200) {
	        var hash = blake.blake2sHex(trans + data)
	        if (NanoCurrency.verifyBlock({hash: hash,signature: sig,publicKey: pub})) {
            var postbody = {
              action: 'block_account',
              hash: trans
            }
            var rpcres = await rpCall(networks[net],postbody);
            if (rpcres.account) {
              var signaccount = NanoCurrency.deriveAddress(pub).split('_')[1];
              var blockaccount = rpcres.account.split('_')[1];
              if (signaccount === blockaccount){
                var metadatabody = pub + sig + data;
                await s3.putObject({
                  Bucket: 'nanometadata.com',
                  Key: trans,
                  ContentType:'text/plain',
                  Body: Buffer.from(metadatabody, 'binary')
                }).promise();
                var responseBody = {
                  action: 'success',
                  message: 'https://www.nanometadata.com/' + trans
                };
                respond(responseBody);  
              } else {
                var responseBody = {
                  action: 'none',
                  message: 'Block does not belong to nano_' + signaccount
                };
                respond(responseBody);  
              }
            } else {
              var responseBody = {
                action: 'none',
                message: 'Block not found at ' + networks[net].url
              };
              respond(responseBody);
            }
          } else {
            var responseBody = {
              action: 'none',
              message: 'Invalid signature for public key'
            };
            respond(responseBody);
          }
        } else {
          var responseBody = {
            action: 'none',
            message: 'Metadata allready set for this transaction https://www.nanometadata.com/' + trans
          };
          respond(responseBody);
        }
      } else {
        var responseBody = {
          action: 'none',
          message: 'Invalid parameters detected, please use https://www.nanometadata.com to generate your request to determine what is wrong'
        };
        respond(responseBody);
      }
    } else {
      var responseBody = {
        action: 'none',
        message: 'Parameter passed not recognized this endpoint requires ?trans=<yourtransactionid>&pub=<yourpubkey>&data=<base64encodedmetadata>&sig=<signedhashofdata>&net=<networktouse> parameters'
      };
      respond(responseBody);
    }
  } else {
    var responseBody = {
      action: 'none',
      message: 'No parameters passed this endpoint requires ?trans=<yourtransactionid>&pub=<yourpubkey>&data=<base64encodedmetadata>&si=<signedhashofdata>&net=<networktouse> parameters'
    };
    respond(responseBody);
  }

  async function rpCall (nodeinfo, body) {
    var rpcurl = nodeinfo.url
    var Init = { method:'POST',body: JSON.stringify(body)}
    Init.headers = {}
    if ('headers' in nodeinfo) {
      Init.headers = nodeinfo.headers
    }
    if (nodeinfo.auth !== null) {
      Init.headers['Authorization'] = nodeinfo.auth
    }
    var res = await fetch(rpcurl,Init)
    var data = await res.json()
    return data
  }


  function respond(responseBody) {
    console.log(responseBody);
    var response = {
      statusCode: responseCode,
      headers: {'Access-Control-Allow-Origin':'*'},
      body: JSON.stringify(responseBody, null, 4)
    };
    callback(null, response);
  }
};

# Nano Metadata

## Demo

This software is hosted at both:

https://www.nanometadata.com/ - Should be trusted but does not have a transparent build process to publish, clientside files are built and pushed on the backend at stable releases

https://metadata.linuxserver.io/ - This is transparently built here on Github and published using Github pages, if you are worried about digging into source code to verify it, especially because it is published minified you should use this endpoint 

The server side API component is hosted at https://api.nanometadata.com/metadata . 

If you want to host this yourself you need to have a basic underlying understanding of AWS and it's services the full stack is a combination of: 
* AWS Cloudfront - Used to serve the clientside demo signing app and all metadta files in a caching worldwide CDN
* AWS S3 - Backend data storage behind Coudfront
* AWS API Gateway - Used to provide an https endpoint the server side component can be invoked with in a scaling horizontal manner
* AWS Lambda - The actual invocation of the code verifying the crypto side and pushing verified files to be published to backend storage

## Intro

This project consists of two parts with the end goal of being able to store arbitrary metadata for a Nano transaction using the same cryptographic verification tools used to verify Nano blocks:
* Server side - A simple API designed around serverless infrascructure using Lambda, S3 and Cloudfront from AWS
* Client side - A browser based pure clientside form a user can use to form and send the api request by signing the arbitrary data they want to store for a transaction with the private key associated with the account

This configuration is centrally managed due to the nature of storing arbitrary data and needing to respond to DMCA requests if applicable. The data size is intentionally limited to 32 bytes using this service to prevent merkle trees. This does not mean it is impossible to store larger datasets by defining and crawling a transaction range for metadata, but it complicates the ingestion process and reduces the overall responsibility of the person running the service.
 
At it's core though just because you are centrally storing and verifying information for upload does not mean that the information is not decentralized in nature. The data is stored in a format that can be verified by anyone ingesting it to know with 100% certainty that the person who added the data to the Nano transaction is in fact the bearer of that private key and in turn the public key used for verification. 
The data is also signed and verified using the same process a Nano Node uses to verify a new Block, so no credentials are ever exposed to the central authority or any other clients and can be contained within a local client session for signing.

Because this setup uses pub/private key verification strategy and the transaction hash is it's unique identifier, you are able to store any transaction hash across any Nano compatible network not only the Live Nano network. 

## Client side

The browser based application hosted in the repository will always be compatible with the Metadata API server side, but that does not mean you need to run this specific software to form and send API requests to the central service.

From a cryptographic side this is the basic process:
1. Client sets the needed information (transaction hash, their private key, and the metadata they want to sign and store)
2. The client creates a blake2sHex hash of the concatted transaction hash and their hex encoded metdata
3. The client derives their public key from their private key
4. The client signs the hash from step 2 with their private key generating a 64 byte signature
5. The client sends the transaction hash, their pubkey, the signature, and the hex encoded metdata to the API for verification and publishing to the Cloudfront CDN

From a javascript perspective we are simply running this logic workflow this can easily be adapted to any programming language with a supported Nano library: 
```
const hash = blake2sHex(trans + datahex)
const sig = NanoCurrency.signBlock({ hash: hash, secretKey: privkey })
const params = 'trans=' + trans + '&data=' + datahex + '&pub=' + pubkey + '&sig=' + sig + '&net=' + networktouse
const apiurl = 'https://api.nanometadata.com/metadata?' + params
```

The API request to the Lambda function behind API Gateway is GET with URL parameters as seen above.

## Server side

The code for the server side component can be found in the `lambda` folder of this repository.

On the server side we are performing the same sanity checks as any other client would be to verify this was actually signed by the owner of that account using its pubkey, with one exception being reaching into a Nano network node and confirming the `block_account` for that transaction hash is actually owned by the user that is signing. This acts as their authentication without any complex user management, the blockchain speaks for itself.
 
The basic process is: 
1. The server verifies that there is no current metadata set for that transaction hash
2. The server verifies the parameters are the correct lengths and have the right data using a Nano lib
3. The server blake2sHex hashes the transaction hash + the metadata sent
4. The server uses the same `verifyblock` command used for normal Nano blocks using the hash + pubkey + signature
5. The server reaches out to a Nano RPC endpoint using `block_account` to get the address of the account associated with that block
6. The server compares the pubkey to the address and if matched pushes the data to object storage with the transaction hash as the key

# Using and verifying the stored metdata

The metadata is stored by transaction hash so consuming it is much easier than generating it. 
You simply pull in the text file by it's transaction hash at the endpoint https://www.nanometadata.com/TRANSACTIONHASH , this file will contain a string like: 

IE:

https://www.nanometadata.com/D82E15C108356FFDAB29BE04B03636EF2B9A8EE97EEA87E40567C6B491FA2226

https://mynano.ninja/block/D82E15C108356FFDAB29BE04B03636EF2B9A8EE97EEA87E40567C6B491FA2226

```
BD885E49B72C006BA44E88A76A30DBB683BAC72BBFCF42E81E69A49D5299B1DE22494C6589FDEDD3B1F3A88FA697F7410BDD813AD38A003765CF490F194D84E202D5853513495427FBFA96A7EEF3677EE86CD43BBBE002AF5C5EE52775757C0348656c6c6f204275696c64206f6666203a29
```

All of the data is Hex encoded with: 
* The first 64 characters being the public key of the user
* The next 128 characters being the signature generated from the blake2sHex of the transaction + metadata
* The remaining characters being the metadata encoded utf-8 in hex or simply being a raw hex string.

If you trust the central service simply substringing out the metdata with `payload.substring(192)` will get you the hex string and then you can conver using `new Buffer(hexmetadata, 'hex').toString('utf8')`.
 
If you want to verify the data you can use a similar workflow to the steps explained in the "Server side" section of this document.
1. First parse out all your variables (transaction being the filename, public key being the first 64 characters, next 128 signature, and remaining the hex encoded metadata)
2. blake2sHex hash the transaction + metadata
3. Use verifyblock IE for NanoCurrency-js `NanoCurrency.verifyBlock({hash: hash,signature: signature,publicKey: pubkey})`

You are now cryptographically sure that the private key for this account linked to the pubkey has actually signed the metadata for this block and it is valid.

## For Developers
```
npm install
```

### Compiles and hot-reloads for development
```
npm run serve
```

### Compiles and minifies for production
```
npm run build
```

### Lints and fixes files
```
npm run lint
```

### Customize configuration
See [Configuration Reference](https://cli.vuejs.org/config/).

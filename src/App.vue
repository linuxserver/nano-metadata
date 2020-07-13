<template>
<div id="app">
  <modal :width="300" :height="170" :adaptive="true" name="metadatainfo">
    <div class="modaltext">
      You can add 32 bytes of hex to a transaction as 64 hex characters or 32 utf-8, or you can add an IPFS CID multihash to link to larger external files from compatible wallet interfaces.
    </div>
  </modal>
  <modal :width="300" :height="190" :adaptive="true" name="transactioninfo">
    <div class="modaltext">
      All signing occurs locally, this is used as your authenticaion method with the API to confirm you own the transaction. No credentials are exposed to the server, this client sends a pubkey and signature of your signed metadata.
    </div>
  </modal>
  <modal :width="300" :height="240" :adaptive="true" name="apiinfo">
    <div class="modaltext">
      While this page can be used to add metadata to a transaction the purpose is to show wallet developers how they can achieve this in their own software stack. Take a look at the API url below and review the GitHub repository for this frontend to see how this all can fit with your project.
    </div>
  </modal>
  <notifications position="top center"/>
  <div class="heading">
    <h4>Add Metadata to Nano transaction <font-awesome-icon @click="githublink()" :icon="['fab', 'github']" /></h4>
  </div>
  <div class="container">
    <label for="metadatainputs">Metadata: (Hex UTF-8 or IPFS CID) <span @click="showmetainfo()"><font-awesome-icon icon="question-circle"/></span></label>
    <div class="form-group" id="metadatainputs">
      <div class="input-group">
        <input type="text" class="form-control" placeholder="utf-8" :maxlength="utfmax" v-model="utf8" />
        <div class="input-group-append">
          <span class="input-group-text" v-text="(utfmax - utf8.length)"></span>
        </div>
        <input type="text" class="form-control" placeholder="hex" :maxlength="hexmax" v-model="hex" />
        <div class="input-group-append">
          <span class="input-group-text" v-text="(hexmax - hex.length)"></span>
        </div>
      </div>
      <div class="input-group">
        <input class="form-control" type="text" placeholder="IPFS CID" :maxlength="ipfsmax" v-model="ipfscid">
        <div class="input-group-append">
          <span class="input-group-text" v-text="(ipfsmax - ipfscid.length)"></span>
        </div>
      </div><br>
      <label for="transinputs">Transaction and signing: <span @click="showtransinfo()"><font-awesome-icon icon="question-circle"/></span></label>
      <div class="form-group" id="transinputs">
        <div class="input-group">
          <input class="form-control" type="password" placeholder="Seed" v-model="seed">
          <div class="input-group-append">
            <input class="form-control" type="number" min="0" v-model="seedindex" id="seedindex">
          </div>
        </div>
        <input class="form-control" type="text" placeholder="Transaction Hash" v-model="trans">
        <select class="custom-select mr-sm-2" v-model="net">
          <option value="" disabled>Select your network</option>
          <option value="live">Live Nano Network</option>
          <option value="lsio">LSIO Nano Network</option>
        </select>
      </div>
      <div class="container">
        <div class="row">
          <div class="col text-center">
            <button @click="metadata()" class="btn btn-secondary">Add Metadata <font-awesome-icon icon="spinner" v-show="loading !== false"/></button>
          </div>
        </div>
      </div>
    </div>
  </div>
  <div class="container">
    <div class="col">
      <div class="form-group">
        <label for="apiurl">API URL: <font-awesome-icon @click="copyToClipboard(apiurl)" icon="clone" /> <span @click="showapiinfo()"><font-awesome-icon icon="question-circle"/></span></label>
        <input class="form-control" type="text" id="apiurl" v-model="apiurl">
      </div>
      <div class="form-group">
        <label for="metaurl">Metadata URL: <font-awesome-icon @click="copyToClipboard(metaurl)" icon="clone" /></label>
        <input class="form-control" type="text" id="metaurl" v-model="metaurl">
      </div>
    </div>
  </div>
</div>
</template>

<script>
import * as NanoCurrency from 'nanocurrency'
import { blake2sHex } from 'blakejs'
import { multihash } from 'is-ipfs'

export default {
  name: 'App',
  data() {
    return {
      utfmax: 32,
      hexmax: 64,
      ipfsmax: 46,
      utf8: '',
      hex: '',
      seed: '',
      trans: '',
      apiurl: '',
      net: '',
      metaurl: '',
      loading: false,
      seedindex: 0,
      ipfscid: ''
    }
  },
  watch: {
    hex(val) {
      if (val) {
        let re = /[^0-9a-f]+/i
        this.$set(this, 'hex', val.replace(re, ''))
        this.ipfscid = ''
      }
    },
    utf8(val) {
      if (val) {
        this.$set(this, 'hex', Buffer(val).toString('hex'))
        this.ipfscid = ''
      }
    },
    ipfscid(val) {
      if (val) {
        this.hex = ''
        this.utf8 = ''
      }
    }
  },
  methods: {
    async metadata() {
      const that = this
      that.loading = true
      if (NanoCurrency.checkHash(that.trans) && NanoCurrency.checkSeed(that.seed) && (that.hex || that.ipfscid) && that.net) {
        const response = await fetch('https://www.nanometadata.com/' + that.trans)
        if (response.ok) {
          that.$notify({
            title: 'Error',
            text: 'Metadata already set',
            type: 'error'
          })
          that.metaurl = 'https://www.nanometadata.com/' +  that.trans
          that.loading = false
        } else {
          if ( that.ipfscid && ! multihash(that.ipfscid) ) {
            that.$notify({
              title: 'Error',
              text: 'Invalid IPFS CID',
              type: 'error'
            })
            return false
          }
          const hash = blake2sHex(that.trans + ( that.ipfscid ? that.ipfscid : that.hex )).toUpperCase()
          const privkey = NanoCurrency.deriveSecretKey(that.seed,that.seedindex)
          const pubkey = NanoCurrency.derivePublicKey(privkey)
          const sig = NanoCurrency.signBlock({ hash: hash, secretKey: privkey })
          const params = 'trans=' + that.trans + '&data=' + ( that.ipfscid ? that.ipfscid : that.hex ) + '&pub=' + pubkey + '&sig=' + sig + '&net=' + that.net + ( that.ipfscid ? '&ipfs=true' : '' )
          that.apiurl = 'https://api.nanometadata.com/metadata?' + params
          const apiresponse = await fetch(that.apiurl)
          const apicontent = await response.text()
          if (apiresponse.ok) {
            that.$notify({
              title: 'Transaction signed',
              text: 'Transaction has been signed at nanometadata.com',
              type: 'success'
            })
            that.loading = false
            that.metaurl = 'https://www.nanometadata.com/' +  that.trans
          } else {
            that.$notify({
              title: 'Cannot sign transaction',
              text: apicontent,
              type: 'error'
            })
            that.loading = false
          }
        }
      } else {
        that.$notify({
          title: 'Error',
          text: 'Input Parameters invalid',
          type: 'error'
        })
        that.loading = false
      }
    },
    copyToClipboard(text) {
      let input = document.createElement('textarea');
      input.innerHTML = text;
      document.body.appendChild(input);
      input.select();
      document.execCommand('copy');
      document.body.removeChild(input);
      this.$notify({
        title: 'Success!',
        text: 'Copied to clipboard',
        type: 'success'
      })
    },
    showmetainfo () {
      this.$modal.show('metadatainfo');
    },
    showtransinfo () {
      this.$modal.show('transactioninfo');
    },
    showapiinfo () {
      this.$modal.show('apiinfo');
    },
    githublink () {
      window.open('https://github.com/linuxserver/nano-metadata', '_blank')
    }
  }
}
</script>

<style lang="scss">
@import '~bootstrap/scss/bootstrap';
@import url('https://fonts.googleapis.com/css2?family=Nunito:wght@200;400;700&display=swap');
// Body
$body-bg1: #4d5879;
$body-bg2: #26314e;
// Typography
$font-family-sans-serif: "Nunito", sans-serif;
$font-size-base: 16px;
$line-height-base: 1.6;
// Colors
$active: #0075c2;
$text: #a7b0ca;
$lighter-text: #959da0;
$highlight: #59c7f1;
$highlightsemi: #59c7f1bb;
$highlight2: #af73d2;
$highlight3: #e2ac39;
html, body {
    background: linear-gradient(to bottom, $body-bg1, $body-bg2);
    color: $text;
    font-family: 'Nunito', sans-serif;
    font-weight: 700;
    font-size: $font-size-base;
    height: 100%;
    margin: 0;
}
.highlight {
    color: $highlight;
}
input[type=text], input[type=password], .custom-select {
    height: 45px;
    background: #00000036;
    color: $text;
    border-radius: 5px;
    border: 2px solid $highlight;
    width: 100%;
    &::placeholder {
        color: #a7b0ca6e;
        font-weight: 200;
    }
    @media all and (min-width: 900px) {
        font-size: 15px;
        padding: 12px;
    }

}
input[type=text]:focus, input[type=password]:focus, input[type=number]:focus {
  background: #00000036;
  color: $text;
} 
.input-group-text, input[type=number] {
    height: 45px;
    background: #00000036;
    color: $text;
    border: 2px solid $highlight;
    &::placeholder {
        color: #a7b0ca6e;
        font-weight: 200;
    }
    @media all and (min-width: 900px) {
        font-size: 15px;
    }
}
.custom-select  {
  height: 45px; 
}
.container {
  padding: 10px 10px 10px 10px;
  max-width: 800px;
}
.input-group-append {
  font-size: 15px;
}
.heading {
  padding-top: 20px;
  text-align: center;
}
.modaltext {
  padding: 10px;
  background: linear-gradient(to bottom, $body-bg1, $body-bg2);
  color: $text;
  border-radius: 5px;
  border: 2px solid $highlight;
  width: 100%;
  height: 100%;
}
@keyframes spinner {
  to { transform: rotate(360deg); }
}
.fa-spinner {
  animation: spinner 1s linear infinite;
}
.vue-notification-group {
    padding-top: 50px;
}
#seedindex {
  max-width: 60px;
}
</style>

<template>
<div id="app">
  <notifications position="top center"/>
  <div class="heading">
    <h4>Add Metadata to transaction</h4>
  </div>
  <div class="container">
    <div class="form-group">
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
      <div class="form-group input-group">
        <input class="form-control col-10" type="password" placeholder="Seed" v-model="seed">
        <div class="input-group-append" style="width: 60px;">
          <input class="form-control" type="number" min="0" v-model="seedindex">
        </div>
      </div>
      <input class="form-control" type="text" placeholder="Transaction Hash" v-model="trans">
      <select class="custom-select mr-sm-2" v-model="net">
        <option value="" disabled>Select your network</option>
        <option value="live">Live Nano Network</option>
        <option value="lsio">LSIO Nano Network</option>
      </select>
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
        <label for="apiurl">API URL: <font-awesome-icon @click="copyToClipboard(apiurl)" icon="clone" /></label>
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

export default {
  name: 'App',
  data() {
    return {
      utfmax: 32,
      hexmax: 64,
      utf8: '',
      hex: '',
      seed: '',
      trans: '',
      apiurl: '',
      net: '',
      metaurl: '',
      loading: false,
      seedindex: 0
    }
  },
  watch: {
    hex(val) {
      let re = /[^0-9a-f]+/i;
      this.$set(this, 'hex', val.replace(re, ''));
    },
    utf8(val) {
      this.$set(this, 'hex', Buffer(val).toString('hex'));
    }
  },
  methods: {
    async metadata() {
      const that = this
      that.loading = true
      if (NanoCurrency.checkHash(that.trans) && NanoCurrency.checkSeed(that.seed) && that.hex && that.net) {
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
          const hash = blake2sHex(that.trans + that.hex).toUpperCase()
          const privkey = NanoCurrency.deriveSecretKey(that.seed,that.seedindex)
          const pubkey = NanoCurrency.derivePublicKey(privkey)
          const sig = NanoCurrency.signBlock({ hash: hash, secretKey: privkey })
          const params = 'trans=' + that.trans + '&data=' + that.hex + '&pub=' + pubkey + '&sig=' + sig + '&net=' + that.net
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
input[type=text], input[type=password], select {
    font-size: 22px;
    padding: 15px;
    background: #00000036;
    color: $text;
    border-radius: 5px;
    border: 2px solid $highlight;
    margin-bottom: 30px;
    width: 100%;
    &.copytext {
    }
    &::placeholder {
        color: #a7b0ca6e;
        font-weight: 200;
    }
    @media all and (min-width: 900px) {
        font-size: 15px;
        padding: 12px;
    }

}
.container {
  padding: 10px 10px 10px 10px;
  max-width: 800px;
}
.heading {
  text-align: center;
}
@keyframes spinner {
  to { transform: rotate(360deg); }
}
.fa-spinner {
  animation: spinner 1s linear infinite;
}
</style>

<template>
<div id="app">
  <div class="heading">
    <h1>Add Metadata to a Transaction</h1>
    <h4>32 characters UTF-8 or 64 HEX (32 Bytes)</h4>
  </div>
  <div class="container border">
    <div class="form-group">
      <div class="input-group">
        <input type="text" class="form-control" placeholder="Meta Data in utf-8" :maxlength="utfmax" v-model="utf8" />
        <div class="input-group-append">
          <span class="input-group-text" v-text="(utfmax - utf8.length)"></span>
        </div>
        <input type="text" class="form-control" placeholder="Meta Data in Hex" :maxlength="hexmax" v-model="hex" />
        <div class="input-group-append">
          <span class="input-group-text" v-text="(hexmax - hex.length)"></span>
        </div>
      </div>
      <input class="form-control" type="password" placeholder="Seed" v-model="seed">
      <input class="form-control" type="text" placeholder="Transaction Hash" v-model="trans">
      <select class="custom-select mr-sm-2" v-model="net">
        <option value="live">Live Nano Network</option>
        <option value="lsio">LSIO Nano Network</option>
      </select>
      <div class="container">
        <div class="row">
          <div class="col text-center">
            <button @click="metadata" class="btn btn-secondary">Add Metadata</button>
          </div>
        </div>
      </div>
    </div>
  </div>
  <div class="container border">
    <div class="col text-center">
      <input class="form-control" type="text" v-model="apiurl">
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
      net: ''
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
      const hash = blake2sHex(that.trans + that.hex).toUpperCase()
      const privkey = NanoCurrency.deriveSecretKey(that.seed,0)
      const pubkey = NanoCurrency.derivePublicKey(privkey)
      const sig = NanoCurrency.signBlock({ hash: hash, secretKey: privkey })
      const params = 'trans=' + that.trans + '&data=' + that.hex + '&pub=' + pubkey + '&sig=' + sig + '&net=' + that.net
      that.apiurl = 'https://api.nanometadata.com/metadata?' + params
      console.log('https://api.nanometadata.com/metadata?' + params)
    }
  },
}
</script>

<style lang="scss">
@import '~bootstrap/scss/bootstrap';
.container {
  padding: 40px 10px 15px 10px;
  max-width: 800px;
}
.heading {
  text-align: center;
}
</style>

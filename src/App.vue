<template>
  <div id="app">
    <button @click="testFunc">Check owner of token #0</button>
  </div>
</template>

<script>
import sorobanClient from "./soroban.js";
import {
  isConnected,
  getPublicKey,
  signTransaction,
} from "@stellar/freighter-api";
import config from "./config.js";

export default {
  name: "App",
  data() {
    return {
      test: "value",
    };
  },
  async mounted() {
    sorobanClient.setContractAddress(config.contractAddress);
    console.log("mounted!");
  },
  methods: {
    async testFunc() {
      try {
        console.log("freighter isConnected = ", await isConnected());
        let pubKey = await getPublicKey();
        let tx = await sorobanClient.prepareGetOwnerTx(pubKey, 0);
        let signed_tx = await signTransaction(tx, "FUTURENET", pubKey);
        console.log(signed_tx);
        let res = await sorobanClient.sendTransactionXDR(signed_tx);
        console.log(res);
      } catch (e) {
        console.log(e);
      }
    },
  },
};
</script>

<style>
#app {
  font-family: Avenir, Helvetica, Arial, sans-serif;
  -webkit-font-smoothing: antialiased;
  -moz-osx-font-smoothing: grayscale;
  text-align: center;
  color: #2c3e50;
  margin-top: 60px;
}
</style>

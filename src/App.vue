<template>
  <div id="app">
    <button @click="promptSign">Popup signature prompt</button>
    <br /><br />
    <form @submit.prevent="getOwner">
      <input v-model="input.owner" />
      <button>Check owner of token</button>
    </form>
    {{ output.owner }}
    <br /><br />
    <form @submit.prevent="checkDisabled">
      <input v-model="input.checkDisabled" />
      <button>Check if token was already split</button>
    </form>
    {{ output.checkDisabled }}
    <br /><br />
    <form @submit.prevent="split">
      <label for="splitId">Token ID: </label>
      <input v-model="input.splitId" id="splitId" /><br />
      <label for="splitAmount">Amount: </label>
      <input v-model="input.splitAmount" id="splitAmount" /><br />
      <label for="splitTo">To (Address): </label>
      <input v-model="input.splitTo" id="splitTo" /><br />
      <button>Split token</button>
    </form>
    {{ output.split }}
    <br /><br />
    <button @click="deploy">Deploy/fund asset</button>
    <br /><br />
    <button @click="trust">Trust asset</button>
    <br /><br />
    <form @submit.prevent="faucet">
      <input v-model="input.faucet" />
      <button>1000000 USDC faucet</button>
    </form>
    <br /><br />
    <form @submit.prevent="pay">
      <input v-model="input.pay" />
      <button>Pay 1000000 USDC to address</button>
    </form>
    {{ output.pay }}
    <br /><br />
    <form @submit.prevent="payContract">
      <input v-model="input.payContract" />
      <button>Pay 1000000 USDC to address via contract</button>
    </form>
    <br /><br />
    <form @submit.prevent="balance">
      <input v-model="input.balance" />
      <button>Get wrapped USDC balance of address</button>
    </form>
    {{ output.balance }}
  </div>
</template>

<script>
import * as assets from "./asset.js";
import sorobanClient from "./soroban.js";
import config from "./config.js";

export default {
  name: "App",
  data() {
    return {
      input: {
        owner: "0",
        splitId: "0",
        splitAmount: "0",
        splitTo: "",
        checkDisabled: "0",
        pay: "",
        balance: "",
        faucet: "",
        payContract: "",
      },
      output: {
        owner: "",
        split: "",
        checkDisabled: "",
        pay: "",
        balance: "",
      },
    };
  },
  async mounted() {
    sorobanClient.setContractAddress(config.contractAddress);
    console.log("mounted!");
  },
  methods: {
    async getOwner() {
      try {
        this.output.owner = "Waiting for result...";
        let id = parseInt(this.input.owner);
        let addr = await sorobanClient.getOwner(id);
        console.log(addr.toString());
        this.output.owner = addr.toString();
      } catch (e) {
        console.log(e);
        this.output.owner = e;
      }
    },
    async split() {
      try {
        this.output.split = "Waiting for result...";
        let data = [
          {
            amount: parseInt(this.input.splitAmount),
            to: this.input.splitTo,
          },
        ];
        let id = parseInt(this.input.splitId);
        let res = await sorobanClient.split(id, data);
        let res_str = JSON.stringify(res, (key, value) =>
          typeof value === "bigint" ? value.toString() : value
        );
        console.log(res_str);
        this.output.split = res_str;
      } catch (e) {
        console.log(e);
        this.output.split = e;
      }
    },
    async checkDisabled() {
      try {
        this.output.checkDisabled = "Waiting for result...";
        let id = parseInt(this.input.checkDisabled);
        let isDisabled = await sorobanClient.isDisabled(id);
        console.log(isDisabled);
        this.output.checkDisabled = isDisabled.toString();
      } catch (e) {
        console.log(e);
        this.output.checkDisabled = e;
      }
    },
    async promptSign() {
      try {
        await sorobanClient.showSignPrompt();
        console.log("login successful");
      } catch (e) {
        console.log(e);
      }
    },
    async deploy() {
      await assets.createAsset(config.assetCode);
      await assets.fundAsset(config.assetCode);
    },
    async trust() {
      await assets.trustAsset(config.assetCode);
    },
    async faucet() {
      await assets.faucetAsset(config.assetCode, this.input.faucet, 1000000);
    },
    async pay() {
      await assets.payAsset(config.assetCode, this.input.pay, 1000000);
    },
    async payContract() {
      try {
        let amount = 1000000;
        let decimals = 7;
        let bigAmount = amount * 10 ** decimals;
        let res = await sorobanClient.transfer(
          config.assetContractAddress,
          this.input.payContract,
          bigAmount
        );
        console.log(res);
      } catch (e) {
        console.log(e);
      }
    },
    async balance() {
      try {
        let decimals = 7;
        let res = await sorobanClient.balance(
          config.assetContractAddress,
          this.input.balance
        );
        console.log(res);
        let amount = parseInt(res.toString());
        this.output.balance = (amount / 10 ** decimals).toString();
      } catch (e) {
        console.log(e);
        this.output.balance = e;
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

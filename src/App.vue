<template>
  <div id="app">
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
  </div>
</template>

<script>
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
      },
      output: {
        owner: "",
        split: "",
        checkDisabled: "",
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
        let id = parseInt(this.input.split);
        let res = await sorobanClient.split(id, data);
        this.output.split = JSON.stringify(res, (key, value) => {
          typeof value === "bigint" ? value.toString() : value;
        });
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

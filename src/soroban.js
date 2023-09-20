/* eslint-disable */
import {
    isConnected,
    getPublicKey,
    signTransaction,
    setAllowed,
    signBlob,
} from "@stellar/freighter-api";
var SorobanClient = require("soroban-client");
/*
var server = new SorobanClient.Server("https://rpc-futurenet.stellar.org:443", {
    allowHttp: true,
});
const networkPassphrase = SorobanClient.Networks.FUTURENET;
*/
var server = new SorobanClient.Server("http://35.183.112.176:8000/soroban/rpc", {
    allowHttp: true,
});
const networkPassphrase = "Standalone Network ; February 2017"
const xdr = SorobanClient.xdr;
const defaultFee = "1000000";

const errCodeMap = {
    1: "Not Found",
    2: "Not Empty",
    3: "Not Authorized",
    4: "Not Permitted",
    5: "Not Owned",
    6: "Amount Too Much",
    7: "Invalid Contract",
    8: "Invalid Arguments",
};

const sorobanClient = {
    contract: null,
    setContractAddress: function (contractId) {
        this.contract = new SorobanClient.Contract(contractId);
    },
    getOwner: async function (id) {
        const operation = this.contract.call(
            "owner",
            SorobanClient.nativeToScVal(id, { type: "i128" })
        );
        let res = await callSmartContractSimulated(operation);
        return SorobanClient.Address.fromScVal(res);
    },
    isDisabled: async function (id) {
        const operation = this.contract.call(
            "is_disabled",
            SorobanClient.nativeToScVal(id, { type: "i128" })
        );
        let res = await callSmartContractSimulated(operation);
        return SorobanClient.scValToNative(res);
    },
    split: async function (id, data) {
        const split_val = xdr.ScVal.scvVec(
            data.map((v) => {
                return xdr.ScVal.scvMap([
                    new xdr.ScMapEntry({ key: xdr.ScVal.scvSymbol("amount"), val: xdr.ScVal.scvU32(v.amount) }),
                    new xdr.ScMapEntry({ key: xdr.ScVal.scvSymbol("to"), val: new SorobanClient.Address(v.to).toScVal() }),
                ])
            })
        );
        const operation = this.contract.call("split", SorobanClient.nativeToScVal(id, { type: "i128" }), split_val);
        let res = await callSmartContract(operation);
        return SorobanClient.scValToNative(res);
    },
    transfer: async function (contractAddr, to, amount) {
        let contract = new SorobanClient.Contract(contractAddr);
        let from = await getPublicKey();
        const operation = contract.call(
            "transfer",
            new SorobanClient.Address(from).toScVal(),
            new SorobanClient.Address(to).toScVal(),
            SorobanClient.nativeToScVal(amount, { type: "i128" })
        );
        let res = await callSmartContract(operation);
        return SorobanClient.scValToNative(res);
    },
    balance: async function (contractAddr, address) {
        let contract = new SorobanClient.Contract(contractAddr);
        const operation = contract.call(
            "balance",
            new SorobanClient.Address(address).toScVal());
        let res = await callSmartContractSimulated(operation);
        return SorobanClient.scValToNative(res);
    },
    showSignPrompt: async function () {
        if (!await isConnected()) {
            throw new Error("Please enable the Freighter wallet extension")
        }
        let pubKey = await getPublicKey()
        let account = await server.getAccount(pubKey)
        let tx = new SorobanClient.TransactionBuilder(account, {
            fee: defaultFee,
            networkPassphrase: networkPassphrase,
        })
            .setTimeout(30)
            .build();
        await signTransaction(tx.toEnvelope().toXDR("base64"), "FUTURENET", pubKey)
        //return await setAllowed();
    }
};

// returns an ScVal, needs to be converted via fromScVal or ScValToNative
async function callSmartContract(operation) {
    try {
        // TRANSACTION BUILD STEP
        console.log("freighter isConnected = ", await isConnected());
        let pubKey = await getPublicKey();
        const account = await server.getAccount(pubKey);
        let transaction = new SorobanClient.TransactionBuilder(account, {
            fee: defaultFee,
            networkPassphrase: networkPassphrase,
        })
            // Add a contract.increment soroban contract invocation operation
            .addOperation(operation)
            // Make this transaction valid for the next 30 seconds only
            .setTimeout(30)
            // Uncomment to add a memo (https://developers.stellar.org/docs/glossary/transactions/)
            // .addMemo(SorobanClient.Memo.text('Hello world!'))
            .build();

        // TRANSACTION PREPARE + SIGN + SEND STEP
        let prepared_tx = await server.prepareTransaction(transaction);
        console.log(prepared_tx);
        let signed_tx_xdr = await signTransaction(
            prepared_tx.toEnvelope().toXDR("base64"),
            {
                network: "FUTURENET",
                networkPassphrase: networkPassphrase,
                accountToSign: pubKey
            });
        console.log("tx signed")
        let signed_tx = SorobanClient.TransactionBuilder.fromXDR(signed_tx_xdr, networkPassphrase);
        console.log("tx read from XDR")

        let sendResponse = await server.sendTransaction(signed_tx);

        // TRANSACTION GET RESULT STEP
        const hash = sendResponse.hash;
        console.log("Transaction hash:", hash);
        await new Promise((resolve) => setTimeout(resolve, 1000));

        let getResponse = await server.getTransaction(hash);
        let status = getResponse.status;
        // console.log('Sent! Transaction ID:', console.log(response.id));
        // Poll this until the status is not "pending"
        while (status === "PENDING") {
            await new Promise((resolve) => setTimeout(resolve, 1000));
            getResponse = await server.getTransaction(hash);

            console.log("the response status is ", getResponse.status);
            if (getResponse.status !== "NOT_FOUND") {
                status = getResponse.status;
            }
        }
        return getResponse.returnValue
    } catch (e) {
        if (typeof e === "string") {
            const firstLine = e.split("\n")[0];
            const searchString = "HostError: Error(Contract, #";
            const errIndex = firstLine.indexOf(searchString);
            if (errIndex !== -1 && firstLine.indexOf(")") > errIndex) {
                const errCode = firstLine.slice(errIndex + searchString.length, firstLine.indexOf(")"));
                const msg = errCodeMap[errCode] ? errCodeMap[errCode] : errCode;
                throw new ContractError(`Contract Error: ${msg}`, errCode, { cause: e });
            } else {
                throw new Error(e);
            }
        } else {
            throw e;
        }
    }
};

// returns an ScVal, needs to be converted via fromScVal or ScValToNative
async function callSmartContractSimulated(operation) {
    try {
        // TRANSACTION BUILD STEP
        console.log("freighter isConnected = ", await isConnected());
        let pubKey = await getPublicKey();
        const account = await server.getAccount(pubKey);
        let transaction = new SorobanClient.TransactionBuilder(account, {
            fee: defaultFee,
            networkPassphrase: networkPassphrase,
        })
            // Add a contract.increment soroban contract invocation operation
            .addOperation(operation)
            // Make this transaction valid for the next 30 seconds only
            .setTimeout(30)
            // Uncomment to add a memo (https://developers.stellar.org/docs/glossary/transactions/)
            // .addMemo(SorobanClient.Memo.text('Hello world!'))
            .build();

        // TRANSACTION PREPARE + SIMULATE STEP
        let prepared_tx = await server.prepareTransaction(transaction);

        let response = await server.simulateTransaction(prepared_tx);
        console.log(response);
        if (response.error) {
            throw new Error(response.error);
        }
        return response.result?.retval;
    } catch (e) {
        if (typeof e === "string") {
            const firstLine = e.split("\n")[0];
            const searchString = "HostError: Error(Contract, #";
            const errIndex = firstLine.indexOf(searchString);
            if (errIndex !== -1 && firstLine.indexOf(")") > errIndex) {
                const errCode = firstLine.slice(errIndex + searchString.length, firstLine.indexOf(")"));
                const msg = errCodeMap[errCode] ? errCodeMap[errCode] : errCode;
                throw new ContractError(`Contract Error: ${msg}`, errCode, { cause: e });
            } else {
                throw new Error(e);
            }
        } else {
            throw e;
        }
    }
};

class ContractError extends Error {
    constructor(message, errCode, options) {
        super(message, options);
        if (Error.captureStackTrace) {
            Error.captureStackTrace(this, CustomError);
        }
        this.errCode = errCode;
    }
}

export default sorobanClient;

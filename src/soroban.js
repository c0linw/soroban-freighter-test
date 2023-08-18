/* eslint-disable */
import {
    isConnected,
    getPublicKey,
    signTransaction,
} from "@stellar/freighter-api";
var SorobanClient = require("soroban-client");
var server = new SorobanClient.Server("https://rpc-futurenet.stellar.org:443", {
    allowHttp: true,
});
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
        let res = await callSmartContract(operation);
        return SorobanClient.Address.fromScVal(res);
    },
    isDisabled: async function (id) {
        const operation = this.contract.call(
            "is_disabled",
            SorobanClient.nativeToScVal(id, { type: "i128" })
        );
        let res = await callSmartContract(operation);
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
            networkPassphrase: SorobanClient.Networks.FUTURENET,
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
        let signed_tx_xdr = await signTransaction(prepared_tx.toEnvelope().toXDR("base64"), "FUTURENET", pubKey);
        let signed_tx = SorobanClient.TransactionBuilder.fromXDR(signed_tx_xdr, SorobanClient.Networks.FUTURENET);

        let response = await server.sendTransaction(signed_tx);

        // TRANSACTION GET RESULT STEP
        const hash = response.hash;
        let status = response.status;
        // console.log('Sent! Transaction ID:', console.log(response.id));
        // Poll this until the status is not "pending"
        while (status === "PENDING") {
            await new Promise((resolve) => setTimeout(resolve, 1000));
            console.log("Transaction hash:", hash);
            response = await server.getTransaction(hash);

            console.log("the response status is ", response.status);
            if (response.status !== "NOT_FOUND") {
                status = response.status;
            }
        }
        if (response.errorResultXdr) {
            let err = xdr.Error.fromXDR(response.errorResultXdr, "base64");
            console.log(`error code = ${err.code}, msg = ${err.msg}`);
        }
        const result = xdr.TransactionMeta.fromXDR(
            response.resultMetaXdr,
            "base64"
        );
        return result.v3().sorobanMeta().returnValue();
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

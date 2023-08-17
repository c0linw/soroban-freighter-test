/* eslint-disable */
var SorobanClient = require("soroban-client");
var server = new SorobanClient.Server("https://rpc-futurenet.stellar.org:443", {
    allowHttp: true,
});
const xdr = SorobanClient.xdr;
const defaultFee = "1000000";

const sorobanClient = {
    contract: null,
    setContractAddress: function (contractId) {
        this.contract = new SorobanClient.Contract(contractId);
    },
    prepareGetOwnerTx: async function (from, id) {
        const operation = this.contract.call(
            "owner",
            SorobanClient.nativeToScVal(id, { type: "i128" })
        );
        return await prepareTransaction(from, operation);
    },
    prepareSplitTx: async function (from, id, data) {
        const split_val = xdr.ScVal.scvVec(
            data.map((v) => {
                return xdr.ScVal.scvMap([
                    new xdr.ScMapEntry({ key: xdr.ScVal.scvSymbol("amount"), val: xdr.ScVal.scvU32(v.amount) }),
                    new xdr.ScMapEntry({ key: xdr.ScVal.scvSymbol("to"), val: new SorobanClient.Address(v.to).toScVal() }),
                ])
            })
        );
        const operation = this.contract.call("split", SorobanClient.nativeToScVal(0, { type: "i128" }), split_val);
        return await prepareTransaction(from, operation);
    },

    sendTransactionXDR: async function (signed_tx_xdr) {
        let signed_tx = SorobanClient.TransactionBuilder.fromXDR(signed_tx_xdr, SorobanClient.Networks.FUTURENET);
        let response = await server.sendTransaction(signed_tx);
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
        const result = SorobanClient.xdr.TransactionMeta.fromXDR(
            response.resultMetaXdr,
            "base64"
        );
        return result;
    },
};

async function prepareTransaction(from, operation) {
    const account = await server.getAccount(from);
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

    let prepared_tx = await server.prepareTransaction(transaction);
    return prepared_tx.toEnvelope().toXDR("base64");
};

export default sorobanClient;

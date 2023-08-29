/* eslint-disable */
import {
    isConnected,
    getPublicKey,
    signTransaction,
} from "@stellar/freighter-api";
import config from "./config.js"
const StellarSdk = require("stellar-sdk");
const server = new StellarSdk.Server(" https://horizon-futurenet.stellar.org");
const networkPassphrase = "Test SDF Future Network ; October 2022";

/**
 * 
 * @param {string} assetCode 
 */
export async function createAsset(assetCode) {
    //const issuerKeypair = StellarSdk.Keypair.random();
    const issuerKeypair = StellarSdk.Keypair.fromSecret(config.assetIssuerSecret);
    const distributorKeypair = StellarSdk.Keypair.fromSecret(config.assetDistributorSecret);
    const asset = new StellarSdk.Asset(assetCode, issuerKeypair.publicKey());
    const account = await server.loadAccount(distributorKeypair.publicKey());

    const transaction1 = new StellarSdk.TransactionBuilder(account, {
        fee: StellarSdk.BASE_FEE,
        networkPassphrase: networkPassphrase,
    })
        // The `changeTrust` operation creates (or alters) a trustline
        // The `limit` parameter below is optional
        .addOperation(
            StellarSdk.Operation.changeTrust({
                asset: asset,
                limit: "10000000000",
                source: distributorKeypair.publicKey(),
            }),
        )
        // setTimeout is required for a transaction
        .setTimeout(100)
        .build();
    transaction1.sign(distributorKeypair);
    let res1 = await server.submitTransaction(transaction1);
    console.log(res1);
};

export async function trustAsset(assetCode) {
    if (!await isConnected) {
        throw new Error("Freighter wallet is not connected");
    }
    const issuerKeypair = StellarSdk.Keypair.fromSecret(config.assetIssuerSecret);
    let pubKey = await getPublicKey();
    const asset = new StellarSdk.Asset(assetCode, issuerKeypair.publicKey());
    const account = await server.loadAccount(pubKey);

    const transaction = new StellarSdk.TransactionBuilder(account, {
        fee: StellarSdk.BASE_FEE,
        networkPassphrase: networkPassphrase,
    })
        // The `changeTrust` operation creates (or alters) a trustline
        // The `limit` parameter below is optional
        .addOperation(
            StellarSdk.Operation.changeTrust({
                asset: asset,
                limit: "10000000000",
                source: pubKey,
            }),
        )
        // setTimeout is required for a transaction
        .setTimeout(100)
        .build();

    let signed_tx_xdr = await signTransaction(transaction.toEnvelope().toXDR("base64"), "FUTURENET", await getPublicKey());
    let signed_tx = StellarSdk.TransactionBuilder.fromXDR(signed_tx_xdr, networkPassphrase);

    let res = await server.submitTransaction(signed_tx);
    console.log(res);
}

export async function fundAsset(assetCode) {
    const issuerKeypair = StellarSdk.Keypair.fromSecret(config.assetIssuerSecret);
    const distributorKeypair = StellarSdk.Keypair.fromSecret(config.assetDistributorSecret);
    const asset = new StellarSdk.Asset(assetCode, issuerKeypair.publicKey());
    const account = await server.loadAccount(issuerKeypair.publicKey());

    const transaction2 = new StellarSdk.TransactionBuilder(account, {
        fee: StellarSdk.BASE_FEE,
        networkPassphrase: networkPassphrase,
    })
        .addOperation(
            StellarSdk.Operation.payment({
                destination: distributorKeypair.publicKey(),
                asset: asset,
                amount: "1000000000",
            }),
        )
        // setTimeout is required for a transaction
        .setTimeout(100)
        .build();
    transaction2.sign(issuerKeypair);
    let res2 = await server.submitTransaction(transaction2);
    console.log(res2);
}

/**
 * 
 * @param {string} assetCode 
 * @param {string} to 
 * @param {number} amount 
 */
export async function faucetAsset(assetCode, to, amount) {
    const issuerKeypair = StellarSdk.Keypair.fromSecret(config.assetIssuerSecret);
    const distributorKeypair = StellarSdk.Keypair.fromSecret(config.assetDistributorSecret);
    const distributorAccount = await server.loadAccount(distributorKeypair.publicKey());
    const asset = new StellarSdk.Asset(assetCode, issuerKeypair.publicKey());
    // First, check to make sure that the destination account exists.
    // You could skip this, but if the account does not exist, you will be charged
    // the transaction fee when the transaction fails.
    server
        .loadAccount(to)
        // If the account is not found, surface a nicer error message for logging.
        .catch(function (error) {
            if (error instanceof StellarSdk.NotFoundError) {
                throw new Error("The destination account does not exist!");
            } else return error;
        })
        // If there was no error, load up-to-date information on your account.
        .then(async function () {
            if (!await isConnected()) {
                throw new Error("Freighter wallet is not connected");
            }
            return server.loadAccount(await getPublicKey());
        })
        .then(async function (sourceAccount) {
            // Start building the transaction.
            let transaction = new StellarSdk.TransactionBuilder(distributorAccount, {
                fee: StellarSdk.BASE_FEE,
                networkPassphrase: networkPassphrase,
            })
                .addOperation(
                    StellarSdk.Operation.payment({
                        destination: to,
                        // Because Stellar allows transaction in many currencies, you must
                        // specify the asset type. The special "native" asset represents Lumens.
                        asset: asset,
                        amount: amount.toString(),
                    }),
                )
                // A memo allows you to add your own metadata to a transaction. It's
                // optional and does not affect how Stellar treats the transaction.
                .addMemo(StellarSdk.Memo.text("Test Transaction"))
                // Wait a maximum of three minutes for the transaction
                .setTimeout(180)
                .build();
            // Sign the transaction to prove you are actually the person sending it.
            transaction.sign(distributorKeypair);

            // And finally, send it off to Stellar!
            return server.submitTransaction(transaction);
        })
        .then(function (result) {
            console.log("Success! Results:", result);
        })
        .catch(function (error) {
            console.error("Something went wrong!", error);
            // If the result is unknown (no response body, timeout etc.) we simply resubmit
            // already built transaction:
            // server.submitTransaction(transaction);
        });
}

/**
 * 
 * @param {string} assetCode 
 * @param {string} to 
 * @param {number} amount 
 */
export async function payAsset(assetCode, to, amount) {
    const issuerKeypair = StellarSdk.Keypair.fromSecret(config.assetIssuerSecret);
    const asset = new StellarSdk.Asset(assetCode, issuerKeypair.publicKey());
    // First, check to make sure that the destination account exists.
    // You could skip this, but if the account does not exist, you will be charged
    // the transaction fee when the transaction fails.
    server
        .loadAccount(to)
        // If the account is not found, surface a nicer error message for logging.
        .catch(function (error) {
            if (error instanceof StellarSdk.NotFoundError) {
                throw new Error("The destination account does not exist!");
            } else return error;
        })
        // If there was no error, load up-to-date information on your account.
        .then(async function () {
            if (!await isConnected()) {
                throw new Error("Freighter wallet is not connected");
            }
            return server.loadAccount(await getPublicKey());
        })
        .then(async function (sourceAccount) {
            // Start building the transaction.
            let transaction = new StellarSdk.TransactionBuilder(sourceAccount, {
                fee: StellarSdk.BASE_FEE,
                networkPassphrase: networkPassphrase,
            })
                .addOperation(
                    StellarSdk.Operation.payment({
                        destination: to,
                        // Because Stellar allows transaction in many currencies, you must
                        // specify the asset type. The special "native" asset represents Lumens.
                        asset: asset,
                        amount: amount.toString(),
                    }),
                )
                // A memo allows you to add your own metadata to a transaction. It's
                // optional and does not affect how Stellar treats the transaction.
                .addMemo(StellarSdk.Memo.text("Test Transaction"))
                // Wait a maximum of three minutes for the transaction
                .setTimeout(180)
                .build();
            // Sign the transaction to prove you are actually the person sending it.
            let signed_tx_xdr = await signTransaction(transaction.toEnvelope().toXDR("base64"), "FUTURENET", await getPublicKey());
            let signed_tx = StellarSdk.TransactionBuilder.fromXDR(signed_tx_xdr, networkPassphrase);

            // And finally, send it off to Stellar!
            return server.submitTransaction(signed_tx);
        })
        .then(function (result) {
            console.log("Success! Results:", result);
        })
        .catch(function (error) {
            console.error("Something went wrong!", error);
            // If the result is unknown (no response body, timeout etc.) we simply resubmit
            // already built transaction:
            // server.submitTransaction(transaction);
        });
}
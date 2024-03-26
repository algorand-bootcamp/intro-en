import * as algokit from '@algorandfoundation/algokit-utils';

async function main() {
    const algorand = algokit.AlgorandClient.defaultLocalNet();

    // ===== Create two accounts =====
    const alice = algorand.account.random()
    const bob = algorand.account.random();

    console.log("Alice's Address:", alice.addr);

    // ===== Get information about alice from algod =====
    console.log("Alice's Account:", await algorand.account.getInformation(alice.addr));

    // ===== Get some ALGO into alice's account =====
    const dispenser = await algorand.account.dispenser();
    await algorand.send.payment({
        sender: dispenser.addr,
        receiver: alice.addr,
        amount: algokit.algos(10),
    });

    // See new balance
    console.log("Alice's Account", await algorand.account.getInformation(alice.addr));

    // ===== Create the ASA. ASA === Algorand Standard Asset =====
    const createResult = await algorand.send.assetCreate({
        sender: alice.addr,
        total: 100n,
    });

    // Get assetIndex from transaction
    console.log("Create result confirmation",  createResult.confirmation);
    const assetId = BigInt(createResult.confirmation.assetIndex!);

    try {
        await algorand.send.assetTransfer({
            sender: alice.addr,
            receiver: bob.addr,
            assetId,
            amount: 1n,
        })
    } catch (error: any) {
        console.warn("Transfer error", error.response.body.message);
    }

    // ===== Fund Bob =====
    await algorand.send.payment({
        sender: dispenser.addr,
        receiver: bob.addr,
        amount: algokit.algos(10),
    });

    // ===== Opt-in Bob to the ASA and try transfer again =====
    await algorand.send.assetOptIn({
        sender: bob.addr,
        assetId,
    })

    await algorand.send.assetTransfer({
        sender: alice.addr,
        receiver: bob.addr,
        assetId,
        amount: 1n,
    })

    console.log("Alice's Assets", await algorand.account.getAssetInformation(alice.addr, assetId));
    console.log("Bob's Assets", await algorand.account.getAssetInformation(bob.addr, assetId));

    // ==== Alice buys back ASA from Bob ====
    await algorand.newGroup().addPayment({
        sender: alice.addr,
        receiver: bob.addr,
        amount: algokit.algos(1),
    }).addAssetTransfer({
        sender: bob.addr,
        receiver: alice.addr,
        assetId,
        amount: 1n,
    }).execute()

    console.log("Alice's Assets", await algorand.account.getAssetInformation(alice.addr, assetId));
    console.log("Bob's Assets", await algorand.account.getAssetInformation(bob.addr, assetId));
    console.log("Bob's Min Balance", (await algorand.account.getInformation(bob.addr)).minBalance);

    // ==== Bob Close out the ASA ====
    await algorand.send.assetTransfer({
        sender: bob.addr,
        receiver: alice.addr,
        assetId,
        amount: 0n,
        closeAssetTo: alice.addr,
    });

    console.log("Bob's Min Balance", (await algorand.account.getInformation(bob.addr)).minBalance);
}

main();
import { Clarinet, Tx, Chain, Account, types } from 'https://deno.land/x/clarinet@v1.0.0/index.ts';
import { assertEquals } from 'https://deno.land/std@0.90.0/testing/asserts.ts';

Clarinet.test({
    name: "Can create a new poll",
    async fn(chain: Chain, accounts: Map<string, Account>) {
        const deployer = accounts.get('deployer')!;
        const question = "What is your favorite color?";
        const options = ["Red", "Blue", "Green"];
        const duration = 100;

        let block = chain.mineBlock([
            Tx.contractCall('poll-system', 'create-poll', [
                types.utf8(question),
                types.list(options.map(o => types.utf8(o))),
                types.uint(duration)
            ], deployer.address)
        ]);

        block.receipts[0].result.expectOk().expectUint(0);
    },
});

Clarinet.test({
    name: "Can cast a vote",
    async fn(chain: Chain, accounts: Map<string, Account>) {
        const deployer = accounts.get('deployer')!;
        const voter = accounts.get('wallet_1')!;
        const question = "What is your favorite color?";
        const options = ["Red", "Blue", "Green"];
        const duration = 100;

        let block = chain.mineBlock([
            Tx.contractCall('poll-system', 'create-poll', [
                types.utf8(question),
                types.list(options.map(o => types.utf8(o))),
                types.uint(duration)
            ], deployer.address),
            Tx.contractCall('poll-system', 'cast-vote', [
                types.uint(0),
                types.uint(1)
            ], voter.address)
        ]);

        block.receipts[0].result.expectOk();
        block.receipts[1].result.expectOk();
    },
});

Clarinet.test({
    name: "Cannot vote twice",
    async fn(chain: Chain, accounts: Map<string, Account>) {
        const deployer = accounts.get('deployer')!;
        const voter = accounts.get('wallet_1')!;
        const question = "What is your favorite color?";
        const options = ["Red", "Blue", "Green"];
        const duration = 100;

        let block = chain.mineBlock([
            Tx.contractCall('poll-system', 'create-poll', [
                types.utf8(question),
                types.list(options.map(o => types.utf8(o))),
                types.uint(duration)
            ], deployer.address),
            Tx.contractCall('poll-system', 'cast-vote', [
                types.uint(0),
                types.uint(1)
            ], voter.address),
            Tx.contractCall('poll-system', 'cast-vote', [
                types.uint(0),
                types.uint(2)
            ], voter.address)
        ]);

        block.receipts[2].result.expectErr();
    },
});

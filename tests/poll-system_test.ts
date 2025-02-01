import { Clarinet, Tx, Chain, Account, types } from 'https://deno.land/x/clarinet@v1.0.0/index.ts';
import { assertEquals } from 'https://deno.land/std@0.90.0/testing/asserts.ts';

Clarinet.test({
    name: "Can create a new poll with weighted voting",
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
    name: "Can cast a weighted vote",
    async fn(chain: Chain, accounts: Map<string, Account>) {
        const deployer = accounts.get('deployer')!;
        const voter = accounts.get('wallet_1')!;
        const question = "What is your favorite color?";
        const options = ["Red", "Blue", "Green"];
        const duration = 100;
        const stakeAmount = 200;

        let block = chain.mineBlock([
            Tx.contractCall('poll-system', 'create-poll', [
                types.utf8(question),
                types.list(options.map(o => types.utf8(o))),
                types.uint(duration)
            ], deployer.address),
            Tx.contractCall('poll-system', 'cast-weighted-vote', [
                types.uint(0),
                types.uint(1),
                types.uint(stakeAmount)
            ], voter.address)
        ]);

        block.receipts[0].result.expectOk();
        block.receipts[1].result.expectOk();
    },
});

Clarinet.test({
    name: "Cannot vote with insufficient stake",
    async fn(chain: Chain, accounts: Map<string, Account>) {
        const deployer = accounts.get('deployer')!;
        const voter = accounts.get('wallet_1')!;
        const question = "What is your favorite color?";
        const options = ["Red", "Blue", "Green"];
        const duration = 100;
        const stakeAmount = 50;

        let block = chain.mineBlock([
            Tx.contractCall('poll-system', 'create-poll', [
                types.utf8(question),
                types.list(options.map(o => types.utf8(o))),
                types.uint(duration)
            ], deployer.address),
            Tx.contractCall('poll-system', 'cast-weighted-vote', [
                types.uint(0),
                types.uint(1),
                types.uint(stakeAmount)
            ], voter.address)
        ]);

        block.receipts[1].result.expectErr(105);
    },
});

Clarinet.test({
    name: "Can claim rewards after poll ends",
    async fn(chain: Chain, accounts: Map<string, Account>) {
        const deployer = accounts.get('deployer')!;
        const voter = accounts.get('wallet_1')!;
        const question = "What is your favorite color?";
        const options = ["Red", "Blue", "Green"];
        const duration = 10;
        const stakeAmount = 200;

        let block = chain.mineBlock([
            Tx.contractCall('poll-system', 'create-poll', [
                types.utf8(question),
                types.list(options.map(o => types.utf8(o))),
                types.uint(duration)
            ], deployer.address),
            Tx.contractCall('poll-system', 'cast-weighted-vote', [
                types.uint(0),
                types.uint(1),
                types.uint(stakeAmount)
            ], voter.address)
        ]);

        chain.mineEmptyBlockUntil(duration + 2);

        block = chain.mineBlock([
            Tx.contractCall('poll-system', 'end-poll', [
                types.uint(0)
            ], deployer.address),
            Tx.contractCall('poll-system', 'claim-voting-rewards', [
                types.uint(0)
            ], voter.address)
        ]);

        block.receipts[0].result.expectOk();
        block.receipts[1].result.expectOk();
    },
});

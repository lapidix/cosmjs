import { DirectSecp256k1HdWallet, OfflineDirectSigner } from "@cosmjs/proto-signing";
import { GasPrice, IndexedTx, SigningStargateClient, StargateClient } from "@cosmjs/stargate";
import { readFile } from "fs/promises";

import { MsgSend } from "cosmjs-types/cosmos/bank/v1beta1/tx";
import { Tx } from "cosmjs-types/cosmos/tx/v1beta1/tx";
import { config } from "./config";

const getAliceSignerFromMnemonic = async (): Promise<OfflineDirectSigner> => {
  return DirectSecp256k1HdWallet.fromMnemonic((await readFile("./testnet.alice.mnemonic.key", "utf-8")).toString(), {
    prefix: "cosmos",
  });
};

const runAll = async (): Promise<void> => {
  console.log("Alice address:", config.aliceAddress, "Faucet transaction:", config.faucetTx);

  const client = await StargateClient.connect(config.rpcUrl!);
  console.log("With client, chain id:", await client.getChainId(), ", height:", await client.getHeight());
  console.log("Alice balances:", await client.getAllBalances(config.aliceAddress));

  console.log("-------------------------------------");

  const faucetTx = (await client.getTx(config.faucetTx)) as IndexedTx;
  console.log("Faucet Tx:", faucetTx);
  const decodedTx: Tx = Tx.decode(faucetTx.tx);
  console.log("DecodedTx:", decodedTx);
  console.log("Decoded messages:", decodedTx.body?.messages);

  console.log("-------------------------------------");

  const sendMessage: MsgSend = MsgSend.decode(decodedTx.body!.messages[0].value);
  console.log("Send message:", sendMessage);
  const faucet: string = sendMessage.fromAddress;
  console.log("Faucet balances:", await client.getAllBalances(faucet));

  const aliceSigner: OfflineDirectSigner = await getAliceSignerFromMnemonic();
  const alice = (await aliceSigner.getAccounts())[0].address;
  console.log("Alice's address from signer", alice);
  const signingClient = await SigningStargateClient.connectWithSigner(config.rpcUrl, aliceSigner, {
    gasPrice: GasPrice.fromString("0.005uatom"),
  });
  console.log("With signing client, chain id:", await signingClient.getChainId(), ", height:", await signingClient.getHeight());

  console.log("-------------------------------------");

  console.log("Gas fee: ", decodedTx.authInfo?.fee?.amount);
  console.log("Gas limit: ", decodedTx.authInfo?.fee?.gasLimit.toString());
  console.log("Alice balance before:", await client.getAllBalances(alice));
  console.log("Faucet balance before:", await client.getAllBalances(faucet));
  // const result = await signingClient.sendTokens(
  //   alice,
  //   faucet,
  //   [{ denom: "uatom", amount: "10000" }],
  //   { amount: [{ amount: "1000", denom: "uatom" }], gas: "200000" },
  //   "This is a memo, alice -> faucet"
  // );
  const result = await signingClient.signAndBroadcast(
    alice,
    [
      {
        typeUrl: "/cosmos.bank.v1beta1.MsgSend",
        value: {
          fromAddress: alice,
          toAddress: faucet,
          amount: [{ denom: "uatom", amount: "100000" }],
        },
      },
      {
        typeUrl: "/cosmos.staking.v1beta1.MsgDelegate",
        value: {
          delegatorAddress: alice,
          validatorAddress: config.validatorAddress,
          amount: { denom: "uatom", amount: "1000" },
        },
      },
    ],
    "auto"
  );
  console.log("Result:", result);
  // * https://explorer.polypore.xyz/provider/tx/FDA7478D2AE5F4A351386CA2C348C86C5C34E531874F75B20182199DA755D725
  console.log("Alice balance after:", await client.getAllBalances(alice));
  console.log("Faucet balance after:", await client.getAllBalances(faucet));
};
runAll();

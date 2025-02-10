import { DirectSecp256k1HdWallet, OfflineDirectSigner } from "@cosmjs/proto-signing";
import { IndexedTx, SigningStargateClient, StargateClient } from "@cosmjs/stargate";
import { readFile } from "fs/promises";

import { MsgSend } from "cosmjs-types/cosmos/bank/v1beta1/tx";
import { Tx } from "cosmjs-types/cosmos/tx/v1beta1/tx";
import "dotenv/config";

const getAliceSignerFromMnemonic = async (): Promise<OfflineDirectSigner> => {
  return DirectSecp256k1HdWallet.fromMnemonic((await readFile("./testnet.alice.mnemonic.key", "utf-8")).toString(), {
    prefix: "cosmos",
  });
};

const runAll = async (): Promise<void> => {
  const aliceAddress = process.env.ALICE_ADDRESS || "";
  const faucetTransaction = process.env.FAUCET_TX || "";

  const client = await StargateClient.connect(process.env.RPC_URL!);
  console.log("With client, chain id:", await client.getChainId(), ", height:", await client.getHeight());
  console.log("Alice balances:", await client.getAllBalances(aliceAddress));

  console.log("-------------------------------------");

  const faucetTx = (await client.getTx(faucetTransaction)) as IndexedTx;
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
  const signingClient = await SigningStargateClient.connectWithSigner(process.env.RPC_URL!, aliceSigner);
  console.log("With signing client, chain id:", await signingClient.getChainId(), ", height:", await signingClient.getHeight());

  console.log("-------------------------------------");

  console.log("Gas fee: ", decodedTx.authInfo?.fee?.amount);
  console.log("Gas limit: ", decodedTx.authInfo?.fee?.gasLimit.toString());
  console.log("Alice balance before:", await client.getAllBalances(alice));
  console.log("Faucet balance before:", await client.getAllBalances(faucet));
  const result = await signingClient.sendTokens(
    alice,
    faucet,
    [{ denom: "uatom", amount: "10000" }],
    { amount: [{ amount: "1000", denom: "uatom" }], gas: "200000" },
    "This is a memo, alice -> faucet"
  );
  console.log("Result:", result);
  // * https://explorer.polypore.xyz/provider/tx/456BF165A9B49C6D9594295BE98978E39AA8A58C9889A9D42D5F6512F96A2423
  console.log("Alice balance after:", await client.getAllBalances(alice));
  console.log("Faucet balance after:", await client.getAllBalances(faucet));
};
runAll();

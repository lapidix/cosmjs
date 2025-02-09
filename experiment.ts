import { IndexedTx, StargateClient } from "@cosmjs/stargate";
import { MsgSend } from "cosmjs-types/cosmos/bank/v1beta1/tx";
import { Tx } from "cosmjs-types/cosmos/tx/v1beta1/tx";
import "dotenv/config";

const runAll = async (): Promise<void> => {
  const aliceAddress = process.env.ALICE_ADDRESS || "";
  const faucetTransaction = process.env.FAUCET_TX || "";

  const client = await StargateClient.connect(process.env.RPC_URL!);
  console.log("With client, chain id:", await client.getChainId(), ", height:", await client.getHeight());
  console.log("Alice balances:", await client.getAllBalances(aliceAddress));

  console.log("------");

  const faucetTx = (await client.getTx(faucetTransaction)) as IndexedTx;
  console.log("Faucet Tx:", faucetTx);
  const decodedTx: Tx = Tx.decode(faucetTx.tx);
  console.log("DecodedTx:", decodedTx);
  console.log("Decoded messages:", decodedTx.body!.messages);
  const sendMessage: MsgSend = MsgSend.decode(decodedTx.body!.messages[0].value);
};
runAll();

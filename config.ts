import "dotenv/config";

export const config = {
  aliceAddress: process.env.ALICE_ADDRESS || "",
  faucetTx: process.env.FAUCET_TX || "",
  rpcUrl: process.env.RPC_URL || "",
  someOtherAddress: process.env.SOME_OTHER_ADDRESS || "",
  validatorAddress: process.env.VALIDATOR_ADDRESS || "",
};

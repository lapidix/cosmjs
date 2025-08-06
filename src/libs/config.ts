// Vite에서는 환경 변수를 import.meta.env로 접근합니다
// VITE_ 접두사가 붙은 환경 변수만 클라이언트에 노출됩니다

export const config = {
  aliceAddress: import.meta.env.VITE_ALICE_ADDRESS || "",
  faucetTx: import.meta.env.VITE_FAUCET_TX || "",
  rpcUrl: import.meta.env.VITE_RPC_URL || "",
  someOtherAddress: import.meta.env.VITE_SOME_OTHER_ADDRESS || "",
  validatorAddress: import.meta.env.VITE_VALIDATOR_ADDRESS || "",
  faucetAddress: import.meta.env.VITE_FAUCET_ADDRESS || "",
};
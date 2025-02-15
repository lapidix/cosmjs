import { DirectSecp256k1HdWallet } from "@cosmjs/proto-signing";

const generateKey = async (): Promise<void> => {
  const wallet = await DirectSecp256k1HdWallet.generate(24);
  process.stdout.write(wallet.mnemonic);
  const accounts = await wallet.getAccounts();
  console.error("Mnemonic with 1st account:", accounts[0].address);
};

generateKey();

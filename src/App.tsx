import "./App.css";
import { FaucetSender } from "./components/FaucetSender";
import { config } from "./libs/config";

function App() {
  return (
    <FaucetSender faucetAddress={config.faucetAddress} rpcUrl={config.rpcUrl} />
  );
}

export default App;

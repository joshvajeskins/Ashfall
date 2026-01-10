import { 
  KeyClient, 
  WalletClient, 
  ShinamiWalletSigner 
} from '@shinami/clients/aptos';

const SHINAMI_KEY = 'us1_movement_testnet_f0c237cb9d8f459cb97bb7470aadc797';
const SERVER_WALLET_ID = 'ashfall-server-wallet';
const SERVER_WALLET_SECRET = 'sigma-boy-hello-bye';

async function main() {
  const keyClient = new KeyClient(SHINAMI_KEY);
  const walletClient = new WalletClient(SHINAMI_KEY);

  const signer = new ShinamiWalletSigner(
    SERVER_WALLET_ID,
    walletClient,
    SERVER_WALLET_SECRET,
    keyClient
  );

  const address = await signer.getAddress(true, true);
  console.log('Shinami Server Wallet Address:', address.toString());
}

main().catch(console.error);

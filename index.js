const {
  ChainId,
  Fetcher,
  WETH,
  Route,
  Trade,
  TokenAmount,
  TradeType,
  Percent,
} = require("@uniswap/sdk");
const dotenv = require('dotenv');
const ethers = require('ethers');
const Router02 = require('./abi/Router02.json');

dotenv.config();

const chainId = ChainId.ROPSTEN;
const tokenAddress = "0xad6d458402f60fd3bd25163575031acdce07538d"; // DAI

const init = async () => {
  const dai = await Fetcher.fetchTokenData(chainId, tokenAddress);
  const weth = WETH[chainId];

  const pair = await Fetcher.fetchPairData(dai, weth);
  const route = new Route([pair], weth);

  const trade = new Trade(
    route,
    new TokenAmount(weth, "100000000000000000"),
    TradeType.EXACT_INPUT
  );

  console.log(route.midPrice.toSignificant(6));
  console.log(route.midPrice.invert().toSignificant(6));
  console.log(trade.executionPrice.toSignificant(6));
  console.log(trade.nextMidPrice.toSignificant(6));

  const slippageTolerance = new Percent('50', '10000') // 50 bips. 1bip = 0.001%;
  const amountOutMin = trade.minimumAmountOut(slippageTolerance).raw.toString();
  const path = [weth.address, dai.address];
  const to = process.env.ADDRESS_TO;
  const deadline = Math.floor(Date.now() / 1000) + 60 * 20;
  const value = trade.inputAmount.raw;

  const provider = ethers.getDefaultProvider('ropsten', {
    infura: process.env.INFURA_URL,
  });

  const signer = new ethers.Wallet(process.env.PRIVATE_KEY);

  const account = signer.connect(provider);
  console.log('balance', await account.getBalance());
  const uniswap = new ethers.Contract('0x7a250d5630B4cF539739dF2C5dAcb4c659F2488D', Router02.interface, account); // Router02

  const tx = await uniswap.swapExactETHForTokens(
    amountOutMin,
    path,
    to,
    deadline,
    {
      value: value.toString(),
      gasPrice: '2000000000000',
    }
  );
  console.log(`Transaction hash: ${tx.hash}`);

  const receipt = await tx.wait();
  console.log(`Transaction was mined in block ${receipt.blockNumber}`);
};

init()
  .catch(error => {
    console.log('[Error]', error);
  });

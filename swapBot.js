const { default: axios } = require("axios");
const cron = require("node-cron");
const usdTarget = 50
const USDperTx = 50 // usd amount
const amountAIUS = 10 //AIUS amount sell
const targetPrice = 55 // aius price
const stepPrice = 5
let curentStepPrice = 0
const { ethers } = require("ethers");
require("dotenv").config();
const provider = new ethers.providers.JsonRpcProvider('https://nova.arbitrum.io/rpc');
const swapABI = require('./swapABI.json');

const listPrivateKey = JSON.parse(process.env.LIST_PRIVATE_ACCOUNT);
console.log(listPrivateKey);
const getAiusNovaPrice = async () => {
    const rs = await axios({
        baseURL: `https://api.dexscreener.com/`,
        url: "/latest/dex/pairs/arbitrumnova/0x9b614cb49880aee59537fd21d106aed03171438f",
        method: "get",
        headers: {
            "Content-Type": "application/json",
            "cache-control": "no-cache",
            "Access-Control-Allow-Origin": "*",
        },
    });
    console.log(rs?.data?.pair.priceUsd, 'price');
    if (rs?.data?.pair.priceUsd > targetPrice) {
        const amount = ethers.utils.parseUnits(amountAIUS.toString(), 'ether')
        await sellAius(listPrivateKey[0], amount)
    }
}

const sellAius = async (privateKey, amount) => {
    const wallet = new ethers.Wallet(privateKey, provider);

    const ContractPCS = new ethers.Contract(
        '0xcdbcd51a5e8728e0af4895ce5771b7d17ff71959',
        swapABI,
        provider,
    );
    const nonce = await wallet.getTransactionCount();
    console.log(wallet.address);
    const ctwithWal = ContractPCS.connect(wallet)
    const tx2 = await ctwithWal.processRoute(
        '0x8AFE4055Ebc86Bd2AFB3940c0095C9aca511d852',
        amount,
        '0xEeeeeEeeeEeEeeEeEeEeeEEEeeeeEeeeeeeeEEeE',
        0,
        wallet.address,
        `0x028afe4055ebc86bd2afb3940c0095c9aca511d85201ffff019b614cb49880aee59537fd21d106aed03171438f00cdbcd51a5e8728e0af4895ce5771b7d17ff7195901722e8bdd2ce80a4422e880164f2079488e11536501ffff0200${wallet.address.slice(2)}`
    )

    console.log(tx2, 'tx2tx2');
    process.exit(1)
}

// sellAius('0xc70419efB9850955950785A2D64117f13a4bd2C7')
cron.schedule(
    "*/10 * * * * *",
    () => {
        getAiusNovaPrice();
    },
    {
      runOnInit: true,
    }
  );
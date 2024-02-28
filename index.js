const { default: axios } = require("axios");
const { ethers } = require("ethers");
const cron = require("node-cron");
const abiToken = require("./abi");
require("dotenv").config();
const EngineABI = require("./V2_EngineV2.json");
const logReward = require("./db");

const listAccount = JSON.parse(process.env.LIST_ACCOUNT);

const provider = new ethers.JsonRpcProvider(process.env.RPC_URL);
const tokenContract = new ethers.Contract(
  process.env.TOKEN_ADRESS,
  abiToken,
  provider
);
const arbiusContract = new ethers.Contract(
  "0x3BF6050327Fa280Ee1B5F3e8Fd5EA2EfE8A6472a",
  EngineABI,
  provider
);
const addressShortener = (addr = "", digits = 5) => {
  digits = 2 * digits >= addr.length ? addr.length : digits;
  return `${addr.substring(0, digits)}...${addr.slice(-digits)}`;
};
const roundDown = (v, n = 4) => {
  return Math.floor(v * Math.pow(10, n)) / Math.pow(10, n);
};
async function getEthPrice() {
  try {
    const response = await axios.get(
      "https://api.coingecko.com/api/v3/simple/price?ids=ethereum&vs_currencies=usd"
    );

    return response.data.ethereum.usd;
  } catch (error) {
    console.error("Error:", error.message);
  }
}
const numCheckPoint = 2;
async function checkBalance() {
  try {
    const currentDate = new Date();
    const currentTime = `${currentDate.getDate()}/${currentDate.getMonth()}|${currentDate.getHours()}:${currentDate.getMinutes()}:${currentDate.getSeconds()}`;
    const startTime = "2024-02-26 0:23:31";
    const startDate = new Date(startTime);
    const timeDifference = currentDate - startDate;
    // Convert milliseconds to seconds, then to minutes, hours, and days
    const seconds = Math.floor(timeDifference / 1000);
    const minutes = Math.floor(seconds / 60);
    const hours = Math.floor(minutes / 60);
    const days = Math.floor(hours / 24);
    const ethprice = await getEthPrice();

    const previousLogs = await logReward.find(
      {},
      {},
      { sort: { logTime: -1 }, limit: 5 }
    );
    const isCheckPoint = previousLogs[4]?.isCheckPoint;
    const data = await Promise.all(
      listAccount.map(async (obj, index) => {
        const balance = await tokenContract.balanceOf(obj);
        const balanceWei = await provider.getBalance(obj);
        const aiusBalance = roundDown(ethers.formatEther(balance));
        const ethBalance = roundDown(ethers.formatEther(balanceWei));
        let hProfit = 0;
        let hGasEth = 0;
        let hGasUsd = 0;
        if (isCheckPoint == true) {
          hGasEth = previousLogs[4]?.balance[index]?.eth - +ethBalance;
          hGasUsd = hGasEth * +ethprice;
          hProfit =
            (+aiusBalance - previousLogs[4]?.balance[index]?.aius) *
              +process.env.AIUS_PRICE -
            hGasUsd -
            0.857;
        }
        // const sProfit =
        //   (+aiusBalance - previousLog?.balance[index]?.aius) *
        //     +process.env.AIUS_PRICE -
        //   (previousLog?.balance[index]?.eth - +ethBalance) * +ethprice -
        //   0.857 / 6;
        return {
          address: obj,
          aius: aiusBalance,
          eth: ethBalance,
          usdt: roundDown(+ethers.formatEther(balanceWei) * +ethprice),
          hProfit: roundDown(hProfit),
          hGasEth: roundDown(hGasEth),
          hGasUsd: roundDown(hGasUsd),
        };
      })
    );
    const reward = await checkTaskReward();
    const logObject = new logReward({
      task_reward: +reward,
      logTime: currentDate,
      balance: data,
      isCheckPoint,
    });
    await logObject
      .save()
      .then(() => {})
      .catch((error) => {
        console.error("Error saving log:", error);
      });
    axios({
      baseURL: `https://api.telegram.org/bot${process.env.TELEGRAM_BOT_TOKEN}`,
      url: "/sendMessage",
      method: "post",
      data: {
        chat_id: process.env.TELEGRAM_CHAT_ID,
        text: `${currentTime} <b>${days}d${hours % 24}h${
          minutes % 60
        }m</b>\n${data
          .map(
            (e, index) =>
              `<a href="https://nova.arbiscan.io/address/${
                listAccount[index]
              }">${addressShortener(listAccount[index])}</a>\n<b>${
                e?.aius
              }</b> Aius|<b>${e?.eth}</b>eth|<b>${e.usdt}</b>$\n🌠Profit:<b>${
                e?.hProfit
              } 🧶Fee:<b>${e?.hGasEth}|${e?.hGasUsd}</b></b>$\n`
          )
          .join("")}\nTask Reward: <b>${reward}</b>`,
        message_thread_id: process.env.TELEGRAM_THREAD_ID,
        parse_mode: "html",
        disable_web_page_preview: true,
      },
      headers: {
        "Content-Type": "application/json",
        "cache-control": "no-cache",
        "Access-Control-Allow-Origin": "*",
      },
    });
  } catch (error) {
    console.error("Error:", error.message);
  }
}

async function checkTaskReward() {
  try {
    const reward = await arbiusContract.getReward();
    return ethers.formatEther(reward);
  } catch (error) {
    console.error("Error:", error.message);
  }
}

checkBalance();
// const tenSecondlyTask = () => {
//   checkBalance();
// };

// const cronExpression = "0 */10 * * * *";
// cron.schedule(cronExpression, tenSecondlyTask, { runOnInit: true });

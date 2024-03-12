const { default: axios } = require("axios");
const { ethers } = require("ethers");
const cron = require("node-cron");
const abiToken = require("./abi");
require("dotenv").config();
const EngineABI = require("./V2_EngineV2.json");
const logReward = require("./db");
const { roundDown } = require("./utils");

const listAccount = JSON.parse(process.env.LIST_ACCOUNT);
const listClaimAccount = JSON.parse(process.env.LIST_CLAIM_ACCOUNT);

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
    // const previousLogs = await logReward.find(
    //   {},
    //   {},
    //   { sort: { logTime: -1 }, limit: 6 }
    // );
    // const isCheckPoint = previousLogs[5]?.isCheckPoint;
    // const lastLog = previousLogs[0];
    const data = await Promise.all(
      listAccount.map(async (obj, index) => {
        const stakeAmount = await arbiusContract.validators(obj);
        const balance = await tokenContract.balanceOf(obj);
        const balanceWei = await provider.getBalance(obj);
        const aiusBalance = roundDown(ethers.formatEther(balance));
        const ethBalance = roundDown(ethers.formatEther(balanceWei));
        const balanceClaimWei = await provider.getBalance(
          listClaimAccount[index]
        );
        const ethClaimBalance = roundDown(ethers.formatEther(balanceClaimWei));

        let hProfit = 0;
        let hGasEth = 0;
        let hGasUsd = 0;
        // if (isCheckPoint == true) {
        //   hGasEth = previousLogs[4]?.balance[index]?.eth - +ethBalance;
        //   hGasUsd = hGasEth * +ethprice;
        //   hProfit =
        //     (+aiusBalance - previousLogs[4]?.balance[index]?.aius) *
        //       +process.env.AIUS_PRICE -
        //     hGasUsd -
        //     0.857;
        // }
        // const sProfit =
        //   (+aiusBalance - lastLog?.balance[index]?.aius) *
        //     +process.env.AIUS_PRICE -
        //   (lastLog?.balance[index]?.eth - +ethBalance) * +ethprice -
        //   0.857 / 6;
        // const sGasEth = lastLog?.balance[index]?.eth - +ethBalance;
        // const sGasUsd = hGasEth * +ethprice;
        return {
          address: obj,
          aius: aiusBalance,
          eth: ethBalance,
          ethClaim: ethClaimBalance,
          usdt: roundDown(+ethers.formatEther(balanceWei) * +ethprice),
          usdtClaim: roundDown(
            +ethers.formatEther(balanceClaimWei) * +ethprice
          ),
          // hProfit: roundDown(hProfit),
          // hGasEth: roundDown(hGasEth),
          // hGasUsd: roundDown(hGasUsd),
          // sProfit: roundDown(sProfit),
          // sGasEth: roundDown(sGasEth),
          // sGasUsd: roundDown(sGasUsd),
          stakeAmount: ethers.formatEther(stakeAmount[0]),
        };
      })
    );
    const reward = await checkTaskReward();
    // const logObject = new logReward({
    //   task_reward: +reward,
    //   logTime: currentDate,
    //   balance: data,
    //   isCheckPoint,
    // });
    const feePerSol = await fetchPrice();
    // await logObject
    //   .save()
    //   .then(() => {})
    //   .catch((error) => {
    //     console.error("Error saving log:", error);
    //   });
    try {
      const res = await axios({
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
                }</b> Aius|<b>${e?.eth}</b>eth|<b>${e.usdt}</b>$
<b>Claim balance:</b> ${e?.ethClaim}e | ${e?.usdtClaim}$
<b>Staked: </b> ${roundDown(e?.stakeAmount)}\n\n`
            )
            .join("")}\n`,
          message_thread_id: process.env.TELEGRAM_THREAD_ID,
          parse_mode: "html",
          disable_web_page_preview: true,
        },
        headers: {
          "Content-Type": "application/json",
          "cache-control": "no-cache",
          "Access-Control-Allow-Origin": "*",
          Connection: "keep-alive",
        },
      });
    } catch (error) {
      console.error(error);
    }
  } catch (error) {
    console.error("Error:", error.message);
  }
}
const fetchFee = async () => {
  try {
    const reward = await checkTaskReward();
    const feePerSol = await fetchPrice();
    const ethprice = await getEthPrice();
    const realReward = reward * 0.9;
    const freegas =
      feePerSol.claimSolution +
      feePerSol.signalCommitment +
      feePerSol.submitSolution;
    console.log(freegas);
    const autominegas = freegas + feePerSol.submitTask;
    await axios({
      baseURL: `https://api.telegram.org/bot${process.env.TELEGRAM_BOT_TOKEN}`,
      url: "/sendMessage",
      method: "post",
      data: {
        chat_id: process.env.TELEGRAM_CHAT_ID,
        text: `Real Task Reward: <b>${roundDown(
          realReward,
          5
        )}</b>Aius | ${roundDown(realReward * process.env.AIUS_PRICE)}$
Free mine gas: <b>${roundDown(freegas * ethprice, 5)}</b>$
Profit: <b>${roundDown(
          realReward * process.env.AIUS_PRICE - freegas * ethprice
        )}</b>
Automine gas: <b>${roundDown(autominegas * ethprice, 5)}</b>$
Profit: <b>${roundDown(
          realReward * process.env.AIUS_PRICE - autominegas * ethprice
        )}</b>
Claim gas: <b>${roundDown(feePerSol.claimSolution * ethprice)}</b>$
`,
        message_thread_id: process.env.TELEGRAM_THREAD_ID,
        parse_mode: "html",
        disable_web_page_preview: true,
      },
      headers: {
        "Content-Type": "application/json",
        "cache-control": "no-cache",
        "Access-Control-Allow-Origin": "*",
        Connection: "keep-alive",
      },
    });
  } catch (error) {
    console.log("FEE ERROR", error);
  }
};

async function checkTaskReward() {
  try {
    const reward = await arbiusContract.getReward();
    return ethers.formatEther(reward);
  } catch (error) {
    console.error("Error:", error.message);
  }
}

const fetchPrice = async () => {
  const data = {
    submitTask: null,
    claimSolution: null,
    submitSolution: null,
    signalCommitment: null,
  };
  try {
    while (
      !(
        data?.submitTask &&
        data?.claimSolution &&
        data?.submitSolution &&
        data?.signalCommitment
      )
    ) {
      const blockNumber = await provider.getBlockNumber();
      const apiScan = `https://api-nova.arbiscan.io/api?module=account&action=txlist&address=0x3BF6050327Fa280Ee1B5F3e8Fd5EA2EfE8A6472a&startblock=${
        blockNumber - 1000
      }&endblock=${blockNumber}&sort=asc&apikey=QRMANDI8UY4GSF8NT39H6JHXVXNG5EGUUQ`;
      const rs = await axios({
        baseURL: apiScan,
        method: "get",
        headers: {
          "Content-Type": "application/json",
          "cache-control": "no-cache",
          "Access-Control-Allow-Origin": "*",
        },
      });
      const methods = [
        "submitTask",
        "claimSolution",
        "submitSolution",
        "signalCommitment",
      ];
      let gasUsed = 0;
      methods.map((method) => {
        const submiskTask = rs?.data?.result.find(
          (el) => el.functionName.includes(method) && el.isError == "0"
        );
        if (submiskTask?.gasUsed)
          data[method] = +ethers.formatEther(
            submiskTask.gasUsed * rs?.data?.result?.[0]?.gasPrice
          );
      });
    }
    return data;
  } catch (error) {
    console.log(error);
  }
};

cron.schedule(
  "0 */10 * * * *",
  () => {
    checkBalance();
  },
  {
    runOnInit: true,
  }
);
cron.schedule(
  "0 */2 * * * *",
  () => {
    fetchFee();
  },
  {
    runOnInit: true,
  }
);

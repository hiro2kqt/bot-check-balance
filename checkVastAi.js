const { exec } = require("child_process");
const { default: axios } = require("axios");
// Replace 'your-terminal-command' with the actual command you want to run
const command = "vastai search offers";
const cron = require("node-cron");
require("dotenv").config();

const fetchDataAndProcess = () => {
  const currentDate = new Date();
  const currentTime = `${currentDate.getDate()}/${currentDate.getMonth()}|${currentDate.getHours()}:${currentDate.getMinutes()}:${currentDate.getSeconds()}`;
  exec(command, (error, stdout, stderr) => {
    if (error) {
      console.error(`Error: ${error.message}`);
      return;
    }

    if (stderr) {
      console.error(`Error: ${stderr}`);
      return;
    }

    const dataArray = stdout.split(/\s{2,}/g);
    const indices = [];

    for (let i = 0; i < dataArray.length; i++) {
      if (dataArray[i] === "A100_PCIE") {
        indices.push(i);
      }
    }

    const offers = indices.map((e) => {
      const id = dataArray[e - 3];
      const price = dataArray[e + 5];
      return {
        id,
        price,
      };
    });
    axios({
      baseURL: `https://api.telegram.org/bot${process.env.TELEGRAM_BOT_TOKEN}`,
      url: "/sendMessage",
      method: "post",
      data: {
        chat_id: process.env.TELEGRAM_CHAT_ID,
        text: `<b>${currentTime}</b>\n${
          offers?.length > 0
            ? offers
                .map(
                  (e, index) =>
                    `ID: <code>${e?.id}</code>\nPrice: <b>${e?.price}</b>\n\n`
                )
                .join("")
            : "No A100_PCIE Offer found"
        }\n`,
        message_thread_id: "846",
        parse_mode: "html",
        disable_web_page_preview: true,
      },
      headers: {
        "Content-Type": "application/json",
        "cache-control": "no-cache",
        "Access-Control-Allow-Origin": "*",
      },
    });
  });
};

const tenSecondlyTask = () => {
  fetchDataAndProcess();
};

const cronExpression = "0 */20 * * * *";
cron.schedule(cronExpression, tenSecondlyTask, {
  runOnInit: true,
});

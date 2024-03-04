const { exec } = require("child_process");
const { default: axios } = require("axios");
// Replace 'your-terminal-command' with the actual command you want to run
const command = "vastai search offers";
const cron = require("node-cron");
const { roundDown } = require("./utils");
require("dotenv").config();
const fetchDataAndProcess = async () => {
  const currentDate = new Date();
  const currentTime = `${currentDate.getDate()}/${currentDate.getMonth()}|${currentDate.getHours()}:${currentDate.getMinutes()}:${currentDate.getSeconds()}`;
  const query = {
    disk_space: { gte: 16 },
    duration: { gte: 29339887.430730745 },
    verified: { eq: true },
    rentable: { eq: true },
    gpu_option: { eq: "A100 PCIE" },
    sort_option: { 0: ["score", "desc"] },
    order: [["score", "desc"]],
    gpu_name: { eq: "A100 PCIE" },
    num_gpus: { gte: 0, lte: 16 },
    allocated_storage: 16,
    cuda_max_good: { gte: "12.1" },
    compute_cap: { gte: 500 },
    has_avx: { eq: true },
    limit: 64,
    extra_ids: [],
    type: "ask",
    direct_port_count: { gte: 2 },
  };

  const resp = await axios.get("https://cloud.vast.ai/api/v0/bundles/", {
    params: {
      q: JSON.stringify(query),
    },
  });
  const offers = resp.data?.offers;
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
                  `ID:<code>${e?.id}</code>\nPrice: <b>${e?.dph_base}|${
                    e?.dph_total
                  }</b>\nDuration:${roundDown(
                    +e?.duration / (60 * 60 * 24 * 30)
                  )}M\nReliability:${roundDown(+e?.reliability_mult * 100)}%\n\n`
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
};

const tenSecondlyTask = () => {
  fetchDataAndProcess();
};

const cronExpression = "*/5 * * * *";
cron.schedule(cronExpression, tenSecondlyTask, {
  runOnInit: true,
});

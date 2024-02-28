const mongoose = require("mongoose");

mongoose.connect(process.env.DB_URL, {
  useNewUrlParser: true,
  useUnifiedTopology: true,
  auth:
    process.env.DB_USER && process.env.DB_PASSWORD
      ? {
          user: process.env.DB_USER,
          password: process.env.DB_PASSWORD,
        }
      : null,
});

const connection = mongoose.connection;

connection.on(
  "error",
  console.error.bind(console, "MongoDB connection error:")
);
connection.once("open", () => {
  console.log("Connected to Database");
});

const logRewardSchema = new mongoose.Schema({
  task_reward: {
    type: Number,
    required: true,
  },
  logTime: {
    type: Number,
  },
  balance: {
    type: Object,
  },
});

const logReward = mongoose.model("logReward", logRewardSchema);

module.exports = logReward;

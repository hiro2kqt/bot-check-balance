const roundDown = (v, n = 4) => {
  return Math.floor(v * Math.pow(10, n)) / Math.pow(10, n);
};
module.exports = { roundDown };

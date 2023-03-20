require("@nomicfoundation/hardhat-toolbox");
require("dotenv").config({ path: ".env" });

const API_ALCHEMY = process.env.API_ALCHEMY;
const PRIV_KEY = process.env.PRIV_KEY;

// /** @type import('hardhat/config').HardhatUserConfig */
module.exports = {
  solidity: "0.8.17",
  networks: {
    goerli: {
      url: "https://eth-goerli.g.alchemy.com/v2/" + API_ALCHEMY,
      accounts: [PRIV_KEY]
    }
  }
};
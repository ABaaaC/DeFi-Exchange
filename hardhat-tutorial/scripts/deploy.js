const { ethers } = require("hardhat");
require("dotenv").config({ path: ".env" });
const { CRYPTO_DEV_TOKEN_CONTRACT_ADDRESS } = require("../constants");

async function main() {
  const cryptoDevTokenAddress = CRYPTO_DEV_TOKEN_CONTRACT_ADDRESS;

  const Exchange = await ethers.getContractFactory("Exchange");
  const exchange = await Exchange.deploy(cryptoDevTokenAddress);
  await exchange.deployed();

  console.log("Exchange deployed to: ", exchange.address);

}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });

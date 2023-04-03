const {
  time,
  loadFixture,
} = require("@nomicfoundation/hardhat-network-helpers");
const { anyValue } = require("@nomicfoundation/hardhat-chai-matchers/withArgs");
const { expect } = require("chai");
const { ethers } = require("hardhat");
const { utils, BigNumber } = require("ethers");

require("dotenv").config({ path: ".env" });
const {CRYPTO_DEV_TOKEN_CONTRACT_ADDRESS} = require("../constants");

xdescribe("TestCDToken", function () {
  it("Transfer", async function () {

    const [owner, addr1, addr2] = await ethers.getSigners();

    const TestCDToken = await hre.ethers.getContractFactory("TestCDToken");
    const cdTokenContract = await TestCDToken.deploy();
    await cdTokenContract.deployed();

    const ownerBalance = await owner.getBalance();
    const addr1Balance = await addr1.getBalance();
    const ownerBalanceCD = await cdTokenContract.balanceOf(owner.address);

    await cdTokenContract.transfer(addr1.address, utils.parseEther("100"));
    const addr1BalanceCD = await cdTokenContract.balanceOf(addr1.address);
    expect(addr1BalanceCD).to.equal(utils.parseEther("100"));

    await cdTokenContract.connect(addr1).transfer(addr2.address, utils.parseEther("20"));
    const addr2BalanceCD = await cdTokenContract.balanceOf(addr2.address);
    expect(addr2BalanceCD).to.equal(utils.parseEther("20"));
  });
});

describe("DEX", function () {

  let TestCDToken, cdTokenContract, Exchange, dexContract, owner, addr1, addr2;
  let dexAddress;

  // async function deployDEXFixture() {
  //   // Get the ContractFactory and Signers here.
  //   const [owner, addr1, addr2] = await ethers.getSigners();

  //   const TestCDToken = await hre.ethers.getContractFactory("TestCDToken");
  //   const cdTokenContract = await TestCDToken.deploy();
  //   await cdTokenContract.deployed();

  //   const Exchange = await ethers.getContractFactory("Exchange");
  //   const dexContract = await Exchange.deploy(cdTokenContract.address);
  //   await dexContract.deployed();

  //   // Fixtures can return anything you consider useful for your tests
  //   // return { Exchange, deployedExchangeContract };
  //   return { TestCDToken, cdTokenContract, Exchange, dexContract, owner, addr1, addr2 };
  // }

  beforeEach(async function() {
    // {TestCDToken, 
    //   cdTokenContract,
    //   Exchange, 
    //   dexContract, 
    //   owner, addr1, addr2} = await loadFixture(deployDEXFixture);
    [owner, addr1, addr2] = await ethers.getSigners();

    TestCDToken = await hre.ethers.getContractFactory("TestCDToken");
    cdTokenContract = await TestCDToken.deploy();
    await cdTokenContract.deployed();

    Exchange = await ethers.getContractFactory("Exchange");
    dexContract = await Exchange.deploy(cdTokenContract.address);
    await dexContract.deployed();

    dexAddress = dexContract.address;

    await cdTokenContract.transfer(addr1.address, utils.parseEther("1000"));

    await cdTokenContract.connect(addr1).transfer(addr2.address, utils.parseEther("200"));

  });


  xdescribe("Liquidity", function () {
    let cdTokenInit, ethInit, tx;

    beforeEach(async function() {
      // console.log("inner beforeEach");
      cdTokenInit = utils.parseEther("30");
      ethInit = utils.parseEther("5");

      tx = await cdTokenContract.connect(addr1).approve(
        dexAddress,
        cdTokenInit
      )
      await tx.wait();

      tx = await dexContract.connect(addr1).addLiquidity(cdTokenInit, {value: ethInit});
      await tx.wait();
  
    });
    it("Add Liquidity First Time", async function () {

      const dexCDBalance = await dexContract.getReserve();
      expect(dexCDBalance.toString()).to.be.equals(cdTokenInit);

      const dexEthBalance = await ethers.provider.getBalance(dexAddress);
      expect(dexEthBalance.toString()).to.be.equals(ethInit);

      const lpBalance = await dexContract.balanceOf(addr1.address);
      expect(lpBalance.toString()).to.be.equals(ethInit);

    });

    it("Add Liquidity Second Time", async function () {
      const cdTokenAdd = utils.parseEther("50");
      const ethAdd = utils.parseEther("2");


      tx = await cdTokenContract.connect(addr2).approve(
        dexAddress,
        cdTokenAdd
      )
      await tx.wait();

      tx = await dexContract.connect(addr2).addLiquidity(cdTokenAdd, {value: ethAdd});
      await tx.wait();

      // const dexCDBalance = await dexContract.getReserve();
      // expect(dexCDBalance.toString()).to.be.equals(utils.parseEther("80"));

      const dexEthBalance = await ethers.provider.getBalance(dexAddress);
      expect(dexEthBalance.toString()).to.be.equals(utils.parseEther("7"));

      const lpBalance1 = await dexContract.balanceOf(addr1.address);
      expect(lpBalance1.toString()).to.be.equals(ethInit);
      const lpBalance2 = await dexContract.balanceOf(addr2.address);
      expect(lpBalance2.toString()).to.be.equals(ethAdd);
      
    });

    it("Remove Some Liquidity", async function () {

      const lpBalance = await dexContract.balanceOf(addr1.address);
      // const ethBalance = await addr1.getBalance();
      const reserveCD = await dexContract.getReserve();
      const cdBalance = await cdTokenContract.balanceOf(addr1.address);

      
      tx = await dexContract.connect(addr1).removeLiquidity(lpBalance.div(3));
      await tx.wait();

      const lpBalance2 = await dexContract.balanceOf(addr1.address);
      expect(lpBalance2).to.be.equal(lpBalance.sub(lpBalance.div(3)));

      // const ethBalance2 = await addr1.getBalance();

      const reserveCD2 = await dexContract.getReserve();
      const cdBalance2 = await cdTokenContract.balanceOf(addr1.address);

      expect(reserveCD2.add(cdBalance2)).to.be.equal(reserveCD.add(cdBalance));

    });
  });

  describe("Swap", function () {

    let dexCDBalance, dexEthBalance, addr1CDBalance, addr1EthBalance;

    beforeEach(async function() {

      const cdTokenInit = utils.parseEther("30");
      const ethInit = utils.parseEther("5");

      let tx = await cdTokenContract.connect(addr1).approve(
        dexAddress,
        cdTokenInit
      )
      await tx.wait();

      tx = await dexContract.connect(addr1).addLiquidity(cdTokenInit, {value: ethInit});
      await tx.wait();

      dexCDBalance = await dexContract.getReserve();
      dexEthBalance = await ethers.provider.getBalance(dexAddress);
      addr1CDBalance = await cdTokenContract.balanceOf(addr1.address);
      addr1EthBalance = await addr1.getBalance();
    });

    it("Eth 2 CD", async function () {
      const swapAmountWei = utils.parseEther("0.5");
      const amountOfTokens = await dexContract.getAmountOfTokens(swapAmountWei, dexEthBalance, dexCDBalance);
      
      tx = await dexContract.connect(addr1).ethToCryptoDevToken(amountOfTokens, {value: swapAmountWei});
      await tx.wait();

      const dexCDBalance2 = await dexContract.getReserve();
      const dexEthBalance2 = await ethers.provider.getBalance(dexAddress);
      const addr1CDBalance2 = await cdTokenContract.balanceOf(addr1.address);
      const addr1EthBalance2 = await addr1.getBalance();

      expect(addr1CDBalance2).to.be.greaterThanOrEqual(addr1CDBalance.add(amountOfTokens));
      expect(addr1EthBalance2).to.be.greaterThanOrEqual(addr1CDBalance.sub(swapAmountWei));

      expect(dexCDBalance2).to.be.lessThanOrEqual(dexCDBalance.sub(amountOfTokens));
      expect(dexEthBalance2).to.be.greaterThanOrEqual(dexEthBalance.add(swapAmountWei));

    });

    it("CD 2 Eth", async function () {
      const swapAmountWei = utils.parseEther("0.5");
      const amountOfTokens = await dexContract.getAmountOfTokens(swapAmountWei, dexCDBalance, dexEthBalance);
      
      tx = await dexContract.connect(addr1).ethToCryptoDevToken(amountOfTokens, {value: swapAmountWei});
      await tx.wait();

      const dexCDBalance2 = await dexContract.getReserve();
      const dexEthBalance2 = await ethers.provider.getBalance(dexAddress);
      const addr1CDBalance2 = await cdTokenContract.balanceOf(addr1.address);
      const addr1EthBalance2 = await addr1.getBalance();

      expect(addr1CDBalance2).to.be.greaterThanOrEqual(addr1CDBalance.add(amountOfTokens));
      expect(addr1EthBalance2).to.be.greaterThanOrEqual(addr1CDBalance.sub(swapAmountWei));

      expect(dexCDBalance2).to.be.lessThanOrEqual(dexCDBalance.sub(amountOfTokens));
      expect(dexEthBalance2).to.be.greaterThanOrEqual(dexEthBalance.add(swapAmountWei));
    });
  });
});

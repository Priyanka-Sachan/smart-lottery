const { assert, expect } = require("chai");
const { network, getNamedAccounts, deployments, ethers } = require("hardhat");
const { developmentChains } = require("../../helper-hardhat-config");

developmentChains.includes(network.name)
  ? describe.skip
  : describe("Lottery Staging Tests", () => {
    let lottery, lotteryEntranceFee, deployer, accounts;

    beforeEach(async function () {
      deployer = (await getNamedAccounts()).deployer;
      accounts = await ethers.getSigners();
      // await deployments.fixture(["all"]);
      lottery = await ethers.getContract("Lottery", deployer);
      lotteryEntranceFee = await lottery.getEntranceFee();
    });

    describe("FulfillRandomWords", function () {

      it("Picks a winner, resets, and sends money", async () => {

        await new Promise(async (resolve, reject) => {

          lottery.once("WinnerPicked", async () => {
            console.log("WinnerPicked event fired!");
            try {
              const lotteryState = await lottery.getLotteryState();
              const numPlayers = await lottery.getNumberOfPlayers();
              const endingTimeStamp = await lottery.getLatestTimeStamp();
              const recentWinner = await lottery.getRecentWinner();
              const winnerEndingBalance = await accounts[0].getBalance();
              assert.equal(lotteryState, 0);
              assert.equal(numPlayers.toString(), "0");
              assert(endingTimeStamp > startingTimeStamp);
              assert.equal(recentWinner.toString(), accounts[0].address);
              assert.equal(
                winnerEndingBalance.toString(),
                winnerStartingBalance
                  .add(lotteryEntranceFee)
                  .toString()
              );
              resolve();
            } catch (e) {
              reject(e);
            }
          });

          const startingTimeStamp = await lottery.getLatestTimeStamp();
          const tx = await lottery.enterLottery({ value: lotteryEntranceFee });
          await tx.wait(1);
          const winnerStartingBalance = await accounts[0].getBalance();
        });

      });

    });

  });
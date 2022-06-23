const { assert, expect } = require("chai");
const { network, getNamedAccounts, deployments, ethers } = require("hardhat");
const { developmentChains, networkConfig } = require("../../helper-hardhat-config");

!developmentChains.includes(network.name)
  ? describe.skip
  : describe("Lottery Unit Tests", () => {
    let lottery, vrfCoordinatorV2Mock, lotteryEntranceFee, deployer, accounts, interval;
    const chainId = network.config.chainId;

    beforeEach(async function () {
      accounts = await ethers.getSigners();
      deployer = (await getNamedAccounts()).deployer;
      await deployments.fixture(["all"]);
      lottery = await ethers.getContract("Lottery", deployer);
      vrfCoordinatorV2Mock = await ethers.getContract("VRFCoordinatorV2Mock", deployer);
      lotteryEntranceFee = await lottery.getEntranceFee();
      interval = await lottery.getInterval();
    });

    describe("Constructor", () => {
      it("Initializes all parameters correctly", async function () {
        const lotteryState = await lottery.getLotteryState();
        const entranceFee = await lottery.getEntranceFee();
        // ...Test all variables
        assert.equal(lotteryState.toString(), "0");
        assert.equal(entranceFee.toString(), networkConfig[chainId]["entranceFee"]);
      });
    });

    describe("EnterLottery", () => {
      it("Reverts if lottery not open", async function () {
        await lottery.enterLottery({ value: lotteryEntranceFee });
        // Hardhat JSON-RPC Methods for time travel & mine
        await network.provider.send("evm_increaseTime", [interval.toNumber() + 1]);
        await network.provider.send("evm_mine", []);
        // Pretend to be an chainlink keeper
        await lottery.performUpkeep([]);
        await expect(
          lottery.enterLottery({ value: lotteryEntranceFee })
        ).to.be.revertedWith("Lottery__NotOpen");
      });

      it("Reverts if not enough ETH", async function () {
        await expect(lottery.enterLottery()).to.be.revertedWith("Lottery__NotEnoughETH");
      });

      it("Records players when they enter", async function () {
        await lottery.enterLottery({ value: lotteryEntranceFee });
        const player = await lottery.getPlayer(0);
        assert.equal(player, deployer);
      });

      it("Emits an event on enter", async function () {
        await expect(lottery.enterLottery({ value: lotteryEntranceFee })).to.emit(
          lottery,
          "LotteryEnter"
        );
      });
    });

    describe("CheckUpkeep", () => {
      it("Returns false if no player / no ETH", async function () {
        await network.provider.send("evm_increaseTime", [interval.toNumber() + 1]);
        await network.provider.send("evm_mine", []);
        // Callstatic : Rather than executing the state-change of a transaction, it is possible to ask a node to pretend that a call is not state-changing and return the result.
        // This does not actually change any state, but is free. This in some cases can be used to determine if a transaction will fail or succeed.
        const { upkeepNeeded } = await lottery.callStatic.checkUpkeep([]);
        assert(!upkeepNeeded);
      });

      it("Returns false if lottery not open", async function () {
        await lottery.enterLottery({ value: lotteryEntranceFee });
        await network.provider.send("evm_increaseTime", [interval.toNumber() + 1]);
        await network.provider.send("evm_mine", []);
        await lottery.performUpkeep([]);
        const lotteryState = await lottery.getLotteryState();
        const lotteryOpen = lotteryState.toString() == "0";
        const { upkeepNeeded } = await lottery.callStatic.checkUpkeep([]);
        assert.equal(upkeepNeeded, lotteryOpen);
      });

      it("Returns false if enough time hasn't passed", async () => {
        await lottery.enterLottery({ value: lotteryEntranceFee });
        await network.provider.send("evm_increaseTime", [interval.toNumber() - 1]);
        await network.provider.request({ method: "evm_mine", params: [] });
        const { upkeepNeeded } = await lottery.callStatic.checkUpkeep("0x");
        assert(!upkeepNeeded);
      });

      it("Returns true if enough time has passed, has players, eth, and is open", async () => {
        await lottery.enterLottery({ value: lotteryEntranceFee });
        await network.provider.send("evm_increaseTime", [interval.toNumber() + 1]);
        await network.provider.request({ method: "evm_mine", params: [] });
        const { upkeepNeeded } = await lottery.callStatic.checkUpkeep("0x");
        assert(upkeepNeeded);
      });
    });

    describe("PerformUpkeep", () => {
      it("Can only run if checkUpkeep is true", async function () {
        await lottery.enterLottery({ value: lotteryEntranceFee });
        await network.provider.send("evm_increaseTime", [interval.toNumber() + 1]);
        await network.provider.send("evm_mine", []);
        const tx = await lottery.performUpkeep([]);
        assert(tx);
      });

      it("Reverts if checkUpkeep is false", async function () {
        await expect(lottery.performUpkeep([])).to.be.revertedWith(
          "Lottery__UpkeepNotNeeded"
        );
      });

      it("Updates the lottery state and emits a requestId", async () => {
        await lottery.enterLottery({ value: lotteryEntranceFee });
        await network.provider.send("evm_increaseTime", [interval.toNumber() + 1]);
        await network.provider.request({ method: "evm_mine", params: [] });
        const txResponse = await lottery.performUpkeep("0x");
        const txReceipt = await txResponse.wait(1);
        const lotteryState = await lottery.getLotteryState();
        const requestId = txReceipt.events[1].args.requestId;
        assert(requestId.toNumber() > 0);
        assert(lotteryState == 1);
      });
    });

    describe("FulfillRandomWords", function () {

      beforeEach(async () => {
        await lottery.enterLottery({ value: lotteryEntranceFee });
        await network.provider.send("evm_increaseTime", [interval.toNumber() + 1]);
        await network.provider.request({ method: "evm_mine", params: [] });
      });

      it("Can only be called after performUpkeep", async () => {
        await expect(
          vrfCoordinatorV2Mock.fulfillRandomWords(0, lottery.address)
        ).to.be.revertedWith("nonexistent request");
        await expect(
          vrfCoordinatorV2Mock.fulfillRandomWords(1, lottery.address)
        ).to.be.revertedWith("nonexistent request");
      });

      // This test is too big...
      it("Picks a winner, resets, and sends money", async () => {

        // This will be more important for our staging tests...
        await new Promise(async (resolve, reject) => {

          lottery.once("WinnerPicked", async () => {
            console.log("WinnerPicked event fired!");
            // assert throws an error if it fails, so we need to wrap
            // it in a try/catch so that the promise returns event
            // if it fails.
            try {
              // Now lets get the ending values...
              const lotteryState = await lottery.getLotteryState();
              const numPlayers = await lottery.getNumberOfPlayers();
              const endingTimeStamp = await lottery.getLatestTimeStamp();
              const recentWinner = await lottery.getRecentWinner();
              // Here, we know winner is at index 1 always due to mock 
              const winnerEndingBalance = await accounts[1].getBalance();
              assert.equal(lotteryState, 0);
              assert.equal(numPlayers.toString(), "0");
              assert(endingTimeStamp > startingTimeStamp);
              assert.equal(recentWinner.toString(), accounts[1].address);
              assert.equal(
                winnerEndingBalance.toString(),
                winnerStartingBalance
                  .add(
                    lotteryEntranceFee
                      .mul(additionalEntrances)
                      .add(lotteryEntranceFee)
                  )
                  .toString()
              );
              resolve();
            } catch (e) {
              reject(e);
            }
          });

          const additionalEntrances = 3;
          const startingIndex = 1;
          for (let i = startingIndex; i < startingIndex + additionalEntrances; i++) {
            newLottery = lottery.connect(accounts[i]);
            await newLottery.enterLottery({ value: lotteryEntranceFee });
          }
          const startingTimeStamp = await lottery.getLatestTimeStamp();
          const tx = await lottery.performUpkeep([]);
          const txReceipt = await tx.wait(1);
          const winnerStartingBalance = await accounts[1].getBalance();
          await vrfCoordinatorV2Mock.fulfillRandomWords(
            txReceipt.events[1].args.requestId,
            lottery.address
          );
        });
      });
    });
  });

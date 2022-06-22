const { ethers } = require("hardhat");

const networkConfig = {
  4: {
    name: "Rinkeby",
    vrfCoordinatorV2: "0x6168499c0cFfCaCD319c818142124B7A15E857ab",
    entranceFee: ethers.utils.parseEther("0.01"),
    gasLane: "0xd89b2bf150e3b9e13446986e571fb9cab24b13cea0a43ea20a6049a85cc807cc",
    subscriptionId: "0",
    callBackGasLimit: "500000",
    interval: "30",
  },
  1: {
    name: "mainnet",
    vrfCoordinatorV2: "0x271682DEB8C4E0901D1a1550aD2e64D568E69909",
    entranceFee: ethers.utils.parseEther("0.01"),
    gasLane: "0x8af398995b04c28e9951adb9721ef74c74f93e6a478f39e7e0777be13527e7ef",
    subscriptionId: "0",
    callBackGasLimit: "500000",
    interval: "30",
  },
  31337: {
    name: "hardhat",
    entranceFee: ethers.utils.parseEther("0.01"),
    gasLane: "0x8af398995b04c28e9951adb9721ef74c74f93e6a478f39e7e0777be13527e7ef",
    callBackGasLimit: "500000",
    interval: "30",
  }
}

const developmentChains = ["hardhat", "localhost"];

module.exports = {
  networkConfig,
  developmentChains
}
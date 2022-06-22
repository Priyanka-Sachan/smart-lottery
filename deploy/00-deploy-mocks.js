const { network, ethers } = require("hardhat");
const { developmentChains } = require("../helper-hardhat-config");

module.exports = async ({ getNamedAccounts, deployments }) => {

  const { deploy, log } = deployments;
  const { deployer } = await getNamedAccounts();
  const networkName = network.name;

  // Base fee, Gas limit link
  const BASE_FEE = ethers.utils.parseEther("0.25"); //0.25 is the premium.
  const GAS_PRICE_LINK = 1e9 // link per gas, is this the gas lane? // 0.000000001 LINK per gas
  const args = [BASE_FEE, GAS_PRICE_LINK];

  if (developmentChains.includes(networkName)) {
    log("Development network detected. Deploying mock price feed...");
    await deploy("VRFCoordinatorV2Mock", {
      contract: "VRFCoordinatorV2Mock",
      from: deployer,
      log: true,
      args: args,
    });
    log("Mock deployed.");
    log("---------------------------------");
  }
}

// Used to filter deploy scripts by tag eg. npx hardhat deploy --tags <all>
module.exports.tags = ["all", "mocks"];
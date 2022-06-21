Add package.json  
`npm init` 

Add git & git_script.sh  
`git init` 

Install hardhat  
`npm install --save-dev hardhat` 

Install other dev dependencies  
`npm install --save-dev @nomiclabs/hardhat-ethers@npm:hardhat-deploy-ethers ethers @nomiclabs/hardhat-etherscan @nomiclabs/hardhat-waffle chai ethereum-waffle hardhat hardhat-contract-sizer hardhat-deploy hardhat-gas-reporter prettier prettier-plugin-solidity solhint solidity-coverage dotenv`

npx Commands  
test: `hardhat test`  
test:staging: `hardhat test --network rinkeby`  
lint: `solhint 'contracts/*.sol'`  
lint:fix: `solhint 'contracts/**/*.sol' --fix`  
format: `prettier --write .`  
coverage: `hardhat coverage`  


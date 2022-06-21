// Lottery
// Enter lottery with some amount
// Pick a random winner (verifiably random)
// Winner to be selected every X time => automated => Keeper

// SPDX-License-Identifier:MIT

pragma solidity ^0.8.0;

import "@chainlink/contracts/src/v0.8/interfaces/VRFCoordinatorV2Interface.sol";
import "@chainlink/contracts/src/v0.8/VRFConsumerBaseV2.sol";

error Lottery__NotEnoughETH();
error Lottery_TransferFailed();

contract Lottery is VRFConsumerBaseV2 {
    // State variables
    uint256 private immutable i_entranceFee;
    address payable[] private s_players;
    VRFCoordinatorV2Interface private immutable i_vrfCoordinator;
    bytes32 private immutable i_gasLane;
    uint64 private immutable i_subscriptionId;
    uint16 private constant REQUST_CONFIRMATIONS = 3;
    uint32 private immutable i_callbackGasLimit;
    uint32 private constant NUM_WORDS = 1;

    // Lottery variables
    address private s_recentWinner;

    // Event
    // indexed param easier to search, takes more gas
    // max 3 indexed param/topic
    event LotteryEnter(address indexed player);
    event RequestedLotteryWinner(uint256 indexed requstId);
    event WinnerPicked(address indexed winner);

    // Watchout!
    constructor(
        address vrfCoordinatorV2,
        uint256 entranceFee,
        bytes32 gasLane,
        uint64 subscriptionId,
        uint32 callbackGasLimit
    ) VRFConsumerBaseV2(vrfCoordinatorV2) {
        i_entranceFee = entranceFee;
        i_vrfCoordinator = VRFCoordinatorV2Interface(vrfCoordinatorV2);
        i_gasLane = gasLane;
        i_subscriptionId = subscriptionId;
        i_callbackGasLimit = callbackGasLimit;
    }

    function enterLottery() public payable {
        if (msg.value < i_entranceFee) revert Lottery__NotEnoughETH();
        s_players.push(payable(msg.sender));
        emit LotteryEnter(msg.sender);
    }

    //  External - Less gas- our smart contract can't call this function
    function requestRandomWinner() external {
        // Request random number
        // 2 transaction
        uint256 requestId = i_vrfCoordinator.requestRandomWords(
            i_gasLane, //gasLane - maximum gas price to pay
            i_subscriptionId, //subscription id
            REQUST_CONFIRMATIONS,
            i_callbackGasLimit, // Gas limit to use for callback request function `fulfillRandomWords` here
            NUM_WORDS //Number of random words
        );
        emit RequestedLotteryWinner(requestId);
    }

    function fulfillRandomWords(
        uint256, /*requestId*/
        uint256[] memory randomWords
    ) internal override {
        uint256 indexOfWinner = randomWords[0] % s_players.length;
        address payable recentWinner = s_players[indexOfWinner];
        s_recentWinner = recentWinner;
        // Transfer balance to winner
        (bool success, ) = recentWinner.call{value: address(this).balance}("");
        if (!success) revert Lottery_TransferFailed();
        emit WinnerPicked(recentWinner);
    }

    function getEntranceFee() public view returns (uint256) {
        return i_entranceFee;
    }

    function getPlayer(uint256 index) public view returns (address) {
        return s_players[index];
    }

    function getRecentWinner() public view returns (address) {
        return s_recentWinner;
    }
}

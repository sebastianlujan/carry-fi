// SPDX-License-Identifier: MIT
pragma solidity ^0.8.26;

/// @notice LayerZero V2 OFT — el "bridge de Twin" es un OFT Adapter estándar (verificado por selectores).
struct SendParam {
    uint32 dstEid;
    bytes32 to;
    uint256 amountLD;
    uint256 minAmountLD;
    bytes extraOptions; // SIEMPRE 0x: ya hay enforcedOptions con 300k gas (trampa #4)
    bytes composeMsg;
    bytes oftCmd;
}

struct MessagingFee {
    uint256 nativeFee;
    uint256 lzTokenFee;
}

struct MessagingReceipt {
    bytes32 guid;
    uint64 nonce;
    MessagingFee fee;
}

struct OFTReceipt {
    uint256 amountSentLD;
    uint256 amountReceivedLD;
}

interface IOFT {
    function quoteSend(SendParam calldata, bool payInLzToken) external view returns (MessagingFee memory);
    function send(SendParam calldata, MessagingFee calldata, address refundAddress)
        external payable returns (MessagingReceipt memory, OFTReceipt memory);
    function token() external view returns (address);
    function approvalRequired() external view returns (bool);
    function sharedDecimals() external view returns (uint8);
}

// SPDX-License-Identifier: MIT
pragma solidity ^0.8.26;

/// @notice Venue de swap pluggable del CarryLoop. El caller aprueba tokenIn antes de llamar.
interface ISwapper {
    /// @return amountOut vendido todo amountIn; revierte si out < minOut.
    function swapExactIn(address tokenIn, address tokenOut, uint256 amountIn, uint256 minOut, address to)
        external returns (uint256 amountOut);

    /// @return amountIn usado para comprar exactamente amountOut; revierte si in > maxIn.
    function swapExactOut(address tokenIn, address tokenOut, uint256 amountOut, uint256 maxIn, address to)
        external returns (uint256 amountIn);
}

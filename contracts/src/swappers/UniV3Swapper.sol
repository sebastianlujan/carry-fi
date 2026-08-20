// SPDX-License-Identifier: MIT
pragma solidity ^0.8.26;

import {ISwapper} from "../interfaces/ISwapper.sol";
import {IERC20, SafeERC20Lib} from "../SafeERC20Lib.sol";

interface ISwapRouter02 {
    struct ExactInputSingleParams {
        address tokenIn;
        address tokenOut;
        uint24 fee;
        address recipient;
        uint256 amountIn;
        uint256 amountOutMinimum;
        uint160 sqrtPriceLimitX96;
    }

    struct ExactOutputSingleParams {
        address tokenIn;
        address tokenOut;
        uint24 fee;
        address recipient;
        uint256 amountOut;
        uint256 amountInMaximum;
        uint160 sqrtPriceLimitX96;
    }

    function exactInputSingle(ExactInputSingleParams calldata) external payable returns (uint256 amountOut);
    function exactOutputSingle(ExactOutputSingleParams calldata) external payable returns (uint256 amountIn);
}

/// @title UniV3Swapper — venue de producción (SwapRouter02 Arbitrum, fee tier 3000).
/// @notice El pool ARGt/USDC no existe todavía (20/8/2026); cuando alguien lo cree y seedee,
///         CarryLoop.setSwapper(este) enciende el loop en mainnet sin tocar nada más.
contract UniV3Swapper is ISwapper {
    using SafeERC20Lib for IERC20;

    ISwapRouter02 public immutable ROUTER;
    uint24 public immutable FEE;

    constructor(address router, uint24 fee) {
        ROUTER = ISwapRouter02(router);
        FEE = fee;
    }

    function swapExactIn(address tokenIn, address tokenOut, uint256 amountIn, uint256 minOut, address to)
        external
        returns (uint256 amountOut)
    {
        IERC20(tokenIn).safeTransferFrom(msg.sender, address(this), amountIn);
        IERC20(tokenIn).forceApprove(address(ROUTER), amountIn);
        amountOut = ROUTER.exactInputSingle(
            ISwapRouter02.ExactInputSingleParams(tokenIn, tokenOut, FEE, to, amountIn, minOut, 0)
        );
    }

    function swapExactOut(address tokenIn, address tokenOut, uint256 amountOut, uint256 maxIn, address to)
        external
        returns (uint256 amountIn)
    {
        IERC20(tokenIn).safeTransferFrom(msg.sender, address(this), maxIn);
        IERC20(tokenIn).forceApprove(address(ROUTER), maxIn);
        amountIn = ROUTER.exactOutputSingle(
            ISwapRouter02.ExactOutputSingleParams(tokenIn, tokenOut, FEE, to, amountOut, maxIn, 0)
        );
        // devolver el tokenIn no usado al caller
        if (amountIn < maxIn) IERC20(tokenIn).safeTransfer(msg.sender, maxIn - amountIn);
        IERC20(tokenIn).forceApprove(address(ROUTER), 0);
    }
}

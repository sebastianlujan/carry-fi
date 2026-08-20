// SPDX-License-Identifier: MIT
pragma solidity ^0.8.26;

import {ISwapper} from "../interfaces/ISwapper.sol";
import {IOracle} from "../interfaces/IOracle.sol";
import {IERC20, SafeERC20Lib} from "../SafeERC20Lib.sol";

/// @title SeededSwapper — venue de swap con inventario propio a precio de oracle ± spread.
/// @notice Para fork tests y demo local: en mainnet HOY no existe pool ARGt/USDC en ningún
///         DEX de Arbitrum (verificado 20/8/2026: UniV3 x4 tiers, UniV2, Camelot V2/V3 = 0x0).
///         Aísla la única pata faltante del loop; Morpho, vault y market son los reales.
/// @dev Feed = oracle ARGt/USDC de Twin (escala 1e48): argtOut = usdcIn·P/1e36; usdcOut = argtIn·1e36/P.
contract SeededSwapper is ISwapper {
    using SafeERC20Lib for IERC20;

    error BadPair();
    error Slippage();
    error ExceedsMaxIn();

    IERC20 public immutable ARGT;
    IERC20 public immutable USDC;
    IOracle public immutable FEED; // ARGt por USDC, escala 1e48
    uint256 public immutable SPREAD_BPS;

    constructor(address argt, address usdc, address feed, uint256 spreadBps) {
        ARGT = IERC20(argt);
        USDC = IERC20(usdc);
        FEED = IOracle(feed);
        SPREAD_BPS = spreadBps;
    }

    function swapExactIn(address tokenIn, address tokenOut, uint256 amountIn, uint256 minOut, address to)
        external
        returns (uint256 amountOut)
    {
        uint256 p = FEED.price();
        if (tokenIn == address(USDC) && tokenOut == address(ARGT)) {
            amountOut = amountIn * p / 1e36;
        } else if (tokenIn == address(ARGT) && tokenOut == address(USDC)) {
            amountOut = amountIn * 1e36 / p;
        } else {
            revert BadPair();
        }
        amountOut = amountOut * (10_000 - SPREAD_BPS) / 10_000;
        require(amountOut >= minOut, Slippage());
        IERC20(tokenIn).safeTransferFrom(msg.sender, address(this), amountIn);
        IERC20(tokenOut).safeTransfer(to, amountOut);
    }

    function swapExactOut(address tokenIn, address tokenOut, uint256 amountOut, uint256 maxIn, address to)
        external
        returns (uint256 amountIn)
    {
        uint256 p = FEED.price();
        if (tokenIn == address(ARGT) && tokenOut == address(USDC)) {
            amountIn = (amountOut * p + 1e36 - 1) / 1e36;
        } else if (tokenIn == address(USDC) && tokenOut == address(ARGT)) {
            amountIn = (amountOut * 1e36 + p - 1) / p;
        } else {
            revert BadPair();
        }
        amountIn = amountIn * (10_000 + SPREAD_BPS) / 10_000;
        require(amountIn <= maxIn, ExceedsMaxIn());
        IERC20(tokenIn).safeTransferFrom(msg.sender, address(this), amountIn);
        IERC20(tokenOut).safeTransfer(to, amountOut);
    }
}

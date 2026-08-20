// SPDX-License-Identifier: MIT
pragma solidity ^0.8.26;

/// @notice Oracle estilo Morpho: precio de 1 unidad de colateral en loan token, escala
/// 1e36 * 10^(loanDecimals - collateralDecimals).
interface IOracle {
    function price() external view returns (uint256);
}

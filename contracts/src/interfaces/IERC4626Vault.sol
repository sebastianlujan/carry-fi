// SPDX-License-Identifier: MIT
pragma solidity ^0.8.26;

/// @notice Subconjunto que usamos del vault ARGt Prime (Morpho Vault V2, síncrono).
/// @dev TRAMPA #1: los max*() de este vault devuelven 0 SIEMPRE. No existen acá a propósito.
interface IERC4626Vault {
    function asset() external view returns (address);
    function deposit(uint256 assets, address receiver) external returns (uint256 shares);
    function redeem(uint256 shares, address receiver, address owner) external returns (uint256 assets);
    function previewDeposit(uint256 assets) external view returns (uint256 shares);
    function previewRedeem(uint256 shares) external view returns (uint256 assets);
    function convertToAssets(uint256 shares) external view returns (uint256 assets);
    function balanceOf(address) external view returns (uint256);
    function approve(address, uint256) external returns (bool);
}

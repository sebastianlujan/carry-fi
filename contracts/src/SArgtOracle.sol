// SPDX-License-Identifier: MIT
pragma solidity ^0.8.26;

import {IOracle} from "./interfaces/IOracle.sol";
import {IERC4626Vault} from "./interfaces/IERC4626Vault.sol";

/// @title SArgtOracle — precio de sARGt (shares del vault ARGt Prime) en USDC.
/// @notice Compone el feed ARGt/USDC ya usado por los markets de Twin con el share
///         price del vault. Inmutable, sin owner, sin llaves.
/// @dev Escalas (convención Morpho: loanAmount = collateralAmount * price / 1e36):
///      - Feed base (colateral USDC 6d → loan ARGt 18d): escala 1e48, ≈1.575e51 (1575 ARGt/USDC).
///      - Este oracle (colateral sARGt 18d → loan USDC 6d): escala 1e24.
///      price = convertToAssets(1e18) · 1e54 / feedBase   →  ≈6.38e20 (0.000638 USDC/sARGt).
contract SArgtOracle is IOracle {
    IOracle public immutable ARGT_USDC_FEED;
    IERC4626Vault public immutable VAULT;

    constructor(address argtUsdcFeed, address vault) {
        ARGT_USDC_FEED = IOracle(argtUsdcFeed);
        VAULT = IERC4626Vault(vault);
    }

    function price() external view returns (uint256) {
        // convertToAssets(1e18) ~1e18 → producto ~1e72 < 2^256; sin riesgo real de overflow.
        return VAULT.convertToAssets(1e18) * 1e54 / ARGT_USDC_FEED.price();
    }
}

// SPDX-License-Identifier: MIT
pragma solidity ^0.8.26;

struct MarketParams {
    address loanToken;
    address collateralToken;
    address oracle;
    address irm;
    uint256 lltv;
}

struct Position {
    uint256 supplyShares;
    uint128 borrowShares;
    uint128 collateral;
}

struct Market {
    uint128 totalSupplyAssets;
    uint128 totalSupplyShares;
    uint128 totalBorrowAssets;
    uint128 totalBorrowShares;
    uint128 lastUpdate;
    uint128 fee;
}

interface IMorpho {
    function createMarket(MarketParams memory marketParams) external;
    function supply(MarketParams memory, uint256 assets, uint256 shares, address onBehalf, bytes memory data)
        external returns (uint256, uint256);
    function supplyCollateral(MarketParams memory, uint256 assets, address onBehalf, bytes memory data) external;
    function withdrawCollateral(MarketParams memory, uint256 assets, address onBehalf, address receiver) external;
    function borrow(MarketParams memory, uint256 assets, uint256 shares, address onBehalf, address receiver)
        external returns (uint256, uint256);
    function repay(MarketParams memory, uint256 assets, uint256 shares, address onBehalf, bytes memory data)
        external returns (uint256, uint256);
    function flashLoan(address token, uint256 assets, bytes calldata data) external;
    function accrueInterest(MarketParams memory) external;
    function setAuthorization(address authorized, bool newIsAuthorized) external;
    function isAuthorized(address authorizer, address authorized) external view returns (bool);
    function position(bytes32 id, address user) external view returns (Position memory);
    function market(bytes32 id) external view returns (Market memory);
    function idToMarketParams(bytes32 id) external view returns (MarketParams memory);
}

interface IMorphoFlashLoanCallback {
    function onMorphoFlashLoan(uint256 assets, bytes calldata data) external;
}

library MarketParamsLib {
    function id(MarketParams memory p) internal pure returns (bytes32) {
        return keccak256(abi.encode(p));
    }
}

/// @dev Morpho Blue virtual shares math (trampa #5 de AGENTS.md).
library SharesMath {
    uint256 internal constant VIRTUAL_SHARES = 1e6;
    uint256 internal constant VIRTUAL_ASSETS = 1;

    function toAssetsUp(uint256 shares, uint256 totalAssets, uint256 totalShares) internal pure returns (uint256) {
        uint256 num = shares * (totalAssets + VIRTUAL_ASSETS);
        uint256 den = totalShares + VIRTUAL_SHARES;
        return (num + den - 1) / den;
    }

    function toAssetsDown(uint256 shares, uint256 totalAssets, uint256 totalShares) internal pure returns (uint256) {
        return shares * (totalAssets + VIRTUAL_ASSETS) / (totalShares + VIRTUAL_SHARES);
    }
}

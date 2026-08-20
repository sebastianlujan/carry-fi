// SPDX-License-Identifier: MIT
pragma solidity ^0.8.26;

import {Test} from "forge-std/Test.sol";
import {IMorpho, MarketParams, MarketParamsLib, Position, Market, SharesMath} from "../src/interfaces/IMorpho.sol";
import {IERC20} from "../src/SafeERC20Lib.sol";
import {Addresses} from "../src/Addresses.sol";

/// @notice Earn directo al market ARGt/USDC de Morpho Blue (supply ARGt → 13,4% real).
///         Reemplaza el vault idle. Posición a nombre del user (non-custodial).
contract MarketForkTest is Test {
    using MarketParamsLib for MarketParams;

    IMorpho constant MORPHO = IMorpho(Addresses.MORPHO);
    IERC20 constant ARGT = IERC20(Addresses.ARGT);

    MarketParams params = MarketParams({
        loanToken: Addresses.ARGT,
        collateralToken: Addresses.USDC,
        oracle: Addresses.ORACLE_ARGT_USDC,
        irm: Addresses.IRM_ADAPTIVE_CURVE,
        lltv: Addresses.LLTV_77
    });

    address user = makeAddr("user");

    function setUp() public {
        vm.createSelectFork("arbitrum");
        vm.prank(Addresses.VAULT_ARGT_PRIME);
        ARGT.transfer(user, 10_000e18);
    }

    function test_supply_and_withdraw_all() public {
        bytes32 id = params.id();
        vm.startPrank(user);
        ARGT.approve(address(MORPHO), 10_000e18);
        MORPHO.supply(params, 10_000e18, 0, user, "");
        vm.stopPrank();

        Position memory p = MORPHO.position(id, user);
        assertGt(p.supplyShares, 0, "sin supply shares");

        // devenga una semana de interés real del carry
        vm.warp(block.timestamp + 7 days);
        MORPHO.accrueInterest(params);

        // retirar TODO por shares (exacto, sin dust)
        p = MORPHO.position(id, user);
        vm.prank(user);
        MORPHO.withdraw(params, 0, p.supplyShares, user, user);

        // recupera >= lo depositado (ganó interés)
        assertGe(ARGT.balanceOf(user), 10_000e18, "no recupero el capital");
    }

    function test_partial_withdraw_by_assets() public {
        vm.startPrank(user);
        ARGT.approve(address(MORPHO), 10_000e18);
        MORPHO.supply(params, 10_000e18, 0, user, "");
        MORPHO.withdraw(params, 4_000e18, 0, user, user); // retiro parcial por assets
        vm.stopPrank();
        assertApproxEqRel(ARGT.balanceOf(user), 4_000e18, 0.001e18);
    }
}

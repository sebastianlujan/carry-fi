// SPDX-License-Identifier: MIT
pragma solidity ^0.8.26;

import {Test} from "forge-std/Test.sol";
import {IERC4626Vault} from "../src/interfaces/IERC4626Vault.sol";
import {IERC20} from "../src/SafeERC20Lib.sol";
import {Addresses} from "../src/Addresses.sol";

/// @notice Milestone 2: deposit/redeem contra el vault ARGt Prime real.
contract VaultForkTest is Test {
    IERC4626Vault constant VAULT = IERC4626Vault(Addresses.VAULT_ARGT_PRIME);
    IERC20 constant ARGT = IERC20(Addresses.ARGT);
    address user = makeAddr("user");

    function setUp() public {
        vm.createSelectFork("arbitrum");
        vm.prank(Addresses.VAULT_ARGT_PRIME);
        ARGT.transfer(user, 10_000e18);
    }

    function test_deposit_and_redeem_roundtrip() public {
        vm.startPrank(user);
        ARGT.approve(address(VAULT), 10_000e18);
        uint256 shares = VAULT.deposit(10_000e18, user);
        assertGt(shares, 0);
        assertApproxEqRel(VAULT.convertToAssets(shares), 10_000e18, 0.001e18);

        uint256 back = VAULT.redeem(shares / 2, user, user);
        vm.stopPrank();
        assertApproxEqRel(back, 5_000e18, 0.001e18);
        assertApproxEqRel(ARGT.balanceOf(user), 5_000e18, 0.001e18);
    }
}

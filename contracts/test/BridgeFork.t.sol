// SPDX-License-Identifier: MIT
pragma solidity ^0.8.26;

import {Test} from "forge-std/Test.sol";
import {IOFT, SendParam, MessagingFee} from "../src/interfaces/IOFT.sol";
import {IERC20} from "../src/SafeERC20Lib.sol";
import {Addresses} from "../src/Addresses.sol";

/// @notice Milestone 3: bridge Arbitrum→Base vía el OFT Adapter de Twin (LayerZero V2).
contract BridgeForkTest is Test {
    IOFT constant OFT = IOFT(Addresses.OFT_ADAPTER_ARGT);
    IERC20 constant ARGT = IERC20(Addresses.ARGT);
    uint32 constant EID_BASE = 30184;
    address user = makeAddr("user");

    function setUp() public {
        vm.createSelectFork("arbitrum");
        vm.prank(Addresses.VAULT_ARGT_PRIME);
        ARGT.transfer(user, 1_000e18);
        vm.deal(user, 1 ether);
    }

    /// @dev trampa #3: sharedDecimals=6 => floor a multiplos de 1e12 y minAmountLD floored.
    function _floorToShared(uint256 amt) internal pure returns (uint256) {
        return amt / 1e12 * 1e12;
    }

    function test_quote_and_send_with_dust_flooring() public {
        assertEq(OFT.token(), address(ARGT));
        assertEq(OFT.sharedDecimals(), 6);

        uint256 raw = 100e18 + 12345; // con dust intencional
        uint256 amt = _floorToShared(raw);
        SendParam memory p = SendParam({
            dstEid: EID_BASE,
            to: bytes32(uint256(uint160(user))),
            amountLD: amt,
            minAmountLD: amt,
            extraOptions: "",
            composeMsg: "",
            oftCmd: ""
        });
        MessagingFee memory fee = OFT.quoteSend(p, false);
        assertGt(fee.nativeFee, 0);
        assertLt(fee.nativeFee, 0.001 ether);

        uint256 balBefore = ARGT.balanceOf(user);
        vm.startPrank(user);
        ARGT.approve(address(OFT), amt);
        OFT.send{value: fee.nativeFee}(p, fee, user);
        vm.stopPrank();
        // el adapter lockea exactamente el monto floored
        assertEq(balBefore - ARGT.balanceOf(user), amt);
    }

    function test_dusty_amount_as_min_reverts() public {
        uint256 raw = 100e18 + 12345;
        SendParam memory p = SendParam({
            dstEid: EID_BASE,
            to: bytes32(uint256(uint160(user))),
            amountLD: raw,
            minAmountLD: raw, // sin floor: el OFT trunca y el min no se alcanza
            extraOptions: "",
            composeMsg: "",
            oftCmd: ""
        });
        vm.startPrank(user);
        ARGT.approve(address(OFT), raw);
        vm.expectRevert(); // SlippageExceeded
        OFT.send{value: 0.0001 ether}(p, MessagingFee(0.0001 ether, 0), user);
        vm.stopPrank();
    }
}

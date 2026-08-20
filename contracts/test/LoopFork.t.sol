// SPDX-License-Identifier: MIT
pragma solidity ^0.8.26;

import {Test, console2} from "forge-std/Test.sol";
import {IMorpho, MarketParams, MarketParamsLib, Position, Market, SharesMath} from "../src/interfaces/IMorpho.sol";
import {IERC4626Vault} from "../src/interfaces/IERC4626Vault.sol";
import {IOracle} from "../src/interfaces/IOracle.sol";
import {IERC20} from "../src/SafeERC20Lib.sol";
import {Addresses} from "../src/Addresses.sol";
import {SArgtOracle} from "../src/SArgtOracle.sol";
import {SeededSwapper} from "../src/swappers/SeededSwapper.sol";
import {CarryLoop} from "../src/CarryLoop.sol";

/// @notice Loop e2e contra Arbitrum REAL (fork): Morpho real, vault real, feed real.
///         Lo único simulado es el venue de swap (SeededSwapper), porque la liquidez
///         DEX ARGt/USDC no existe todavía en ningún venue de Arbitrum (20/8/2026).
contract LoopForkTest is Test {
    using MarketParamsLib for MarketParams;

    IMorpho constant MORPHO = IMorpho(Addresses.MORPHO);
    IERC4626Vault constant VAULT = IERC4626Vault(Addresses.VAULT_ARGT_PRIME);
    IERC20 constant ARGT = IERC20(Addresses.ARGT);
    IERC20 constant USDC = IERC20(Addresses.USDC);

    SArgtOracle oracle;
    SeededSwapper swapper;
    CarryLoop loop;
    MarketParams params;
    bytes32 marketId;

    address user = makeAddr("user");
    address lender = makeAddr("lender");
    address feeSink = makeAddr("feeSink");

    uint256 constant EQUITY = 1_000_000e18; // 1M ARGt ≈ 635 USDC
    uint256 constant SPREAD_BPS = 30;

    function setUp() public {
        vm.createSelectFork("arbitrum");

        // 1. oracle sARGt/USDC (compone feed real de Twin + share price real del vault)
        oracle = new SArgtOracle(Addresses.ORACLE_ARGT_USDC, address(VAULT));

        // 2. crear el market sARGt/USDC que le falta al ecosistema — permissionless
        params = MarketParams({
            loanToken: address(USDC),
            collateralToken: address(VAULT), // las shares SON el token del vault
            oracle: address(oracle),
            irm: Addresses.IRM_ADAPTIVE_CURVE,
            lltv: Addresses.LLTV_77
        });
        MORPHO.createMarket(params);
        marketId = params.id();

        // 3. swapper seedeado (la pata que en mainnet aún no existe)
        swapper = new SeededSwapper(address(ARGT), address(USDC), Addresses.ORACLE_ARGT_USDC, SPREAD_BPS);
        vm.prank(address(VAULT));
        ARGT.transfer(address(swapper), 5_000_000e18);
        deal(address(USDC), address(swapper), 10_000e6);

        // 4. lender fondea el market con USDC
        deal(address(USDC), lender, 50_000e6);
        vm.startPrank(lender);
        USDC.approve(address(MORPHO), type(uint256).max);
        MORPHO.supply(params, 50_000e6, 0, lender, "");
        vm.stopPrank();

        // 5. router
        loop = new CarryLoop(
            address(MORPHO), address(VAULT), address(USDC), params, address(swapper), feeSink, 0
        );

        // 6. user: 1M ARGt + approvals (el único setup que pide el producto)
        vm.prank(address(VAULT));
        ARGT.transfer(user, EQUITY);
        vm.startPrank(user);
        ARGT.approve(address(loop), type(uint256).max);
        MORPHO.setAuthorization(address(loop), true);
        vm.stopPrank();
    }

    function _argtToUsdc(uint256 argt) internal view returns (uint256) {
        return argt * 1e36 / IOracle(Addresses.ORACLE_ARGT_USDC).price();
    }

    function test_oracle_price_sane() public view {
        // ≈ 0.000638 USDC por sARGt, escala 1e24 → ~6.38e20 (±20%)
        uint256 p = oracle.price();
        assertGt(p, 5e20);
        assertLt(p, 8e20);
    }

    function test_leverage_k2_health_then_full_deleverage() public {
        uint256 flashUsdc = _argtToUsdc(EQUITY); // k = 2
        uint256 minArgtOut = EQUITY * (10_000 - SPREAD_BPS - 20) / 10_000;

        vm.prank(user);
        loop.leverage(EQUITY, flashUsdc, minArgtOut);

        (uint256 shares, uint256 collArgt, uint256 debt, uint256 health) = loop.positionOf(user);
        assertGt(shares, 0, "sin colateral");
        assertApproxEqRel(collArgt, 2 * EQUITY, 0.01e18, "colateral != 2x equity");
        assertApproxEqRel(debt, flashUsdc, 0.001e18, "deuda != flash");
        // salud esperada ≈ 2 * 0.77 = 1.54
        assertApproxEqRel(health, 1.54e18, 0.02e18, "salud != 1.54");
        // el router no retiene NADA
        assertEq(ARGT.balanceOf(address(loop)), 0);
        assertEq(USDC.balanceOf(address(loop)), 0);
        assertEq(VAULT.balanceOf(address(loop)), 0);
        assertEq(ARGT.balanceOf(user), 0);

        // una semana de intereses reales del IRM AdaptiveCurve
        vm.warp(block.timestamp + 7 days);

        vm.prank(user);
        loop.deleverage(type(uint256).max, EQUITY * 105 / 100);

        (,, uint256 debtAfter,) = loop.positionOf(user);
        assertEq(debtAfter, 0, "deuda viva");
        assertEq(loop.principal(user), 0, "principal no reseteado");
        // recupera ≥ 98.5% del equity (2 swaps a 30bps sobre ~1x notional + interés de 7d)
        assertGt(ARGT.balanceOf(user), EQUITY * 985 / 1000, "perdida > costos esperados");
        assertEq(ARGT.balanceOf(address(loop)), 0);
        assertEq(USDC.balanceOf(address(loop)), 0);
    }

    function test_perf_fee_only_on_profit() public {
        loop.setPerfFee(1000); // 10%
        uint256 flashUsdc = _argtToUsdc(EQUITY);

        vm.prank(user);
        loop.leverage(EQUITY, flashUsdc, 0);

        // la ganancia llega: el peso se aprecia 5% vs USDC => recomprar la deuda cuesta
        // menos ARGt. (El vault V2 no reconoce donaciones al idle en su accounting interno,
        // asi que la via del share price no es mockeable de forma honesta en un fork.)
        uint256 p0 = IOracle(Addresses.ORACLE_ARGT_USDC).price();
        vm.mockCall(
            Addresses.ORACLE_ARGT_USDC,
            abi.encodeWithSelector(IOracle.price.selector),
            abi.encode(p0 * 95 / 100)
        );

        vm.prank(user);
        loop.deleverage(type(uint256).max, EQUITY * 3);

        uint256 fee = ARGT.balanceOf(feeSink);
        uint256 userOut = ARGT.balanceOf(user);
        assertGt(fee, 0, "sin fee con profit");
        assertGt(userOut, EQUITY, "user sin ganancia");
        // fee == 10% del profit
        uint256 profit = userOut + fee - EQUITY;
        assertApproxEqRel(fee, profit / 10, 0.01e18, "fee != 10% profit");
    }

    function test_no_fee_without_profit() public {
        loop.setPerfFee(1000);
        uint256 flashUsdc = _argtToUsdc(EQUITY);
        vm.prank(user);
        loop.leverage(EQUITY, flashUsdc, 0);
        vm.prank(user);
        loop.deleverage(type(uint256).max, EQUITY * 105 / 100);
        // spread 30bps x2 => sale con perdida => fee 0
        assertEq(ARGT.balanceOf(feeSink), 0, "fee sin profit");
    }

    function test_revert_without_authorization() public {
        address rando = makeAddr("rando");
        vm.prank(address(VAULT));
        ARGT.transfer(rando, EQUITY);
        vm.startPrank(rando);
        ARGT.approve(address(loop), type(uint256).max);
        vm.expectRevert(CarryLoop.NotAuthorized.selector);
        loop.leverage(EQUITY, 100e6, 0);
        vm.stopPrank();
    }

    function test_revert_vault_illiquid() public {
        uint256 flashUsdc = _argtToUsdc(EQUITY);
        vm.prank(user);
        loop.leverage(EQUITY, flashUsdc, 0);

        // vaciar el idle del vault (el curator alocando todo, p.ej.)
        uint256 idle = ARGT.balanceOf(address(VAULT));
        vm.prank(address(VAULT));
        ARGT.transfer(address(0xdead), idle - 1e18);

        vm.prank(user);
        vm.expectRevert(CarryLoop.VaultIlliquid.selector);
        loop.deleverage(type(uint256).max, EQUITY * 2);
    }

    /// TRAMPA #1 clavada en un test: max* miente, deposit/redeem funcionan.
    function test_vault_max_functions_lie() public {
        vm.prank(address(VAULT));
        ARGT.transfer(user, 1_000e18);

        (bool ok, bytes memory ret) =
            address(VAULT).staticcall(abi.encodeWithSignature("maxDeposit(address)", user));
        assertTrue(ok);
        assertEq(abi.decode(ret, (uint256)), 0, "maxDeposit ya no es 0: revisar supuesto");

        vm.startPrank(user);
        ARGT.approve(address(VAULT), 1_000e18);
        uint256 shares = VAULT.deposit(1_000e18, user); // y sin embargo, funciona
        vm.stopPrank();
        assertGt(shares, 0);
    }
}

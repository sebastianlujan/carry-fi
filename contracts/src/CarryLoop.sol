// SPDX-License-Identifier: MIT
pragma solidity ^0.8.26;

import {IMorpho, IMorphoFlashLoanCallback, MarketParams, MarketParamsLib, Position, Market, SharesMath}
    from "./interfaces/IMorpho.sol";
import {IERC4626Vault} from "./interfaces/IERC4626Vault.sol";
import {IOracle} from "./interfaces/IOracle.sol";
import {ISwapper} from "./interfaces/ISwapper.sol";
import {IERC20, SafeERC20Lib} from "./SafeERC20Lib.sol";

/// @title CarryLoop — leverage/deleverage atómico del carry ARGt vía Morpho flashLoan.
///
/// leverage(equity, flashUsdc, minArgtOut):
///   flashLoan(USDC) → swap USDC→ARGt → vault.deposit → supplyCollateral(sARGt, onBehalf=user)
///   → borrow(USDC, onBehalf=user) → repaga el flash. LTV final ≈ (k−1)/k.
///
/// deleverage(sharesOut, maxArgtIn):
///   cierra TODA la deuda: flashLoan(deuda exacta) → repay(por shares) → withdrawCollateral
///   → vault.redeem → swapExactOut ARGt→USDC → repaga flash → sobrante ARGt al user
///   (menos performance fee sólo sobre la ganancia).
///
/// Invariantes:
///   - Posición y deuda SIEMPRE a nombre del user. Si Carry desaparece, el user opera Morpho directo.
///   - El router no retiene fondos entre transacciones; sobrantes se barren al user en el mismo tx.
///   - onMorphoFlashLoan sólo ejecutable por Morpho con una operación pendiente iniciada acá.
///   - Fee sólo sobre profit (nunca sobre capital), tope inmutable 20%.
///   - Requisito único del user: ARGt.approve(router) + Morpho.setAuthorization(router, true).
///
/// TRAMPA #1 (AGENTS.md): el vault devuelve 0 en todos los max*(); el pre-check de liquidez
/// usa previewRedeem() contra el balance idle real del vault — jamás maxWithdraw().
contract CarryLoop is IMorphoFlashLoanCallback {
    using SafeERC20Lib for IERC20;
    using MarketParamsLib for MarketParams;

    error NotMorpho();
    error NoPendingOp();
    error NotAuthorized();
    error VaultIlliquid();
    error FeeTooHigh();
    error ZeroAmount();
    error NoPosition();

    event Leveraged(address indexed user, uint256 equityArgt, uint256 flashUsdc, uint256 collateralShares);
    event Deleveraged(address indexed user, uint256 sharesOut, uint256 debtRepaid, uint256 argtReturned, uint256 fee);

    uint256 public constant MAX_PERF_FEE_BPS = 2000; // 20% — tope inmutable
    uint256 internal constant WAD = 1e18;
    uint256 internal constant ORACLE_SCALE = 1e36;

    IMorpho public immutable MORPHO;
    IERC4626Vault public immutable VAULT; // sARGt (el token de shares ES el vault)
    IERC20 public immutable ARGT;
    IERC20 public immutable USDC;

    MarketParams public marketParams; // market sARGt/USDC creado por el deploy script
    bytes32 public immutable MARKET_ID;

    address public owner;
    address public feeRecipient;
    uint256 public perfFeeBps;
    ISwapper public swapper;

    /// @notice equity ARGt aportado por user aún dentro del loop (high-water para el fee).
    mapping(address => uint256) public principal;

    enum Op { None, Lever, Delever }
    struct Pending {
        Op op;
        address user;
        uint256 equity;     // Lever: ARGt del user ya en el router
        uint256 minArgtOut; // Lever: slippage guard del swap
        uint256 sharesOut;  // Delever: colateral sARGt a retirar
        uint256 maxArgtIn;  // Delever: tope de ARGt vendido para recomprar la deuda
    }
    Pending internal _pending;

    modifier onlyOwner() {
        require(msg.sender == owner, NotAuthorized());
        _;
    }

    constructor(
        address morpho,
        address vault,
        address usdc,
        MarketParams memory params,
        address swapper_,
        address feeRecipient_,
        uint256 perfFeeBps_
    ) {
        require(perfFeeBps_ <= MAX_PERF_FEE_BPS, FeeTooHigh());
        MORPHO = IMorpho(morpho);
        VAULT = IERC4626Vault(vault);
        ARGT = IERC20(IERC4626Vault(vault).asset());
        USDC = IERC20(usdc);
        marketParams = params;
        MARKET_ID = params.id();
        swapper = ISwapper(swapper_);
        owner = msg.sender;
        feeRecipient = feeRecipient_;
        perfFeeBps = perfFeeBps_;
    }

    // ───────────────────────── admin ─────────────────────────

    function setPerfFee(uint256 bps) external onlyOwner {
        require(bps <= MAX_PERF_FEE_BPS, FeeTooHigh());
        perfFeeBps = bps;
    }

    function setSwapper(address s) external onlyOwner {
        swapper = ISwapper(s);
    }

    function setFeeRecipient(address r) external onlyOwner {
        feeRecipient = r;
    }

    // ──────────────────────── leverage ───────────────────────

    /// @param equity     ARGt aportado por el user (ya aprobado al router).
    /// @param flashUsdc  USDC flasheado; define k: k ≈ 1 + valor(flashUsdc)/valor(equity).
    /// @param minArgtOut mínimo ARGt del swap USDC→ARGt (guard de slippage).
    function leverage(uint256 equity, uint256 flashUsdc, uint256 minArgtOut) external {
        require(equity > 0 && flashUsdc > 0, ZeroAmount());
        require(MORPHO.isAuthorized(msg.sender, address(this)), NotAuthorized());

        ARGT.safeTransferFrom(msg.sender, address(this), equity);
        principal[msg.sender] += equity;

        _pending = Pending(Op.Lever, msg.sender, equity, minArgtOut, 0, 0);
        MORPHO.flashLoan(address(USDC), flashUsdc, "");
        delete _pending;

        // el router nunca retiene fondos: barrido defensivo de sobrantes
        _sweep(msg.sender);
    }

    // ─────────────────────── deleverage ──────────────────────

    /// @notice Cierra TODA la deuda del user y retira `sharesOut` de colateral.
    /// @param sharesOut  sARGt a retirar (type(uint256).max = todo el colateral).
    /// @param maxArgtIn  tope de ARGt vendido para recomprar la deuda (guard de slippage).
    function deleverage(uint256 sharesOut, uint256 maxArgtIn) external {
        require(MORPHO.isAuthorized(msg.sender, address(this)), NotAuthorized());

        MORPHO.accrueInterest(marketParams);
        Position memory p = MORPHO.position(MARKET_ID, msg.sender);
        require(p.collateral > 0, NoPosition());
        if (sharesOut == type(uint256).max) sharesOut = p.collateral;

        Market memory m = MORPHO.market(MARKET_ID);
        uint256 debt = SharesMath.toAssetsUp(p.borrowShares, m.totalBorrowAssets, m.totalBorrowShares);

        // TRAMPA #1: pre-check de liquidez del vault SIN maxWithdraw (devuelve 0 siempre).
        require(VAULT.previewRedeem(sharesOut) <= ARGT.balanceOf(address(VAULT)), VaultIlliquid());

        _pending = Pending(Op.Delever, msg.sender, 0, 0, sharesOut, maxArgtIn);
        if (debt > 0) {
            MORPHO.flashLoan(address(USDC), debt, "");
        } else {
            // sin deuda: retiro directo de colateral, sin flash
            _deleverNoDebt(msg.sender, sharesOut);
        }
        delete _pending;
        USDC.forceApprove(address(MORPHO), 0);

        _sweep(msg.sender);
    }

    // ─────────────────── flash loan callback ─────────────────

    function onMorphoFlashLoan(uint256 assets, bytes calldata) external {
        require(msg.sender == address(MORPHO), NotMorpho());
        Pending memory pend = _pending;
        require(pend.op != Op.None, NoPendingOp());

        if (pend.op == Op.Lever) {
            _leverCallback(pend, assets);
        } else {
            _deleverCallback(pend, assets);
        }
    }

    function _leverCallback(Pending memory pend, uint256 flashUsdc) internal {
        // 1. USDC → ARGt
        USDC.forceApprove(address(swapper), flashUsdc);
        uint256 argtOut = swapper.swapExactIn(address(USDC), address(ARGT), flashUsdc, pend.minArgtOut, address(this));

        // 2. equity + argtOut → vault, shares al router
        uint256 totalArgt = pend.equity + argtOut;
        ARGT.forceApprove(address(VAULT), totalArgt);
        uint256 shares = VAULT.deposit(totalArgt, address(this));

        // 3. colateral A NOMBRE DEL USER
        VAULT.approve(address(MORPHO), shares);
        MORPHO.supplyCollateral(marketParams, shares, pend.user, "");

        // 4. deuda del user, USDC al router para repagar el flash
        MORPHO.borrow(marketParams, flashUsdc, 0, pend.user, address(this));

        // 5. Morpho pullea flashUsdc al salir del callback (fee 0)
        USDC.forceApprove(address(MORPHO), flashUsdc);

        emit Leveraged(pend.user, pend.equity, flashUsdc, shares);
    }

    function _deleverCallback(Pending memory pend, uint256 flashUsdc) internal {
        // 1. matar TODA la deuda por shares (exacto, sin dust)
        Position memory p = MORPHO.position(MARKET_ID, pend.user);
        USDC.forceApprove(address(MORPHO), type(uint256).max); // cubre repay + repago del flash
        (uint256 assetsRepaid,) = MORPHO.repay(marketParams, 0, p.borrowShares, pend.user, "");

        // 2. retirar colateral del user hacia el router
        MORPHO.withdrawCollateral(marketParams, pend.sharesOut, pend.user, address(this));

        // 3. shares → ARGt
        uint256 argtOut = VAULT.redeem(pend.sharesOut, address(this), address(this));

        // 4. recomprar sólo la deuda repagada (el resto del flash sigue en el router)
        ARGT.forceApprove(address(swapper), pend.maxArgtIn);
        uint256 argtIn =
            swapper.swapExactOut(address(ARGT), address(USDC), assetsRepaid, pend.maxArgtIn, address(this));
        ARGT.forceApprove(address(swapper), 0);

        // 5. sobrante al user, fee sólo sobre ganancia
        uint256 leftover = argtOut - argtIn;
        uint256 fee = _settle(pend.user, leftover);

        emit Deleveraged(pend.user, pend.sharesOut, assetsRepaid, leftover - fee, fee);
        // 6. Morpho pullea flashUsdc al salir (allowance max ya seteada)
        flashUsdc; // silencio: el repago lo hace Morpho vía transferFrom
    }

    function _deleverNoDebt(address user, uint256 sharesOut) internal {
        MORPHO.withdrawCollateral(marketParams, sharesOut, user, address(this));
        uint256 argtOut = VAULT.redeem(sharesOut, address(this), address(this));
        uint256 fee = _settle(user, argtOut);
        emit Deleveraged(user, sharesOut, 0, argtOut - fee, fee);
    }

    /// @dev fee sólo sobre profit vs principal; exit total ⇒ principal se resetea.
    function _settle(address user, uint256 argtLeftover) internal returns (uint256 fee) {
        uint256 base = principal[user];
        principal[user] = 0;
        if (argtLeftover > base && perfFeeBps > 0 && feeRecipient != address(0)) {
            fee = (argtLeftover - base) * perfFeeBps / 10_000;
            if (fee > 0) ARGT.safeTransfer(feeRecipient, fee);
        }
        uint256 net = argtLeftover - fee;
        if (net > 0) ARGT.safeTransfer(user, net);
    }

    function _sweep(address to) internal {
        uint256 a = ARGT.balanceOf(address(this));
        if (a > 0) ARGT.safeTransfer(to, a);
        uint256 u = USDC.balanceOf(address(this));
        if (u > 0) USDC.safeTransfer(to, u);
        uint256 s = VAULT.balanceOf(address(this));
        if (s > 0) VAULT.approve(address(this), 0); // no-op defensivo; las shares nunca deben quedar acá
    }

    // ───────────────────────── views ─────────────────────────

    /// @notice Posición del user para la UI: colateral, deuda, salud (WAD; type(uint256).max sin deuda).
    function positionOf(address user)
        external
        view
        returns (uint256 collateralShares, uint256 collateralArgt, uint256 debtUsdc, uint256 healthWad)
    {
        Position memory p = MORPHO.position(MARKET_ID, user);
        Market memory m = MORPHO.market(MARKET_ID);
        collateralShares = p.collateral;
        collateralArgt = VAULT.convertToAssets(p.collateral);
        debtUsdc = SharesMath.toAssetsUp(p.borrowShares, m.totalBorrowAssets, m.totalBorrowShares);
        if (debtUsdc == 0) return (collateralShares, collateralArgt, 0, type(uint256).max);
        uint256 collateralValueUsdc = uint256(p.collateral) * IOracle(marketParams.oracle).price() / ORACLE_SCALE;
        healthWad = collateralValueUsdc * marketParams.lltv / debtUsdc; // maxBorrow/debt en WAD
    }
}

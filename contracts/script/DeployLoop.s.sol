// SPDX-License-Identifier: MIT
pragma solidity ^0.8.26;

import {Script, console2} from "forge-std/Script.sol";
import {IMorpho, MarketParams, MarketParamsLib} from "../src/interfaces/IMorpho.sol";
import {Addresses} from "../src/Addresses.sol";
import {SArgtOracle} from "../src/SArgtOracle.sol";
import {UniV3Swapper} from "../src/swappers/UniV3Swapper.sol";
import {CarryLoop} from "../src/CarryLoop.sol";

/// @notice Deploy REAL en Arbitrum (cuesta solo gas): oracle + market sARGt/USDC + router.
///         El pool UniV3 ARGt/USDC aun no existe: el loop queda deployado y gateado
///         hasta que haya liquidez (la UI chequea en vivo).
/// forge script script/DeployLoop.s.sol --rpc-url arbitrum --broadcast -i 1
contract DeployLoop is Script {
    using MarketParamsLib for MarketParams;

    address constant SWAP_ROUTER_02 = 0x68b3465833fb72A70ecDF485E0e4C7bD8665Fc45;

    function run() external {
        vm.startBroadcast();

        SArgtOracle oracle = new SArgtOracle(Addresses.ORACLE_ARGT_USDC, Addresses.VAULT_ARGT_PRIME);
        MarketParams memory params = MarketParams({
            loanToken: Addresses.USDC,
            collateralToken: Addresses.VAULT_ARGT_PRIME,
            oracle: address(oracle),
            irm: Addresses.IRM_ADAPTIVE_CURVE,
            lltv: Addresses.LLTV_77
        });
        IMorpho(Addresses.MORPHO).createMarket(params);
        UniV3Swapper swapper = new UniV3Swapper(SWAP_ROUTER_02, 3000);
        CarryLoop loop = new CarryLoop(
            Addresses.MORPHO, Addresses.VAULT_ARGT_PRIME, Addresses.USDC,
            params, address(swapper), msg.sender, 1000 // perf fee 10%
        );

        console2.log("SArgtOracle:", address(oracle));
        console2.log("marketId:");
        console2.logBytes32(params.id());
        console2.log("UniV3Swapper:", address(swapper));
        console2.log("CarryLoop:", address(loop));
        vm.stopBroadcast();
    }
}

// SPDX-License-Identifier: MIT
pragma solidity ^0.8.26;

/// @notice Direcciones verificadas on-chain el 20/8/2026 (ver AGENTS.md).
library Addresses {
    // Arbitrum 42161
    address constant ARGT = 0x59863989d080B22476DB95656d0C3CC18be92214;
    address constant VAULT_ARGT_PRIME = 0x9Dd3F844747AB78d616BF76DB92756E17A064aDD; // sARGt
    address constant MORPHO = 0x6c247b1F6182318877311737BaC0844bAa518F5e;
    address constant IRM_ADAPTIVE_CURVE = 0x66F30587FB8D4206918deb78ecA7d5eBbafD06DA;
    address constant ORACLE_ARGT_USDC = 0xc67F9A01554Dcc0AB415D267b3B3252eEB03aC4F; // 1e48-scale
    address constant USDC = 0xaf88d065e77c8cC2239327C5EDb3A432268e5831;
    address constant OFT_ADAPTER_ARGT = 0x4821FBf47B261F0D52Ba0F941CF67b8648f82691;
    uint256 constant LLTV_77 = 0.77e18;
}

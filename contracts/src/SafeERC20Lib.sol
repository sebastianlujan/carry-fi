// SPDX-License-Identifier: MIT
pragma solidity ^0.8.26;

interface IERC20 {
    function balanceOf(address) external view returns (uint256);
    function transfer(address, uint256) external returns (bool);
    function transferFrom(address, address, uint256) external returns (bool);
    function approve(address, uint256) external returns (bool);
    function allowance(address, address) external view returns (uint256);
}

/// @notice Transfers/approvals robustos para tokens que devuelven bool, nada, o exigen allowance 0 previo (USDC).
library SafeERC20Lib {
    error TransferFailed();
    error ApproveFailed();

    function safeTransfer(IERC20 t, address to, uint256 v) internal {
        (bool ok, bytes memory ret) = address(t).call(abi.encodeCall(IERC20.transfer, (to, v)));
        if (!ok || (ret.length > 0 && !abi.decode(ret, (bool)))) revert TransferFailed();
    }

    function safeTransferFrom(IERC20 t, address from, address to, uint256 v) internal {
        (bool ok, bytes memory ret) = address(t).call(abi.encodeCall(IERC20.transferFrom, (from, to, v)));
        if (!ok || (ret.length > 0 && !abi.decode(ret, (bool)))) revert TransferFailed();
    }

    function forceApprove(IERC20 t, address spender, uint256 v) internal {
        (bool ok, bytes memory ret) = address(t).call(abi.encodeCall(IERC20.approve, (spender, v)));
        if (ok && (ret.length == 0 || abi.decode(ret, (bool)))) return;
        // patrón USDC: resetear a 0 y reintentar
        (ok, ret) = address(t).call(abi.encodeCall(IERC20.approve, (spender, 0)));
        if (!ok || (ret.length > 0 && !abi.decode(ret, (bool)))) revert ApproveFailed();
        (ok, ret) = address(t).call(abi.encodeCall(IERC20.approve, (spender, v)));
        if (!ok || (ret.length > 0 && !abi.decode(ret, (bool)))) revert ApproveFailed();
    }
}

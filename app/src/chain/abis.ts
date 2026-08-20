export const erc20Abi = [
  { type: 'function', name: 'balanceOf', stateMutability: 'view', inputs: [{ name: 'a', type: 'address' }], outputs: [{ type: 'uint256' }] },
  { type: 'function', name: 'allowance', stateMutability: 'view', inputs: [{ name: 'o', type: 'address' }, { name: 's', type: 'address' }], outputs: [{ type: 'uint256' }] },
  { type: 'function', name: 'approve', stateMutability: 'nonpayable', inputs: [{ name: 's', type: 'address' }, { name: 'v', type: 'uint256' }], outputs: [{ type: 'bool' }] },
  { type: 'function', name: 'transfer', stateMutability: 'nonpayable', inputs: [{ name: 'to', type: 'address' }, { name: 'v', type: 'uint256' }], outputs: [{ type: 'bool' }] },
] as const

// TRAMPA #1: max*() del vault devuelven 0 siempre — NO están en este ABI a propósito.
export const vaultAbi = [
  { type: 'function', name: 'deposit', stateMutability: 'nonpayable', inputs: [{ name: 'assets', type: 'uint256' }, { name: 'receiver', type: 'address' }], outputs: [{ type: 'uint256' }] },
  { type: 'function', name: 'redeem', stateMutability: 'nonpayable', inputs: [{ name: 'shares', type: 'uint256' }, { name: 'receiver', type: 'address' }, { name: 'owner', type: 'address' }], outputs: [{ type: 'uint256' }] },
  { type: 'function', name: 'previewDeposit', stateMutability: 'view', inputs: [{ name: 'assets', type: 'uint256' }], outputs: [{ type: 'uint256' }] },
  { type: 'function', name: 'previewRedeem', stateMutability: 'view', inputs: [{ name: 'shares', type: 'uint256' }], outputs: [{ type: 'uint256' }] },
  { type: 'function', name: 'convertToAssets', stateMutability: 'view', inputs: [{ name: 'shares', type: 'uint256' }], outputs: [{ type: 'uint256' }] },
  { type: 'function', name: 'balanceOf', stateMutability: 'view', inputs: [{ name: 'a', type: 'address' }], outputs: [{ type: 'uint256' }] },
  { type: 'function', name: 'totalAssets', stateMutability: 'view', inputs: [], outputs: [{ type: 'uint256' }] },
] as const

export const morphoAbi = [
  { type: 'function', name: 'market', stateMutability: 'view', inputs: [{ name: 'id', type: 'bytes32' }], outputs: [
    { name: 'totalSupplyAssets', type: 'uint128' }, { name: 'totalSupplyShares', type: 'uint128' },
    { name: 'totalBorrowAssets', type: 'uint128' }, { name: 'totalBorrowShares', type: 'uint128' },
    { name: 'lastUpdate', type: 'uint128' }, { name: 'fee', type: 'uint128' }] },
  { type: 'function', name: 'position', stateMutability: 'view', inputs: [{ name: 'id', type: 'bytes32' }, { name: 'user', type: 'address' }], outputs: [
    { name: 'supplyShares', type: 'uint256' }, { name: 'borrowShares', type: 'uint128' }, { name: 'collateral', type: 'uint128' }] },
  { type: 'function', name: 'idToMarketParams', stateMutability: 'view', inputs: [{ name: 'id', type: 'bytes32' }], outputs: [
    { name: 'loanToken', type: 'address' }, { name: 'collateralToken', type: 'address' },
    { name: 'oracle', type: 'address' }, { name: 'irm', type: 'address' }, { name: 'lltv', type: 'uint256' }] },
  { type: 'function', name: 'supply', stateMutability: 'nonpayable', inputs: [
    { name: 'marketParams', type: 'tuple', components: [{ name: 'loanToken', type: 'address' }, { name: 'collateralToken', type: 'address' }, { name: 'oracle', type: 'address' }, { name: 'irm', type: 'address' }, { name: 'lltv', type: 'uint256' }] },
    { name: 'assets', type: 'uint256' }, { name: 'shares', type: 'uint256' }, { name: 'onBehalf', type: 'address' }, { name: 'data', type: 'bytes' }],
    outputs: [{ type: 'uint256' }, { type: 'uint256' }] },
  { type: 'function', name: 'withdraw', stateMutability: 'nonpayable', inputs: [
    { name: 'marketParams', type: 'tuple', components: [{ name: 'loanToken', type: 'address' }, { name: 'collateralToken', type: 'address' }, { name: 'oracle', type: 'address' }, { name: 'irm', type: 'address' }, { name: 'lltv', type: 'uint256' }] },
    { name: 'assets', type: 'uint256' }, { name: 'shares', type: 'uint256' }, { name: 'onBehalf', type: 'address' }, { name: 'receiver', type: 'address' }],
    outputs: [{ type: 'uint256' }, { type: 'uint256' }] },
  { type: 'function', name: 'accrueInterest', stateMutability: 'nonpayable', inputs: [{ name: 'marketParams', type: 'tuple', components: [{ name: 'loanToken', type: 'address' }, { name: 'collateralToken', type: 'address' }, { name: 'oracle', type: 'address' }, { name: 'irm', type: 'address' }, { name: 'lltv', type: 'uint256' }] }], outputs: [] },
  { type: 'function', name: 'setAuthorization', stateMutability: 'nonpayable', inputs: [{ name: 'authorized', type: 'address' }, { name: 'newIsAuthorized', type: 'bool' }], outputs: [] },
  { type: 'function', name: 'isAuthorized', stateMutability: 'view', inputs: [{ name: 'authorizer', type: 'address' }, { name: 'authorized', type: 'address' }], outputs: [{ type: 'bool' }] },
] as const

export const irmAbi = [
  { type: 'function', name: 'borrowRateView', stateMutability: 'view', inputs: [
    { name: 'marketParams', type: 'tuple', components: [
      { name: 'loanToken', type: 'address' }, { name: 'collateralToken', type: 'address' },
      { name: 'oracle', type: 'address' }, { name: 'irm', type: 'address' }, { name: 'lltv', type: 'uint256' }] },
    { name: 'market', type: 'tuple', components: [
      { name: 'totalSupplyAssets', type: 'uint128' }, { name: 'totalSupplyShares', type: 'uint128' },
      { name: 'totalBorrowAssets', type: 'uint128' }, { name: 'totalBorrowShares', type: 'uint128' },
      { name: 'lastUpdate', type: 'uint128' }, { name: 'fee', type: 'uint128' }] },
  ], outputs: [{ type: 'uint256' }] },
] as const

export const oftAbi = [
  { type: 'function', name: 'quoteSend', stateMutability: 'view', inputs: [
    { name: 'p', type: 'tuple', components: [
      { name: 'dstEid', type: 'uint32' }, { name: 'to', type: 'bytes32' },
      { name: 'amountLD', type: 'uint256' }, { name: 'minAmountLD', type: 'uint256' },
      { name: 'extraOptions', type: 'bytes' }, { name: 'composeMsg', type: 'bytes' }, { name: 'oftCmd', type: 'bytes' }] },
    { name: 'payInLzToken', type: 'bool' }],
    outputs: [{ name: 'fee', type: 'tuple', components: [{ name: 'nativeFee', type: 'uint256' }, { name: 'lzTokenFee', type: 'uint256' }] }] },
  { type: 'function', name: 'send', stateMutability: 'payable', inputs: [
    { name: 'p', type: 'tuple', components: [
      { name: 'dstEid', type: 'uint32' }, { name: 'to', type: 'bytes32' },
      { name: 'amountLD', type: 'uint256' }, { name: 'minAmountLD', type: 'uint256' },
      { name: 'extraOptions', type: 'bytes' }, { name: 'composeMsg', type: 'bytes' }, { name: 'oftCmd', type: 'bytes' }] },
    { name: 'fee', type: 'tuple', components: [{ name: 'nativeFee', type: 'uint256' }, { name: 'lzTokenFee', type: 'uint256' }] },
    { name: 'refundAddress', type: 'address' }],
    outputs: [
      { name: 'receipt', type: 'tuple', components: [{ name: 'guid', type: 'bytes32' }, { name: 'nonce', type: 'uint64' },
        { name: 'fee', type: 'tuple', components: [{ name: 'nativeFee', type: 'uint256' }, { name: 'lzTokenFee', type: 'uint256' }] }] },
      { name: 'oftReceipt', type: 'tuple', components: [{ name: 'amountSentLD', type: 'uint256' }, { name: 'amountReceivedLD', type: 'uint256' }] }] },
] as const

export const oracleAbi = [
  { type: 'function', name: 'price', stateMutability: 'view', inputs: [], outputs: [{ type: 'uint256' }] },
] as const

export const carryLoopAbi = [
  { type: 'function', name: 'leverage', stateMutability: 'nonpayable', inputs: [
    { name: 'equity', type: 'uint256' }, { name: 'flashUsdc', type: 'uint256' }, { name: 'minArgtOut', type: 'uint256' }], outputs: [] },
  { type: 'function', name: 'deleverage', stateMutability: 'nonpayable', inputs: [
    { name: 'sharesOut', type: 'uint256' }, { name: 'maxArgtIn', type: 'uint256' }], outputs: [] },
  { type: 'function', name: 'positionOf', stateMutability: 'view', inputs: [{ name: 'user', type: 'address' }], outputs: [
    { name: 'collateralShares', type: 'uint256' }, { name: 'collateralArgt', type: 'uint256' },
    { name: 'debtUsdc', type: 'uint256' }, { name: 'healthWad', type: 'uint256' }] },
  { type: 'function', name: 'MARKET_ID', stateMutability: 'view', inputs: [], outputs: [{ type: 'bytes32' }] },
  { type: 'function', name: 'perfFeeBps', stateMutability: 'view', inputs: [], outputs: [{ type: 'uint256' }] },
] as const

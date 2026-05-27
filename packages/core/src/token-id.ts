export function tokenIdFromOutcomeIndex(index: number): bigint {
  if (!Number.isInteger(index) || index < 0) {
    throw new Error(`invalid outcome index: ${index}`);
  }
  return 1n << BigInt(index);
}

export function outcomeIndexFromTokenId(tokenId: bigint): number {
  if (tokenId <= 0n || (tokenId & (tokenId - 1n)) !== 0n) {
    throw new Error(`invalid token id: ${tokenId.toString()}`);
  }

  let index = 0;
  let current = tokenId;
  while (current > 1n) {
    current >>= 1n;
    index++;
  }
  return index;
}


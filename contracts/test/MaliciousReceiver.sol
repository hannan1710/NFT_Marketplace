// SPDX-License-Identifier: MIT
pragma solidity ^0.8.22;

import "@openzeppelin/contracts/token/ERC721/IERC721Receiver.sol";

interface INFTContractMint {
    function mint(address to) external returns (uint256);
    function batchMint(address to, uint256 quantity) external;
}

/**
 * @title MaliciousReceiver
 * @dev Test contract to simulate reentrancy attack via onERC721Received callback
 */
contract MaliciousReceiver is IERC721Receiver {
    INFTContractMint public nft;
    uint256 public receiveCount;
    bool public attacking;
    
    constructor(address _nft) {
        nft = INFTContractMint(_nft);
    }
    
    function attemptReentrancy() external {
        attacking = true;
        receiveCount = 0;
        nft.batchMint(address(this), 1);
    }
    
    function onERC721Received(
        address,
        address,
        uint256,
        bytes memory
    ) external override returns (bytes4) {
        receiveCount++;
        
        if (attacking && receiveCount < 3) {
            // Attempt reentrancy by minting again
            nft.mint(address(this));
        }
        
        return this.onERC721Received.selector;
    }
}

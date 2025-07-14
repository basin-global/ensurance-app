// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/security/ReentrancyGuard.sol";

contract SitusOGAllowlist is Ownable, ReentrancyGuard {
    
    interface ISitusOG {
        function mint(
            string memory _domainName,
            address _domainHolder,
            address _referrer
        ) external payable returns (uint256);
        
        function price() external view returns (uint256);
        function buyingEnabled() external view returns (bool);
    }
    
    ISitusOG public immutable situsOG;
    mapping(address => bool) public allowlist;
    mapping(address => bool) public hasMinted;
    
    event AddressAdded(address indexed user);
    event AddressRemoved(address indexed user);
    event DomainMinted(address indexed user, string domainName, uint256 tokenId);
    
    error NotOnAllowlist();
    error AlreadyMinted();
    error MintingDisabled();
    error InvalidDomainName();
    error InsufficientPayment();
    
    constructor(address _situsOG) {
        situsOG = ISitusOG(_situsOG);
    }
    
    function addToAllowlist(address[] calldata addresses) external onlyOwner {
        for (uint256 i = 0; i < addresses.length; i++) {
            allowlist[addresses[i]] = true;
            emit AddressAdded(addresses[i]);
        }
    }
    
    function removeFromAllowlist(address[] calldata addresses) external onlyOwner {
        for (uint256 i = 0; i < addresses.length; i++) {
            allowlist[addresses[i]] = false;
            emit AddressRemoved(addresses[i]);
        }
    }
    
    function isOnAllowlist(address user) external view returns (bool) {
        return allowlist[user];
    }
    
    function hasAddressMinted(address user) external view returns (bool) {
        return hasMinted[user];
    }
    
    function mintDomain(
        string calldata domainName,
        address referrer
    ) external payable nonReentrant {
        if (!allowlist[msg.sender]) {
            revert NotOnAllowlist();
        }
        
        if (hasMinted[msg.sender]) {
            revert AlreadyMinted();
        }
        
        if (!situsOG.buyingEnabled()) {
            revert MintingDisabled();
        }
        
        if (bytes(domainName).length == 0) {
            revert InvalidDomainName();
        }
        
        uint256 requiredPrice = situsOG.price();
        if (msg.value < requiredPrice) {
            revert InsufficientPayment();
        }
        
        hasMinted[msg.sender] = true;
        
        uint256 tokenId = situsOG.mint{value: msg.value}(
            domainName,
            msg.sender,
            referrer
        );
        
        emit DomainMinted(msg.sender, domainName, tokenId);
    }
    
    function getMintPrice() external view returns (uint256) {
        return situsOG.price();
    }
    
    function isMintingEnabled() external view returns (bool) {
        return situsOG.buyingEnabled();
    }
    
    function withdraw() external onlyOwner {
        payable(owner()).transfer(address(this).balance);
    }
    
    function emergencyResetMinted(address user) external onlyOwner {
        hasMinted[user] = false;
    }
}
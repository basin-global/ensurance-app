// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/security/ReentrancyGuard.sol";

/**
 * @title SitusOGAllowlist
 * @dev Simple allowlist contract for SITUS OG minting
 * - Owner can add/remove addresses from allowlist
 * - Each address can only mint once
 * - Integrates with SITUS OG contract for minting
 */
contract SitusOGAllowlist is Ownable, ReentrancyGuard {
    
    // SITUS OG contract interface
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
    
    // Allowlist mapping: address => bool
    mapping(address => bool) public allowlist;
    
    // Track which addresses have already minted
    mapping(address => bool) public hasMinted;
    
    // Events
    event AddressAdded(address indexed user);
    event AddressRemoved(address indexed user);
    event DomainMinted(address indexed user, string domainName, uint256 tokenId);
    
    // Errors
    error NotOnAllowlist();
    error AlreadyMinted();
    error MintingDisabled();
    error InvalidDomainName();
    error InsufficientPayment();
    
    constructor(address _situsOG) {
        situsOG = ISitusOG(_situsOG);
    }
    
    /**
     * @dev Add addresses to allowlist (owner only)
     */
    function addToAllowlist(address[] calldata addresses) external onlyOwner {
        for (uint256 i = 0; i < addresses.length; i++) {
            allowlist[addresses[i]] = true;
            emit AddressAdded(addresses[i]);
        }
    }
    
    /**
     * @dev Remove addresses from allowlist (owner only)
     */
    function removeFromAllowlist(address[] calldata addresses) external onlyOwner {
        for (uint256 i = 0; i < addresses.length; i++) {
            allowlist[addresses[i]] = false;
            emit AddressRemoved(addresses[i]);
        }
    }
    
    /**
     * @dev Check if address is on allowlist
     */
    function isOnAllowlist(address user) external view returns (bool) {
        return allowlist[user];
    }
    
    /**
     * @dev Check if address has already minted
     */
    function hasAddressMinted(address user) external view returns (bool) {
        return hasMinted[user];
    }
    
    /**
     * @dev Mint a domain (one per allowlisted address)
     */
    function mintDomain(
        string calldata domainName,
        address referrer
    ) external payable nonReentrant {
        // Check if user is on allowlist
        if (!allowlist[msg.sender]) {
            revert NotOnAllowlist();
        }
        
        // Check if user has already minted
        if (hasMinted[msg.sender]) {
            revert AlreadyMinted();
        }
        
        // Check if minting is enabled
        if (!situsOG.buyingEnabled()) {
            revert MintingDisabled();
        }
        
        // Validate domain name (basic check)
        if (bytes(domainName).length == 0) {
            revert InvalidDomainName();
        }
        
        // Check if payment is sufficient
        uint256 requiredPrice = situsOG.price();
        if (msg.value < requiredPrice) {
            revert InsufficientPayment();
        }
        
        // Mark as minted
        hasMinted[msg.sender] = true;
        
        // Mint the domain
        uint256 tokenId = situsOG.mint{value: msg.value}(
            domainName,
            msg.sender,
            referrer
        );
        
        emit DomainMinted(msg.sender, domainName, tokenId);
    }
    
    /**
     * @dev Get mint price from SITUS OG contract
     */
    function getMintPrice() external view returns (uint256) {
        return situsOG.price();
    }
    
    /**
     * @dev Check if minting is enabled
     */
    function isMintingEnabled() external view returns (bool) {
        return situsOG.buyingEnabled();
    }
    
    /**
     * @dev Withdraw contract balance (owner only)
     */
    function withdraw() external onlyOwner {
        payable(owner()).transfer(address(this).balance);
    }
    
    /**
     * @dev Emergency function to reset minted status (owner only)
     * Use with caution - only for emergency situations
     */
    function emergencyResetMinted(address user) external onlyOwner {
        hasMinted[user] = false;
    }
}
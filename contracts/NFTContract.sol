// SPDX-License-Identifier: MIT
pragma solidity ^0.8.22;

import "@openzeppelin/contracts-upgradeable/token/ERC721/ERC721Upgradeable.sol";
import "@openzeppelin/contracts-upgradeable/token/common/ERC2981Upgradeable.sol";
import "@openzeppelin/contracts-upgradeable/access/AccessControlUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/utils/PausableUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/utils/ReentrancyGuardUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/proxy/utils/Initializable.sol";
import "@openzeppelin/contracts-upgradeable/proxy/utils/UUPSUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/utils/cryptography/EIP712Upgradeable.sol";
import "@openzeppelin/contracts/utils/cryptography/ECDSA.sol";

/**
 * @title NFTContract
 * @dev Production-grade ERC-721 NFT contract with upgradeable pattern and lazy minting
 * @notice This contract implements a feature-rich NFT with royalties, access control, upgradeability, and EIP-712 lazy minting
 */
contract NFTContract is
    Initializable,
    ERC721Upgradeable,
    ERC2981Upgradeable,
    AccessControlUpgradeable,
    PausableUpgradeable,
    ReentrancyGuardUpgradeable,
    UUPSUpgradeable,
    EIP712Upgradeable
{
    using ECDSA for bytes32;
    // ============ State Variables ============

    /// @dev Role identifier for admin operations
    bytes32 public constant ADMIN_ROLE = keccak256("ADMIN_ROLE");
    
    /// @dev Role identifier for minting operations
    bytes32 public constant MINTER_ROLE = keccak256("MINTER_ROLE");

    /// @dev Role identifier for voucher signing operations
    bytes32 public constant SIGNER_ROLE = keccak256("SIGNER_ROLE");

    /// @dev Counter for token IDs
    uint256 private _tokenIdCounter;

    /// @dev Maximum supply of tokens
    uint256 public maxSupply;

    /// @dev Base URI for token metadata
    string private _baseTokenURI;

    /// @dev Mapping to track used voucher nonces to prevent replay attacks
    mapping(address => mapping(uint256 => bool)) private _usedNonces;

    /// @dev EIP-712 typehash for NFTVoucher struct
    bytes32 private constant VOUCHER_TYPEHASH = 
        keccak256("NFTVoucher(uint256 tokenId,uint256 minPrice,string uri,address buyer,uint256 nonce,uint256 expiry)");

    // ============ Structs ============

    /**
     * @dev Voucher structure for lazy minting
     * @param tokenId The ID of the token to be minted
     * @param minPrice Minimum price in wei required to redeem
     * @param uri Metadata URI for the token
     * @param buyer Address authorized to redeem (address(0) for anyone)
     * @param nonce Unique nonce to prevent replay attacks
     * @param expiry Timestamp when voucher expires (0 for no expiry)
     * @param signature EIP-712 signature from authorized signer
     */
    struct NFTVoucher {
        uint256 tokenId;
        uint256 minPrice;
        string uri;
        address buyer;
        uint256 nonce;
        uint256 expiry;
        bytes signature;
    }

    // ============ Events ============

    /// @dev Emitted when a new token is minted
    event TokenMinted(address indexed to, uint256 indexed tokenId, string tokenURI);

    /// @dev Emitted when a token is lazy minted via voucher
    event TokenLazyMinted(
        address indexed redeemer,
        uint256 indexed tokenId,
        uint256 price,
        uint256 nonce
    );

    /// @dev Emitted when base URI is updated
    event BaseURIUpdated(string newBaseURI);

    /// @dev Emitted when max supply is updated
    event MaxSupplyUpdated(uint256 newMaxSupply);

    /// @dev Emitted when royalty info is updated
    event RoyaltyInfoUpdated(address indexed receiver, uint96 feeNumerator);

    /// @dev Emitted when a nonce is invalidated
    event NonceInvalidated(address indexed signer, uint256 nonce);

    // ============ Errors ============

    /// @dev Thrown when max supply is exceeded
    error MaxSupplyExceeded();

    /// @dev Thrown when invalid parameters are provided
    error InvalidParameters();

    /// @dev Thrown when unauthorized upgrade is attempted
    error UnauthorizedUpgrade();

    /// @dev Thrown when signature is invalid
    error InvalidSignature();

    /// @dev Thrown when voucher has expired
    error VoucherExpired();

    /// @dev Thrown when insufficient payment is provided
    error InsufficientPayment();

    /// @dev Thrown when nonce has already been used
    error NonceAlreadyUsed();

    /// @dev Thrown when caller is not authorized buyer
    error UnauthorizedBuyer();

    /// @dev Thrown when token ID is already minted
    error TokenAlreadyMinted();

    // ============ Constructor ============

    /// @custom:oz-upgrades-unsafe-allow constructor
    constructor() {
        _disableInitializers();
    }

    // ============ Initializer ============

    /**
     * @dev Initializes the contract with initial parameters
     * @param name_ Name of the NFT collection
     * @param symbol_ Symbol of the NFT collection
     * @param baseURI_ Base URI for token metadata
     * @param maxSupply_ Maximum supply of tokens
     * @param royaltyReceiver_ Address to receive royalties
     * @param royaltyFeeNumerator_ Royalty fee in basis points (e.g., 500 = 5%)
     */
    function initialize(
        string memory name_,
        string memory symbol_,
        string memory baseURI_,
        uint256 maxSupply_,
        address royaltyReceiver_,
        uint96 royaltyFeeNumerator_
    ) public initializer {
        if (maxSupply_ == 0) revert InvalidParameters();
        if (royaltyReceiver_ == address(0)) revert InvalidParameters();

        __ERC721_init(name_, symbol_);
        __ERC2981_init();
        __AccessControl_init();
        __Pausable_init();
        __ReentrancyGuard_init();
        __UUPSUpgradeable_init();
        __EIP712_init(name_, "1");

        _baseTokenURI = baseURI_;
        maxSupply = maxSupply_;

        // Grant roles to deployer
        _grantRole(DEFAULT_ADMIN_ROLE, msg.sender);
        _grantRole(ADMIN_ROLE, msg.sender);
        _grantRole(MINTER_ROLE, msg.sender);
        _grantRole(SIGNER_ROLE, msg.sender);

        // Set default royalty
        _setDefaultRoyalty(royaltyReceiver_, royaltyFeeNumerator_);
    }

    // ============ Minting Functions ============

    /**
     * @dev Mints a new token to the specified address
     * @param to Address to receive the minted token
     * @return tokenId The ID of the newly minted token
     */
    function mint(address to) 
        public 
        onlyRole(MINTER_ROLE) 
        whenNotPaused 
        nonReentrant 
        returns (uint256) 
    {
        if (to == address(0)) revert InvalidParameters();
        
        uint256 tokenId = _tokenIdCounter;
        if (tokenId >= maxSupply) revert MaxSupplyExceeded();

        _tokenIdCounter++;
        _safeMint(to, tokenId);

        emit TokenMinted(to, tokenId, tokenURI(tokenId));

        return tokenId;
    }

    /**
     * @dev Batch mints multiple tokens to the specified address
     * @param to Address to receive the minted tokens
     * @param quantity Number of tokens to mint
     */
    function batchMint(address to, uint256 quantity)
        external
        onlyRole(MINTER_ROLE)
        whenNotPaused
        nonReentrant
    {
        if (to == address(0) || quantity == 0) revert InvalidParameters();
        if (_tokenIdCounter + quantity > maxSupply) revert MaxSupplyExceeded();

        for (uint256 i = 0; i < quantity; i++) {
            uint256 tokenId = _tokenIdCounter;
            _tokenIdCounter++;
            _safeMint(to, tokenId);
            emit TokenMinted(to, tokenId, tokenURI(tokenId));
        }
    }

    // ============ Lazy Minting Functions ============

    /**
     * @dev Redeems an NFT voucher for an actual NFT, creating it in the process
     * @param voucher The NFTVoucher containing all mint parameters and signature
     * @return tokenId The ID of the newly minted token
     */
    function redeemVoucher(NFTVoucher calldata voucher)
        external
        payable
        whenNotPaused
        nonReentrant
        returns (uint256)
    {
        // Verify voucher hasn't expired
        if (voucher.expiry != 0 && block.timestamp > voucher.expiry) {
            revert VoucherExpired();
        }

        // Verify buyer authorization
        if (voucher.buyer != address(0) && voucher.buyer != msg.sender) {
            revert UnauthorizedBuyer();
        }

        // Verify sufficient payment
        if (msg.value < voucher.minPrice) {
            revert InsufficientPayment();
        }

        // Verify token ID is within bounds
        if (voucher.tokenId >= maxSupply) {
            revert MaxSupplyExceeded();
        }

        // Verify signature and get signer
        address signer = _verifyVoucher(voucher);

        // Verify signer has SIGNER_ROLE
        if (!hasRole(SIGNER_ROLE, signer)) {
            revert InvalidSignature();
        }

        // Check nonce hasn't been used (prevent replay attacks)
        if (_usedNonces[signer][voucher.nonce]) {
            revert NonceAlreadyUsed();
        }

        // Check token hasn't been minted yet
        if (_exists(voucher.tokenId)) {
            revert TokenAlreadyMinted();
        }

        // Mark nonce as used
        _usedNonces[signer][voucher.nonce] = true;

        // Mint the token
        _safeMint(msg.sender, voucher.tokenId);

        emit TokenLazyMinted(msg.sender, voucher.tokenId, msg.value, voucher.nonce);

        return voucher.tokenId;
    }

    /**
     * @dev Verifies the signature on an NFTVoucher
     * @param voucher The voucher to verify
     * @return signer The address that signed the voucher
     */
    function _verifyVoucher(NFTVoucher calldata voucher) 
        internal 
        view 
        returns (address) 
    {
        bytes32 digest = _hashVoucher(voucher);
        address signer = digest.recover(voucher.signature);
        
        if (signer == address(0)) {
            revert InvalidSignature();
        }
        
        return signer;
    }

    /**
     * @dev Generates the EIP-712 hash for a voucher
     * @param voucher The voucher to hash
     * @return The EIP-712 compliant hash
     */
    function _hashVoucher(NFTVoucher calldata voucher) 
        internal 
        view 
        returns (bytes32) 
    {
        return _hashTypedDataV4(
            keccak256(
                abi.encode(
                    VOUCHER_TYPEHASH,
                    voucher.tokenId,
                    voucher.minPrice,
                    keccak256(bytes(voucher.uri)),
                    voucher.buyer,
                    voucher.nonce,
                    voucher.expiry
                )
            )
        );
    }

    /**
     * @dev Returns the EIP-712 domain separator
     * @return The domain separator hash
     */
    function getDomainSeparator() external view returns (bytes32) {
        return _domainSeparatorV4();
    }

    /**
     * @dev Checks if a nonce has been used for a specific signer
     * @param signer The signer address
     * @param nonce The nonce to check
     * @return Whether the nonce has been used
     */
    function isNonceUsed(address signer, uint256 nonce) 
        external 
        view 
        returns (bool) 
    {
        return _usedNonces[signer][nonce];
    }

    /**
     * @dev Invalidates a nonce to prevent its use
     * @param nonce The nonce to invalidate
     */
    function invalidateNonce(uint256 nonce) external {
        _usedNonces[msg.sender][nonce] = true;
        emit NonceInvalidated(msg.sender, nonce);
    }

    /**
     * @dev Verifies a voucher without redeeming it (for testing/validation)
     * @param voucher The voucher to verify
     * @return signer The address that signed the voucher
     * @return isValid Whether the voucher is valid
     */
    function verifyVoucher(NFTVoucher calldata voucher)
        external
        view
        returns (address signer, bool isValid)
    {
        signer = _verifyVoucher(voucher);
        isValid = hasRole(SIGNER_ROLE, signer) && 
                  !_usedNonces[signer][voucher.nonce] &&
                  (voucher.expiry == 0 || block.timestamp <= voucher.expiry) &&
                  !_exists(voucher.tokenId);
    }

    // ============ Admin Functions ============

    /**
     * @dev Updates the base URI for token metadata
     * @param newBaseURI New base URI
     */
    function setBaseURI(string memory newBaseURI) external onlyRole(ADMIN_ROLE) {
        _baseTokenURI = newBaseURI;
        emit BaseURIUpdated(newBaseURI);
    }

    /**
     * @dev Updates the maximum supply (can only increase)
     * @param newMaxSupply New maximum supply
     */
    function setMaxSupply(uint256 newMaxSupply) external onlyRole(ADMIN_ROLE) {
        if (newMaxSupply < _tokenIdCounter) revert InvalidParameters();
        maxSupply = newMaxSupply;
        emit MaxSupplyUpdated(newMaxSupply);
    }

    /**
     * @dev Updates the default royalty information
     * @param receiver Address to receive royalties
     * @param feeNumerator Royalty fee in basis points
     */
    function setDefaultRoyalty(address receiver, uint96 feeNumerator) 
        external 
        onlyRole(ADMIN_ROLE) 
    {
        if (receiver == address(0)) revert InvalidParameters();
        _setDefaultRoyalty(receiver, feeNumerator);
        emit RoyaltyInfoUpdated(receiver, feeNumerator);
    }

    /**
     * @dev Sets royalty information for a specific token
     * @param tokenId Token ID
     * @param receiver Address to receive royalties
     * @param feeNumerator Royalty fee in basis points
     */
    function setTokenRoyalty(
        uint256 tokenId,
        address receiver,
        uint96 feeNumerator
    ) external onlyRole(ADMIN_ROLE) {
        if (receiver == address(0)) revert InvalidParameters();
        _setTokenRoyalty(tokenId, receiver, feeNumerator);
        emit RoyaltyInfoUpdated(receiver, feeNumerator);
    }

    /**
     * @dev Pauses all token transfers and minting
     */
    function pause() external onlyRole(ADMIN_ROLE) {
        _pause();
    }

    /**
     * @dev Unpauses all token transfers and minting
     */
    function unpause() external onlyRole(ADMIN_ROLE) {
        _unpause();
    }

    // ============ View Functions ============

    /**
     * @dev Returns the total number of tokens minted
     * @return Total supply
     */
    function totalSupply() public view returns (uint256) {
        return _tokenIdCounter;
    }

    /**
     * @dev Returns the base URI for token metadata
     * @return Base URI string
     */
    function _baseURI() internal view virtual override returns (string memory) {
        return _baseTokenURI;
    }

    /**
     * @dev Override to support custom token URIs from vouchers
     * @param tokenId Token ID to get URI for
     * @return Token URI string
     */
    function tokenURI(uint256 tokenId)
        public
        view
        virtual
        override
        returns (string memory)
    {
        _requireOwned(tokenId);
        return super.tokenURI(tokenId);
    }

    /**
     * @dev Checks if a token exists
     * @param tokenId Token ID to check
     * @return Whether the token exists
     */
    function _exists(uint256 tokenId) internal view returns (bool) {
        return _ownerOf(tokenId) != address(0);
    }

    /**
     * @dev Withdraw contract balance to admin
     */
    function withdraw() external onlyRole(ADMIN_ROLE) nonReentrant {
        uint256 balance = address(this).balance;
        if (balance == 0) revert InvalidParameters();
        
        (bool success, ) = payable(msg.sender).call{value: balance}("");
        if (!success) revert InvalidParameters();
    }

    // ============ Overrides ============

    /**
     * @dev Hook that is called before any token transfer
     * @param to Address tokens are transferred to
     * @param tokenId Token ID being transferred
     * @param auth Address authorized to transfer
     */
    function _update(
        address to,
        uint256 tokenId,
        address auth
    ) internal virtual override whenNotPaused returns (address) {
        return super._update(to, tokenId, auth);
    }

    /**
     * @dev See {IERC165-supportsInterface}
     */
    function supportsInterface(bytes4 interfaceId)
        public
        view
        virtual
        override(ERC721Upgradeable, ERC2981Upgradeable, AccessControlUpgradeable)
        returns (bool)
    {
        return super.supportsInterface(interfaceId);
    }

    /**
     * @dev Authorizes contract upgrades (UUPS pattern)
     * @param newImplementation Address of new implementation
     */
    function _authorizeUpgrade(address newImplementation)
        internal
        override
        onlyRole(ADMIN_ROLE)
    {
        if (newImplementation == address(0)) revert UnauthorizedUpgrade();
    }
}

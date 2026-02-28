// SPDX-License-Identifier: MIT
pragma solidity ^0.8.22;

import "@openzeppelin/contracts-upgradeable/utils/ReentrancyGuardUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/access/AccessControlUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/utils/PausableUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/proxy/utils/Initializable.sol";
import "@openzeppelin/contracts-upgradeable/proxy/utils/UUPSUpgradeable.sol";
import "@openzeppelin/contracts/token/ERC721/IERC721.sol";
import "@openzeppelin/contracts-upgradeable/token/common/ERC2981Upgradeable.sol";
import "@openzeppelin/contracts/interfaces/IERC2981.sol";
import "@openzeppelin/contracts/utils/introspection/IERC165.sol";

/**
 * @title NFTMarketplace
 * @dev Production-grade NFT marketplace with fixed price listings and auctions
 * @notice Supports ERC721 NFTs with automatic royalty distribution and marketplace fees
 */
contract NFTMarketplace is
    Initializable,
    ReentrancyGuardUpgradeable,
    AccessControlUpgradeable,
    PausableUpgradeable,
    UUPSUpgradeable
{
    // ============ Roles ============

    bytes32 public constant ADMIN_ROLE = keccak256("ADMIN_ROLE");

    // ============ Structs ============

    /**
     * @dev Fixed price listing structure
     */
    struct Listing {
        address nftContract;
        uint256 tokenId;
        address seller;
        uint256 price;
        bool active;
    }

    /**
     * @dev Auction structure
     */
    struct Auction {
        address nftContract;
        uint256 tokenId;
        address seller;
        uint256 startPrice;
        uint256 currentBid;
        address currentBidder;
        uint256 startTime;
        uint256 endTime;
        bool active;
    }

    // ============ State Variables ============

    /// @dev Marketplace fee in basis points (e.g., 250 = 2.5%)
    uint256 public marketplaceFee;

    /// @dev Address to receive marketplace fees
    address public feeRecipient;

    /// @dev Mapping from listing ID to Listing
    mapping(uint256 => Listing) public listings;

    /// @dev Mapping from auction ID to Auction
    mapping(uint256 => Auction) public auctions;

    /// @dev Counter for listing IDs
    uint256 private _listingIdCounter;

    /// @dev Counter for auction IDs
    uint256 private _auctionIdCounter;

    /// @dev Mapping to track NFT contract => tokenId => listing ID
    mapping(address => mapping(uint256 => uint256)) public nftToListingId;

    /// @dev Mapping to track NFT contract => tokenId => auction ID
    mapping(address => mapping(uint256 => uint256)) public nftToAuctionId;

    // ============ Constants ============

    /// @dev Maximum marketplace fee (10%)
    uint256 public constant MAX_MARKETPLACE_FEE = 1000;

    /// @dev Basis points denominator
    uint256 public constant BASIS_POINTS = 10000;

    // ============ Events ============

    /// @dev Emitted when a new listing is created
    event ListingCreated(
        uint256 indexed listingId,
        address indexed nftContract,
        uint256 indexed tokenId,
        address seller,
        uint256 price
    );

    /// @dev Emitted when a listing is cancelled
    event ListingCancelled(uint256 indexed listingId);

    /// @dev Emitted when a listing is purchased
    event ListingPurchased(
        uint256 indexed listingId,
        address indexed buyer,
        uint256 price,
        uint256 marketplaceFeeAmount,
        uint256 royaltyAmount
    );

    /// @dev Emitted when a listing price is updated
    event ListingPriceUpdated(uint256 indexed listingId, uint256 newPrice);

    /// @dev Emitted when a new auction is created
    event AuctionCreated(
        uint256 indexed auctionId,
        address indexed nftContract,
        uint256 indexed tokenId,
        address seller,
        uint256 startPrice,
        uint256 startTime,
        uint256 endTime
    );

    /// @dev Emitted when a bid is placed
    event BidPlaced(
        uint256 indexed auctionId,
        address indexed bidder,
        uint256 bidAmount,
        uint256 timestamp
    );

    /// @dev Emitted when an auction is finalized
    event AuctionFinalized(
        uint256 indexed auctionId,
        address indexed winner,
        uint256 finalPrice,
        uint256 marketplaceFeeAmount,
        uint256 royaltyAmount
    );

    /// @dev Emitted when an auction is cancelled
    event AuctionCancelled(uint256 indexed auctionId);

    /// @dev Emitted when marketplace fee is updated
    event MarketplaceFeeUpdated(uint256 newFee);

    /// @dev Emitted when fee recipient is updated
    event FeeRecipientUpdated(address indexed newRecipient);

    // ============ Errors ============

    error InvalidParameters();
    error NotTokenOwner();
    error NotApproved();
    error ListingNotActive();
    error AuctionNotActive();
    error InsufficientPayment();
    error AuctionNotEnded();
    error AuctionEnded();
    error BidTooLow();
    error NotSeller();
    error TransferFailed();
    error NoActiveListing();
    error NoActiveAuction();
    error CannotBidOnOwnAuction();

    // ============ Constructor ============

    /// @custom:oz-upgrades-unsafe-allow constructor
    constructor() {
        _disableInitializers();
    }

    // ============ Initializer ============

    /**
     * @dev Initializes the marketplace contract
     * @param marketplaceFee_ Initial marketplace fee in basis points
     * @param feeRecipient_ Address to receive marketplace fees
     */
    function initialize(uint256 marketplaceFee_, address feeRecipient_)
        public
        initializer
    {
        if (marketplaceFee_ > MAX_MARKETPLACE_FEE) revert InvalidParameters();
        if (feeRecipient_ == address(0)) revert InvalidParameters();

        __ReentrancyGuard_init();
        __AccessControl_init();
        __Pausable_init();
        __UUPSUpgradeable_init();

        marketplaceFee = marketplaceFee_;
        feeRecipient = feeRecipient_;

        _grantRole(DEFAULT_ADMIN_ROLE, msg.sender);
        _grantRole(ADMIN_ROLE, msg.sender);
    }

    // ============ Fixed Price Listing Functions ============

    /**
     * @dev Creates a new fixed price listing
     * @param nftContract Address of the NFT contract
     * @param tokenId Token ID to list
     * @param price Listing price in wei
     * @return listingId The ID of the created listing
     */
    function createListing(
        address nftContract,
        uint256 tokenId,
        uint256 price
    ) external whenNotPaused nonReentrant returns (uint256) {
        if (nftContract == address(0) || price == 0) revert InvalidParameters();

        IERC721 nft = IERC721(nftContract);

        // Verify ownership
        if (nft.ownerOf(tokenId) != msg.sender) revert NotTokenOwner();

        // Verify approval
        if (
            nft.getApproved(tokenId) != address(this) &&
            !nft.isApprovedForAll(msg.sender, address(this))
        ) revert NotApproved();

        // Check for existing active listing
        uint256 existingListingId = nftToListingId[nftContract][tokenId];
        if (existingListingId != 0 && listings[existingListingId].active) {
            revert InvalidParameters();
        }

        uint256 listingId = _listingIdCounter++;

        listings[listingId] = Listing({
            nftContract: nftContract,
            tokenId: tokenId,
            seller: msg.sender,
            price: price,
            active: true
        });

        nftToListingId[nftContract][tokenId] = listingId;

        emit ListingCreated(listingId, nftContract, tokenId, msg.sender, price);

        return listingId;
    }

    /**
     * @dev Purchases an NFT from a fixed price listing
     * @param listingId ID of the listing to purchase
     */
    function purchaseListing(uint256 listingId)
        external
        payable
        whenNotPaused
        nonReentrant
    {
        Listing storage listing = listings[listingId];

        if (!listing.active) revert ListingNotActive();
        if (msg.value < listing.price) revert InsufficientPayment();

        // Mark listing as inactive
        listing.active = false;

        // Transfer NFT to buyer
        IERC721(listing.nftContract).safeTransferFrom(
            listing.seller,
            msg.sender,
            listing.tokenId
        );

        // Distribute payment
        (uint256 marketplaceFeeAmount, uint256 royaltyAmount) = _distributePayment(
            listing.nftContract,
            listing.tokenId,
            listing.seller,
            listing.price
        );

        emit ListingPurchased(
            listingId,
            msg.sender,
            listing.price,
            marketplaceFeeAmount,
            royaltyAmount
        );

        // Refund excess payment
        if (msg.value > listing.price) {
            _transferETH(msg.sender, msg.value - listing.price);
        }
    }

    /**
     * @dev Cancels a listing
     * @param listingId ID of the listing to cancel
     */
    function cancelListing(uint256 listingId) external nonReentrant {
        Listing storage listing = listings[listingId];

        if (!listing.active) revert ListingNotActive();
        if (listing.seller != msg.sender) revert NotSeller();

        listing.active = false;

        emit ListingCancelled(listingId);
    }

    /**
     * @dev Updates the price of a listing
     * @param listingId ID of the listing to update
     * @param newPrice New price in wei
     */
    function updateListingPrice(uint256 listingId, uint256 newPrice)
        external
        nonReentrant
    {
        if (newPrice == 0) revert InvalidParameters();

        Listing storage listing = listings[listingId];

        if (!listing.active) revert ListingNotActive();
        if (listing.seller != msg.sender) revert NotSeller();

        listing.price = newPrice;

        emit ListingPriceUpdated(listingId, newPrice);
    }

    // ============ Auction Functions ============

    /**
     * @dev Creates a new English auction
     * @param nftContract Address of the NFT contract
     * @param tokenId Token ID to auction
     * @param startPrice Starting price in wei
     * @param duration Auction duration in seconds
     * @return auctionId The ID of the created auction
     */
    function createAuction(
        address nftContract,
        uint256 tokenId,
        uint256 startPrice,
        uint256 duration
    ) external whenNotPaused nonReentrant returns (uint256) {
        if (nftContract == address(0) || startPrice == 0 || duration == 0) {
            revert InvalidParameters();
        }

        IERC721 nft = IERC721(nftContract);

        // Verify ownership
        if (nft.ownerOf(tokenId) != msg.sender) revert NotTokenOwner();

        // Verify approval
        if (
            nft.getApproved(tokenId) != address(this) &&
            !nft.isApprovedForAll(msg.sender, address(this))
        ) revert NotApproved();

        // Check for existing active auction
        uint256 existingAuctionId = nftToAuctionId[nftContract][tokenId];
        if (existingAuctionId != 0 && auctions[existingAuctionId].active) {
            revert InvalidParameters();
        }

        uint256 auctionId = _auctionIdCounter++;
        uint256 startTime = block.timestamp;
        uint256 endTime = startTime + duration;

        auctions[auctionId] = Auction({
            nftContract: nftContract,
            tokenId: tokenId,
            seller: msg.sender,
            startPrice: startPrice,
            currentBid: 0,
            currentBidder: address(0),
            startTime: startTime,
            endTime: endTime,
            active: true
        });

        nftToAuctionId[nftContract][tokenId] = auctionId;

        emit AuctionCreated(
            auctionId,
            nftContract,
            tokenId,
            msg.sender,
            startPrice,
            startTime,
            endTime
        );

        return auctionId;
    }

    /**
     * @dev Places a bid on an auction
     * @param auctionId ID of the auction to bid on
     */
    function placeBid(uint256 auctionId)
        external
        payable
        whenNotPaused
        nonReentrant
    {
        Auction storage auction = auctions[auctionId];

        if (!auction.active) revert AuctionNotActive();
        if (block.timestamp >= auction.endTime) revert AuctionEnded();
        if (msg.sender == auction.seller) revert CannotBidOnOwnAuction();

        // Check bid amount
        uint256 minBid = auction.currentBid == 0
            ? auction.startPrice
            : auction.currentBid + _calculateMinBidIncrement(auction.currentBid);

        if (msg.value < minBid) revert BidTooLow();

        // Refund previous bidder
        if (auction.currentBidder != address(0)) {
            _transferETH(auction.currentBidder, auction.currentBid);
        }

        // Update auction state
        auction.currentBid = msg.value;
        auction.currentBidder = msg.sender;

        emit BidPlaced(auctionId, msg.sender, msg.value, block.timestamp);
    }

    /**
     * @dev Finalizes an auction and transfers NFT to winner
     * @param auctionId ID of the auction to finalize
     */
    function finalizeAuction(uint256 auctionId) external nonReentrant {
        Auction storage auction = auctions[auctionId];

        if (!auction.active) revert AuctionNotActive();
        if (block.timestamp < auction.endTime) revert AuctionNotEnded();

        auction.active = false;

        // If no bids, return NFT to seller
        if (auction.currentBidder == address(0)) {
            emit AuctionCancelled(auctionId);
            return;
        }

        // Transfer NFT to winner
        IERC721(auction.nftContract).safeTransferFrom(
            auction.seller,
            auction.currentBidder,
            auction.tokenId
        );

        // Distribute payment
        (uint256 marketplaceFeeAmount, uint256 royaltyAmount) = _distributePayment(
            auction.nftContract,
            auction.tokenId,
            auction.seller,
            auction.currentBid
        );

        emit AuctionFinalized(
            auctionId,
            auction.currentBidder,
            auction.currentBid,
            marketplaceFeeAmount,
            royaltyAmount
        );
    }

    /**
     * @dev Cancels an auction (only if no bids)
     * @param auctionId ID of the auction to cancel
     */
    function cancelAuction(uint256 auctionId) external nonReentrant {
        Auction storage auction = auctions[auctionId];

        if (!auction.active) revert AuctionNotActive();
        if (auction.seller != msg.sender) revert NotSeller();
        if (auction.currentBidder != address(0)) revert InvalidParameters();

        auction.active = false;

        emit AuctionCancelled(auctionId);
    }

    // ============ Internal Functions ============

    /**
     * @dev Distributes payment with marketplace fee and royalties
     * @param nftContract Address of the NFT contract
     * @param tokenId Token ID
     * @param seller Seller address
     * @param salePrice Sale price
     * @return marketplaceFeeAmount Amount paid as marketplace fee
     * @return royaltyAmount Amount paid as royalty
     */
    function _distributePayment(
        address nftContract,
        uint256 tokenId,
        address seller,
        uint256 salePrice
    ) internal returns (uint256 marketplaceFeeAmount, uint256 royaltyAmount) {
        // Calculate marketplace fee
        marketplaceFeeAmount = (salePrice * marketplaceFee) / BASIS_POINTS;

        // Calculate and distribute royalty
        royaltyAmount = 0;
        address royaltyReceiver = address(0);

        // Check if contract supports ERC2981
        if (_supportsERC2981(nftContract)) {
            try
                IERC2981(nftContract).royaltyInfo(tokenId, salePrice)
            returns (address receiver, uint256 royaltyAmountCalc) {
                royaltyReceiver = receiver;
                royaltyAmount = royaltyAmountCalc;
            } catch {
                // If royaltyInfo fails, continue without royalty
            }
        }

        // Calculate seller proceeds
        uint256 sellerProceeds = salePrice - marketplaceFeeAmount - royaltyAmount;

        // Transfer marketplace fee
        if (marketplaceFeeAmount > 0) {
            _transferETH(feeRecipient, marketplaceFeeAmount);
        }

        // Transfer royalty
        if (royaltyAmount > 0 && royaltyReceiver != address(0)) {
            _transferETH(royaltyReceiver, royaltyAmount);
        }

        // Transfer seller proceeds
        if (sellerProceeds > 0) {
            _transferETH(seller, sellerProceeds);
        }
    }

    /**
     * @dev Calculates minimum bid increment (5% of current bid)
     * @param currentBid Current highest bid
     * @return Minimum increment amount
     */
    function _calculateMinBidIncrement(uint256 currentBid)
        internal
        pure
        returns (uint256)
    {
        return (currentBid * 500) / BASIS_POINTS; // 5%
    }

    /**
     * @dev Transfers ETH safely
     * @param to Recipient address
     * @param amount Amount to transfer
     */
    function _transferETH(address to, uint256 amount) internal {
        (bool success, ) = payable(to).call{value: amount}("");
        if (!success) revert TransferFailed();
    }

    /**
     * @dev Checks if contract supports ERC2981
     * @param nftContract Address to check
     * @return Whether the contract supports ERC2981
     */
    function _supportsERC2981(address nftContract) internal view returns (bool) {
        try
            IERC165(nftContract).supportsInterface(
                type(IERC2981).interfaceId
            )
        returns (bool supported) {
            return supported;
        } catch {
            return false;
        }
    }

    // ============ Admin Functions ============

    /**
     * @dev Updates the marketplace fee
     * @param newFee New fee in basis points
     */
    function setMarketplaceFee(uint256 newFee) external onlyRole(ADMIN_ROLE) {
        if (newFee > MAX_MARKETPLACE_FEE) revert InvalidParameters();
        marketplaceFee = newFee;
        emit MarketplaceFeeUpdated(newFee);
    }

    /**
     * @dev Updates the fee recipient address
     * @param newRecipient New recipient address
     */
    function setFeeRecipient(address newRecipient)
        external
        onlyRole(ADMIN_ROLE)
    {
        if (newRecipient == address(0)) revert InvalidParameters();
        feeRecipient = newRecipient;
        emit FeeRecipientUpdated(newRecipient);
    }

    /**
     * @dev Pauses the marketplace
     */
    function pause() external onlyRole(ADMIN_ROLE) {
        _pause();
    }

    /**
     * @dev Unpauses the marketplace
     */
    function unpause() external onlyRole(ADMIN_ROLE) {
        _unpause();
    }

    // ============ View Functions ============

    /**
     * @dev Gets listing details
     * @param listingId Listing ID
     * @return Listing struct
     */
    function getListing(uint256 listingId)
        external
        view
        returns (Listing memory)
    {
        return listings[listingId];
    }

    /**
     * @dev Gets auction details
     * @param auctionId Auction ID
     * @return Auction struct
     */
    function getAuction(uint256 auctionId)
        external
        view
        returns (Auction memory)
    {
        return auctions[auctionId];
    }

    /**
     * @dev Gets total number of listings created
     * @return Total listing count
     */
    function getTotalListings() external view returns (uint256) {
        return _listingIdCounter;
    }

    /**
     * @dev Gets total number of auctions created
     * @return Total auction count
     */
    function getTotalAuctions() external view returns (uint256) {
        return _auctionIdCounter;
    }

    // ============ UUPS Upgrade ============

    /**
     * @dev Authorizes contract upgrades
     * @param newImplementation Address of new implementation
     */
    function _authorizeUpgrade(address newImplementation)
        internal
        override
        onlyRole(ADMIN_ROLE)
    {
        if (newImplementation == address(0)) revert InvalidParameters();
    }

    // ============ Receive Function ============

    receive() external payable {
        revert InvalidParameters();
    }
}



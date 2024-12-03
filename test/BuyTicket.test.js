const { expect } = require("chai");
const { ethers } = require("hardhat");

describe("CompanyLotteries - buyTicketTx", function () {
  let companyLotteries;
  let mockToken;
  let owner;
  let buyer;
  let otherUser;
  let lotteryNo;

  const TICKET_PRICE = ethers.parseEther("10");
  const NUM_TICKETS = 100;
  const NUM_WINNERS = 5;
  const MIN_PERCENTAGE = 20;

  beforeEach(async function () {
    // Get signers
    [owner, buyer, otherUser] = await ethers.getSigners();

    // Deploy mock ERC20 token
    const MockTokenFactory = await ethers.getContractFactory("MockERC20");
    mockToken = await MockTokenFactory.deploy();

    // Deploy lottery contract
    const CompanyLotteriesFactory = await ethers.getContractFactory(
      "CompanyLotteries"
    );
    companyLotteries = await CompanyLotteriesFactory.deploy();

    // Create a lottery
    const futureTimestamp = Math.floor(Date.now() / 1000) + 3600; // 1 hour from now

    // Create lottery
    const tx = await companyLotteries
      .connect(owner)
      .createLottery(
        futureTimestamp,
        NUM_TICKETS,
        NUM_WINNERS,
        MIN_PERCENTAGE,
        TICKET_PRICE,
        ethers.encodeBytes32String("htmlhash"),
        "https://example.com"
      );

    const receipt = await tx.wait();
    const logs = receipt?.logs;
    const lotteryCreatedLog = logs?.find(
      (log) => log.fragment?.name === "LotteryCreated"
    );
    lotteryNo = lotteryCreatedLog?.args?.[0];

    // Set payment token for the lottery
    await companyLotteries.connect(owner).setPaymentToken(mockToken.target);

    // Prepare token for buyer
    await mockToken.mint(buyer.address, ethers.parseEther("1000"));
    await mockToken
      .connect(buyer)
      .approve(companyLotteries.target, ethers.parseEther("1000"));
  });

  describe("Successful Ticket Purchase", function () {
    it("should allow buying tickets within valid parameters", async function () {
      const quantity = 5;
      //   const randomHash = ethers.randomBytes(32);
      const randomHash = ethers.keccak256(ethers.toUtf8Bytes("1"));

      // Buy tickets
      const tx = await companyLotteries
        .connect(buyer)
        .buyTicketTx(lotteryNo, quantity, randomHash);
      const receipt = await tx.wait();

      // Check TicketPurchased event
      const purchaseEvent = receipt?.logs.find(
        (log) => log.fragment?.name === "TicketPurchased"
      );
      expect(purchaseEvent).to.exist;
      expect(purchaseEvent?.args?.[0]).to.equal(lotteryNo);
      expect(purchaseEvent?.args?.[1]).to.equal(buyer.address);
      expect(purchaseEvent?.args?.[3]).to.equal(quantity);

      // Verify token transfer
      const totalCost = TICKET_PRICE * BigInt(quantity);
      const buyerBalance = await mockToken.balanceOf(buyer.address);
      expect(await mockToken.balanceOf(companyLotteries.target)).to.equal(
        totalCost
      );
    });

    it("should allow multiple ticket purchases within limit", async function () {
      const firstPurchase = 20;
      const secondPurchase = 10;
      const randomHash1 = ethers.randomBytes(32);
      const randomHash2 = ethers.randomBytes(32);

      // First purchase
      await companyLotteries
        .connect(buyer)
        .buyTicketTx(lotteryNo, firstPurchase, randomHash1);

      // Second purchase
      await companyLotteries
        .connect(buyer)
        .buyTicketTx(lotteryNo, secondPurchase, randomHash2);

      // Verify total tickets purchased
      const totalPurchased = firstPurchase + secondPurchase;
      const totalCost = TICKET_PRICE * BigInt(totalPurchased);
      expect(await mockToken.balanceOf(companyLotteries.target)).to.equal(
        totalCost
      );
    });
  });

  describe("Purchase Restrictions", function () {
    it("should revert if purchasing outside of purchase phase", async function () {
      // Fast forward past purchase phase
      await ethers.provider.send("evm_increaseTime", [3601]);
      await ethers.provider.send("evm_mine", []);

      const quantity = 5;
      const randomHash = ethers.randomBytes(32);

      await expect(
        companyLotteries
          .connect(buyer)
          .buyTicketTx(lotteryNo, quantity, randomHash)
      ).to.be.revertedWith("Purchase phase has ended!");
    });
  });
});

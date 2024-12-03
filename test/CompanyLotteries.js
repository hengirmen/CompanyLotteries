const { expect } = require("chai");
const { ethers } = require("hardhat");

describe("CompanyLotteries", function () {
  let CompanyLotteries, companyLotteries, MyToken, myToken, owner, buyer, buyer2;

  beforeEach(async () => {
    [owner, buyer, buyer2] = await ethers.getSigners();

    // Deploy MyToken contract
    MyToken = await ethers.getContractFactory("MyToken");
    myToken = await MyToken.deploy();
    await myToken.waitForDeployment();

    // Mint tokens to the buyer
    await myToken.connect(owner).mint(buyer.address, ethers.parseEther("1000"));

    await myToken.connect(owner).mint(buyer2.address, ethers.parseEther("1000"));

    // Deploy the CompanyLotteries contract
    CompanyLotteries = await ethers.getContractFactory("CompanyLotteries");
    companyLotteries = await CompanyLotteries.deploy();
    await companyLotteries.waitForDeployment();

    // Set the payment token in the contract
    // await companyLotteries.connect(owner).setPaymentToken(myToken.getAddress());
  });

  describe('createLottery', () => {
    let unixbeg, nooftickets, noofwinners, minpercentage, ticketprice, htmlhash, url;

    beforeEach(() => {
      unixbeg = Math.floor(Date.now() / 1000) + 3600; // 1 hour from now
      nooftickets = 100;
      noofwinners = 10;
      minpercentage = 50;
      ticketprice = ethers.parseEther('0.1');
      htmlhash = ethers.encodeBytes32String('test');
      url = 'node101.io';
    });

    it('should create a new lottery with LotteryCreated event emitted and return the lottery id as 1', async () => {
      await expect(
        companyLotteries.connect(owner).createLottery(
          unixbeg,
          nooftickets,
          noofwinners,
          minpercentage,
          ticketprice,
          htmlhash,
          url
        )
      )
        .to.emit(companyLotteries, 'LotteryCreated')
        .withArgs(
          1,
          unixbeg,
          nooftickets,
          noofwinners,
          minpercentage,
          ticketprice,
          htmlhash,
          url,
          ethers.ZeroAddress,
          owner.address
        );
    });

    it('should not create a new lottery if the ticket price is zero', async () => {
      ticketprice = 0;

      await expect(
        companyLotteries.connect(owner).createLottery(
          unixbeg,
          nooftickets,
          noofwinners,
          minpercentage,
          ticketprice,
          htmlhash,
          url
        )
      ).to.be.revertedWith('Ticket price must be greater than zero!');
    });

    it('should not create a new lottery if the number of tickets is zero', async () => {
      nooftickets = 0;

      await expect(
        companyLotteries.connect(owner).createLottery(
          unixbeg,
          nooftickets,
          noofwinners,
          minpercentage,
          ticketprice,
          htmlhash,
          url
        )
      ).to.be.revertedWith('Number of tickets must be greater than zero!');
    });

    it('should not create a new lottery if the number of winners is zero', async () => {
      noofwinners = 0;

      await expect(
        companyLotteries.connect(owner).createLottery(
          unixbeg,
          nooftickets,
          noofwinners,
          minpercentage,
          ticketprice,
          htmlhash,
          url
        )
      ).to.be.revertedWith('Number of winners must be greater than zero and less than or equal to number of tickets!');
    });

    it('should not create a new lottery if the number of winners is greater than the number of tickets', async () => {
      noofwinners = nooftickets + 1;

      await expect(
        companyLotteries.connect(owner).createLottery(
          unixbeg,
          nooftickets,
          noofwinners,
          minpercentage,
          ticketprice,
          htmlhash,
          url
        )
      ).to.be.revertedWith('Number of winners must be greater than zero and less than or equal to number of tickets!');
    });

    it('should not create a new lottery if the minimum percentage is greater than 100', async () => {
      minpercentage = 101;

      await expect(
        companyLotteries.connect(owner).createLottery(
          unixbeg,
          nooftickets,
          noofwinners,
          minpercentage,
          ticketprice,
          htmlhash,
          url
        )
      ).to.be.revertedWith('Minimum percentage must be greater than 0 and less than or equal to 100!');
    });

    it('should not create a new lottery if the minimum percentage is zero', async () => {
      minpercentage = 0;

      await expect(
        companyLotteries.connect(owner).createLottery(
          unixbeg,
          nooftickets,
          noofwinners,
          minpercentage,
          ticketprice,
          htmlhash,
          url
        )
      ).to.be.revertedWith('Minimum percentage must be greater than 0 and less than or equal to 100!');
    });
  });

  describe('buyTicketTx', () => {
    let unixbeg, nooftickets, noofwinners, minpercentage, ticketprice, htmlhash, url;

    beforeEach(async () => {
      unixbeg = Math.floor(Date.now() / 1000) + 3600; // 1 hour from now
      nooftickets = 29;
      noofwinners = 10;
      minpercentage = 50;
      ticketprice = ethers.parseEther('0.1');
      htmlhash = ethers.encodeBytes32String('test');
      url = 'node101.io';

      // Create a lottery
      await companyLotteries.connect(owner).createLottery(
        unixbeg,
        nooftickets,
        noofwinners,
        minpercentage,
        ticketprice,
        htmlhash,
        url
      );
    });

    it('should buy one ticket for the lottery with the given id and emit TicketPurchased event', async () => {
      await myToken.connect(buyer).approve(
        companyLotteries.getAddress(),
        ticketprice
      );

      expect(await companyLotteries.connect(buyer).buyTicketTx(
        1,
        1,
        '0x8ff97419363ffd7000167f130ef7168fbea05faf9251824ca5043f113cc6a7c7'
      ))
        .to.emit(companyLotteries, 'TicketPurchased')
        .withArgs(
          1, // lottery no
          buyer.address, // buyer
          1, // sticket no
          1 // quantity
        );
    });

    it('should not buy a ticket if the random number is zero', async () => {
      await myToken.connect(buyer).approve(
        companyLotteries.getAddress(),
        ticketprice
      );

      await expect(
        companyLotteries.connect(buyer).buyTicketTx(
          1,
          1,
          '0x0000000000000000000000000000000000000000000000000000000000000000'
        )
      ).to.be.revertedWith('Random number must not be zero!');
    });

    it('should not buy a ticket if the lottery does not exist', async () => {
      await myToken.connect(buyer).approve(
        companyLotteries.getAddress(),
        ticketprice
      );

      await expect(
        companyLotteries.connect(buyer).buyTicketTx(
          99, // Non-existent lottery ID
          1,
          '0x8ff97419363ffd7000167f130ef7168fbea05faf9251824ca5043f113cc6a7c7'
        )
      ).to.be.revertedWith('Lottery does not exist!');
    });

    it('should not buy a ticket if the quantity is zero', async () => {
      await myToken.connect(buyer).approve(
        companyLotteries.getAddress(),
        ticketprice
      );

      await expect(
        companyLotteries.connect(buyer).buyTicketTx(
          1,
          0, // Invalid quantity
          '0x8ff97419363ffd7000167f130ef7168fbea05faf9251824ca5043f113cc6a7c7'
        )
      ).to.be.revertedWith('Quantity must be greater than zero and less than or equal to 30!');
    });

    it('should not buy a ticket if the quantity is greater than 30', async () => {
      await myToken.connect(buyer).approve(
        companyLotteries.getAddress(),
        ticketprice
      );

      await expect(
        companyLotteries.connect(buyer).buyTicketTx(
          1,
          31, // Invalid quantity
          '0x8ff97419363ffd7000167f130ef7168fbea05faf9251824ca5043f113cc6a7c7'
        )
      ).to.be.revertedWith('Quantity must be greater than zero and less than or equal to 30!');
    });

    it('should not buy a ticket if the requested quantity is greater than the remaining tickets', async () => {
      await myToken.connect(buyer).approve(
        companyLotteries.getAddress(),
        ethers.parseEther('2.1') // Approve enough for the invalid quantity
      );

      await expect(
        companyLotteries.connect(buyer).buyTicketTx(
          1,
          30, // More than remaining tickets
          '0x8ff97419363ffd7000167f130ef7168fbea05faf9251824ca5043f113cc6a7c7'
        )
      ).to.be.revertedWith('Not enough tickets left!');
    });

    it('should not buy a ticket if the purchase phase has ended', async () => {
      await myToken.connect(buyer).approve(
        companyLotteries.getAddress(),
        ticketprice
      );

      await ethers.provider.send('evm_increaseTime', [1801]); // 30 minutes later

      await expect(
        companyLotteries.connect(buyer).buyTicketTx(
          1,
          1,
          '0x8ff97419363ffd7000167f130ef7168fbea05faf9251824ca5043f113cc6a7c7'
        )
      ).to.be.revertedWith('Purchase phase has ended!');
    });
  });

  describe('revealRndNumberTx', () => {
    let unixbeg, nooftickets, noofwinners, minpercentage, ticketprice, htmlhash, url;
    let snapshotId;

    beforeEach(async () => {
      // Take a snapshot of the blockchain state
      snapshotId = await ethers.provider.send('evm_snapshot', []);

      const currentTimestamp = (await ethers.provider.getBlock('latest')).timestamp;

      unixbeg = currentTimestamp + 3600; // 1 hour from the current block timestamp
      nooftickets = 100;
      noofwinners = 10;
      minpercentage = 50;
      ticketprice = ethers.parseEther('0.1');
      htmlhash = ethers.encodeBytes32String('test');
      url = 'node101.io';

      // Create a lottery
      await companyLotteries.connect(owner).createLottery(
        unixbeg,
        nooftickets,
        noofwinners,
        minpercentage,
        ticketprice,
        htmlhash,
        url
      );

      // Approve tokens for the buyer
      await myToken.connect(buyer).approve(
        companyLotteries.getAddress(),
        ethers.parseEther('1.0') // Approve more than enough
      );

      // Buy a ticket
      await companyLotteries.connect(buyer).buyTicketTx(
        1,
        1,
        '0x8ff97419363ffd7000167f130ef7168fbea05faf9251824ca5043f113cc6a7c7'
      );
    });

    afterEach(async () => {
      // Revert to the snapshot to reset the blockchain state
      await ethers.provider.send('evm_revert', [snapshotId]);
    });

    it('should not reveal the random number if the lottery does not exist', async () => {
      await expect(
        companyLotteries.connect(buyer).revealRndNumberTx(
          99, // Non-existent lottery ID
          1,
          1,
          101
        )
      ).to.be.revertedWith('Lottery does not exist!');
    });

    it('should not reveal the random number if the reveal phase has not started', async () => {
      await expect(
        companyLotteries.connect(buyer).revealRndNumberTx(
          1,
          1,
          1,
          101
        )
      ).to.be.revertedWith('Reveal phase has not started yet!');
    });

    it('should reveal the random number for the ticket with the given id and emit RandomNumberRevealed event', async () => {
      await ethers.provider.send('evm_increaseTime', [1801]); // 30 minutes later
      await ethers.provider.send('evm_mine'); // Ensure time increment

      expect(await companyLotteries.connect(buyer).revealRndNumberTx(
        1,
        1,
        1,
        101
      ))
        .to.emit(companyLotteries, 'RandomNumberRevealed')
        .withArgs(
          1, // lottery no
          buyer.address, // buyer
          1, // sticket no
          1, // quantity
          101 // random number
        );
    });

    it('should not reveal the random number if the address is not the buyer of the ticket', async () => {
      await ethers.provider.send('evm_increaseTime', [1801]); // 30 minutes later
      await ethers.provider.send('evm_mine'); // Ensure time increment

      await expect(
        companyLotteries.connect(owner).revealRndNumberTx(
          1,
          1,
          1,
          101
        )
      ).to.be.revertedWith('Only the buyer can reveal the random number!');
    });

    it('should not reveal the random number if the quantity is zero', async () => {
      await ethers.provider.send('evm_increaseTime', [1801]); // 30 minutes later
      await ethers.provider.send('evm_mine'); // Ensure time increment

      await expect(
        companyLotteries.connect(buyer).revealRndNumberTx(
          1,
          1,
          0, // Invalid quantity
          101
        )
      ).to.be.revertedWith('Quantity must be greater than zero and less than or equal to 30!');
    });

    it('should not reveal the random number if the quantity is greater than 30', async () => {
      await ethers.provider.send('evm_increaseTime', [1801]); // 30 minutes later
      await ethers.provider.send('evm_mine'); // Ensure time increment

      await expect(
        companyLotteries.connect(buyer).revealRndNumberTx(
          1,
          1,
          31, // Invalid quantity
          101
        )
      ).to.be.revertedWith('Quantity must be greater than zero and less than or equal to 30!');
    });
  });

  describe('getNumPurchaseTxs', () => {
    let unixbeg, nooftickets, noofwinners, minpercentage, ticketprice, htmlhash, url;

    beforeEach(async () => {
      // Common lottery setup
      unixbeg = Math.floor(Date.now() / 1000) + 3600; // 1 hour from now
      nooftickets = 100;
      noofwinners = 10;
      minpercentage = 50;
      ticketprice = ethers.parseEther('0.1');
      htmlhash = ethers.encodeBytes32String('test');
      url = 'node101.io';

      // Create a lottery
      await companyLotteries.connect(owner).createLottery(
        unixbeg,
        nooftickets,
        noofwinners,
        minpercentage,
        ticketprice,
        htmlhash,
        url
      );
    });

    it('should return 0 purchase transactions if the lottery with the given id has no purchase transactions', async () => {
      expect(await companyLotteries.getNumPurchaseTxs(
        1 // lottery no
      ))
        .to.equal(0);
    });

    it('should return 1 purchase transaction if the lottery with the given id has one purchase transaction', async () => {
      // Approve tokens for the buyer
      await myToken.connect(buyer).approve(
        companyLotteries.getAddress(),
        ethers.parseEther('1.0') // Approve more than enough
      );

      // Buy a ticket
      await companyLotteries.connect(buyer).buyTicketTx(
        1,
        1,
        '0x8ff97419363ffd7000167f130ef7168fbea05faf9251824ca5043f113cc6a7c7' // 101
      );

      expect(await companyLotteries.getNumPurchaseTxs(
        1 // lottery no
      ))
        .to.equal(1);
    });

    it('should return 2 purchase transactions if the lottery with the given id has two purchase transactions', async () => {
      // Approve tokens for the buyer
      await myToken.connect(buyer).approve(
        companyLotteries.getAddress(),
        ethers.parseEther('1.0') // Approve more than enough
      );

      // Buy a ticket
      await companyLotteries.connect(buyer).buyTicketTx(
        1,
        1,
        '0x8ff97419363ffd7000167f130ef7168fbea05faf9251824ca5043f113cc6a7c7' // 101
      );

      await myToken.connect(buyer2).approve(
        companyLotteries.getAddress(),
        ethers.parseEther('1.0') // Approve more than enough
      );

      await companyLotteries.connect(buyer2).buyTicketTx(
        1, // lottery no
        2, // quantity
        '0x26700e13983fefbd9cf16da2ed70fa5c6798ac55062a4803121a869731e308d2' // 100
      );

      expect(await companyLotteries.getNumPurchaseTxs(
        1 // lottery no
      ))
        .to.equal(2);
    });

    it('should not return any purchase transactions if the lottery does not exist', async () => {
      await expect(
        companyLotteries.getNumPurchaseTxs(
          99 // Non-existent lottery ID
        )
      )
        .to.be.revertedWith('Lottery does not exist!');
    });
  });

  describe('getIthPurchasedTicket', () => {
    let unixbeg, nooftickets, noofwinners, minpercentage, ticketprice, htmlhash, url;

    beforeEach(async () => {
      // Common lottery setup
      unixbeg = Math.floor(Date.now() / 1000) + 3600; // 1 hour from now
      nooftickets = 100;
      noofwinners = 10;
      minpercentage = 50;
      ticketprice = ethers.parseEther('0.1');
      htmlhash = ethers.encodeBytes32String('test');
      url = 'node101.io';

      // Create a lottery
      await companyLotteries.connect(owner).createLottery(
        unixbeg,
        nooftickets,
        noofwinners,
        minpercentage,
        ticketprice,
        htmlhash,
        url
      );
    });

    it('should return 1 for starting ticket no and 2 for quantity if the buyer has bought 2 tickets at once for the lottery with the given id', async () => {
      // Approve tokens for the buyer
      await myToken.connect(buyer).approve(
        companyLotteries.getAddress(),
        ethers.parseEther('1.0') // Approve more than enough
      );

      // Buy a ticket
      await companyLotteries.connect(buyer).buyTicketTx(
        1, // lottery no
        2, // quantity
        '0x8ff97419363ffd7000167f130ef7168fbea05faf9251824ca5043f113cc6a7c7' // 101
      );

      const purchaseTx = await companyLotteries.getIthPurchasedTicket(
        1, // ith ticket
        1 // lottery no
      );

      expect(purchaseTx.sticketno).to.equal(1);
      expect(purchaseTx.quantity).to.equal(2);
    });

    it('should return 5 for starting ticket no and 3 for quantity if the buyer2 has bought 3 tickets at once for the lottery with the given id', async () => {
      // Approve tokens for the buyer
      await myToken.connect(buyer).approve(
        companyLotteries.getAddress(),
        ethers.parseEther('1.0') // Approve more than enough
      );

      // Buy a ticket
      await companyLotteries.connect(buyer).buyTicketTx(
        1, // lottery no
        4, // quantity
        '0x8ff97419363ffd7000167f130ef7168fbea05faf9251824ca5043f113cc6a7c7' // 101
      );

      await myToken.connect(buyer2).approve(
        companyLotteries.getAddress(),
        ethers.parseEther('1.0') // Approve more than enough
      );

      await companyLotteries.connect(buyer2).buyTicketTx(
        1, // lottery no
        3, // quantity
        '0x26700e13983fefbd9cf16da2ed70fa5c6798ac55062a4803121a869731e308d2' // 100
      );

      const purchaseTx = await companyLotteries.getIthPurchasedTicket(
        2, // ith ticket
        1 // lottery no
      );

      expect(purchaseTx.sticketno).to.equal(5);
      expect(purchaseTx.quantity).to.equal(3);
    });

    it('should not return any purchase transaction if the lottery does not exist', async () => {
      await expect(
        companyLotteries.getIthPurchasedTicket(
          1, // ith ticket
          99 // Non-existent lottery ID
        )
      )
        .to.be.revertedWith('Lottery does not exist!');
    });

    it('should not return any purchase transaction if the ith ticket is greater than the total number of tickets bought', async () => {
      // Approve tokens for the buyer
      await myToken.connect(buyer).approve(
        companyLotteries.getAddress(),
        ethers.parseEther('1.0') // Approve more than enough
      );

      // Buy a ticket
      await companyLotteries.connect(buyer).buyTicketTx(
        1, // lottery no
        2, // quantity
        '0x8ff97419363ffd7000167f130ef7168fbea05faf9251824ca5043f113cc6a7c7' // 101
      );

      await expect(
        companyLotteries.getIthPurchasedTicket(
          3, // ith ticket
          1 // lottery no
        )
      )
        .to.be.revertedWith('Index out of bounds!');
    });
  });

  describe('checkIfMyTicketWon', () => {
    let unixbeg, nooftickets, noofwinners, minpercentage, ticketprice, htmlhash, url;

    beforeEach(async () => {
      // Take a snapshot of the blockchain state
      snapshotId = await ethers.provider.send('evm_snapshot', []);

      const currentTimestamp = (await ethers.provider.getBlock('latest')).timestamp;

      unixbeg = currentTimestamp + 3600; // 1 hour from the current block timestamp
      nooftickets = 50;
      noofwinners = 4;
      minpercentage = 10;
      ticketprice = ethers.parseEther('0.1');
      htmlhash = ethers.encodeBytes32String('test');
      url = 'node101.io';

      // Create a lottery
      await companyLotteries.connect(owner).createLottery(
        unixbeg,
        nooftickets,
        noofwinners,
        minpercentage,
        ticketprice,
        htmlhash,
        url
      );

      // Approve tokens for the buyer
      await myToken.connect(buyer).approve(
        companyLotteries.getAddress(),
        ethers.parseEther('1.0') // Approve more than enough
      );

      // Buy a ticket
      await companyLotteries.connect(buyer).buyTicketTx(
        1, // lottery no
        2, // quantity
        '0x8ff97419363ffd7000167f130ef7168fbea05faf9251824ca5043f113cc6a7c7' // 101
      );

      // Approve tokens for the buyer2
      await myToken.connect(buyer2).approve(
        companyLotteries.getAddress(),
        ethers.parseEther('1.0') // Approve more than enough
      );

      // Buy a ticket
      await companyLotteries.connect(buyer2).buyTicketTx(
        1, // lottery no
        4, // quantity
        '0x26700e13983fefbd9cf16da2ed70fa5c6798ac55062a4803121a869731e308d2' // 100
      );

      await ethers.provider.send('evm_increaseTime', [1801]); // 30 minutes later
      await ethers.provider.send('evm_mine'); // Ensure time increment

      // Reveal the random number for the buyer
      await companyLotteries.connect(buyer).revealRndNumberTx(
        1, // lottery no
        1, // sticket no
        2, // quantity
        101 // random number
      );

      // Reveal the random number for the buyer2
      await companyLotteries.connect(buyer2).revealRndNumberTx(
        1, // lottery no
        3, // sticket no
        4, // quantity
        100 // random number
      );
    });

    afterEach(async () => {
      // Revert to the snapshot to reset the blockchain state
      await ethers.provider.send('evm_revert', [snapshotId]);
    });

    it('should return "Lottey does not exist!" if the lottery does not exist', async () => {
      await expect(
        companyLotteries.connect(buyer).checkIfMyTicketWon(
          99, // Non-existent lottery ID
          1 // ticket no
        )
      ).to.be.revertedWith('Lottery does not exist!');
    });

    it('should return "Reveal phase has not ended yet!" if the reveal phase has not ended yet', async () => {
      await expect(
        companyLotteries.connect(buyer).checkIfMyTicketWon(
          1, // lottery no
          1 // ticket no
        )
      ).to.be.revertedWith('Reveal phase has not ended yet!');
    });

    it('should return "Ticket does not exist or is unowned!" if the ticket does not exist', async () => {
      await ethers.provider.send('evm_increaseTime', [1801]); // 30 minutes later
      await ethers.provider.send('evm_mine'); // Ensure time increment

      // Finalize the lottery
      await companyLotteries.connect(owner).finalizeLottery(
        1 // lottery no
      );

      await expect(
        companyLotteries.connect(buyer).checkIfMyTicketWon(
          1, // lottery no
          10// ticket no
        )
      ).to.be.revertedWith('Ticket does not exist or is unowned!');
    });

    it('should return "Ticket does not belong to the caller!" if the ticket does not belong to the caller', async () => {
      await ethers.provider.send('evm_increaseTime', [1801]); // 30 minutes later
      await ethers.provider.send('evm_mine'); // Ensure time increment

      // Finalize the lottery
      await companyLotteries.connect(owner).finalizeLottery(
        1 // lottery no
      );

      await expect(
        companyLotteries.connect(buyer).checkIfMyTicketWon(
          1, // lottery no
          3 // ticket no
        )
      ).to.be.revertedWith('Ticket does not belong to the caller!');
    });

    it('should return boolean if the buyer has bought the winning ticket or not', async () => {
      await ethers.provider.send('evm_increaseTime', [1801]); // 30 minutes later
      await ethers.provider.send('evm_mine'); // Ensure time increment

      // Finalize the lottery
      await companyLotteries.connect(owner).finalizeLottery(
        1 // lottery no
      );

      expect(await companyLotteries.connect(buyer).checkIfMyTicketWon(
        1, // lottery no
        1 // ticket no
      )).to.be.a('boolean');
    });
  });

  describe('checkIfAddressTicketWon', () => {
    let unixbeg, nooftickets, noofwinners, minpercentage, ticketprice, htmlhash, url;

    beforeEach(async () => {
      // Take a snapshot of the blockchain state
      snapshotId = await ethers.provider.send('evm_snapshot', []);

      const currentTimestamp = (await ethers.provider.getBlock('latest')).timestamp;

      unixbeg = currentTimestamp + 3600; // 1 hour from the current block timestamp
      nooftickets = 50;
      noofwinners = 4;
      minpercentage = 10;
      ticketprice = ethers.parseEther('0.1');
      htmlhash = ethers.encodeBytes32String('test');
      url = 'node101.io';

      // Create a lottery
      await companyLotteries.connect(owner).createLottery(
        unixbeg,
        nooftickets,
        noofwinners,
        minpercentage,
        ticketprice,
        htmlhash,
        url
      );

      // Approve tokens for the buyer
      await myToken.connect(buyer).approve(
        companyLotteries.getAddress(),
        ethers.parseEther('1.0') // Approve more than enough
      );

      // Buy a ticket
      await companyLotteries.connect(buyer).buyTicketTx(
        1, // lottery no
        2, // quantity
        '0x8ff97419363ffd7000167f130ef7168fbea05faf9251824ca5043f113cc6a7c7' // 101
      );

      // Approve tokens for the buyer2
      await myToken.connect(buyer2).approve(
        companyLotteries.getAddress(),
        ethers.parseEther('1.0') // Approve more than enough
      );

      // Buy a ticket
      await companyLotteries.connect(buyer2).buyTicketTx(
        1, // lottery no
        4, // quantity
        '0x26700e13983fefbd9cf16da2ed70fa5c6798ac55062a4803121a869731e308d2' // 100
      );

      await ethers.provider.send('evm_increaseTime', [1801]); // 30 minutes later
      await ethers.provider.send('evm_mine'); // Ensure time increment

      // Reveal the random number for the buyer
      await companyLotteries.connect(buyer).revealRndNumberTx(
        1, // lottery no
        1, // sticket no
        2, // quantity
        101 // random number
      );

      // Reveal the random number for the buyer2
      await companyLotteries.connect(buyer2).revealRndNumberTx(
        1, // lottery no
        3, // sticket no
        4, // quantity
        100 // random number
      );
    });

    afterEach(async () => {
      // Revert to the snapshot to reset the blockchain state
      await ethers.provider.send('evm_revert', [snapshotId]);
    });

    it('should return "Lottey does not exist!" if the lottery does not exist', async () => {
      await expect(
        companyLotteries.checkIfAddressTicketWon(
          buyer.address, // address
          99, // Non-existent lottery ID
          1 // ticket no
        )
      )
        .to.be.revertedWith('Lottery does not exist!');
    });

    it('should return "Reveal phase has not ended yet!" if the reveal phase has not ended yet', async () => {
      await expect(
        companyLotteries.checkIfAddressTicketWon(
          buyer.address, // address
          1, // lottery no
          1 // ticket no
        )
      )
        .to.be.revertedWith('Reveal phase has not ended yet!');
    });

    it('should return "Ticket does not exist or is unowned!" if the ticket does not exist', async () => {
      await ethers.provider.send('evm_increaseTime', [1801]); // 30 minutes later
      await ethers.provider.send('evm_mine'); // Ensure time increment

      // Finalize the lottery
      await companyLotteries.connect(owner).finalizeLottery(
        1 // lottery no
      );

      await expect(
        companyLotteries.checkIfAddressTicketWon(
          buyer.address, // address
          1, // lottery no
          10// ticket no
        )
      )
        .to.be.revertedWith('Ticket does not exist or is unowned!');
    });

    it('should return boolean if the buyer has bought the winning ticket or not', async () => {
      await ethers.provider.send('evm_increaseTime', [1801]); // 30 minutes later
      await ethers.provider.send('evm_mine'); // Ensure time increment

      // Finalize the lottery
      await companyLotteries.connect(owner).finalizeLottery(
        1 // lottery no
      );

      expect(await companyLotteries.checkIfAddressTicketWon(
        buyer.address, // address
        1, // lottery no
        1 // ticket no
      )).to.be.a('boolean');
    });
  });

  describe('getIthWinningTicket', () => {
    let unixbeg, nooftickets, noofwinners, minpercentage, ticketprice, htmlhash, url;

    beforeEach(async () => {
      // Take a snapshot of the blockchain state
      snapshotId = await ethers.provider.send('evm_snapshot', []);

      const currentTimestamp = (await ethers.provider.getBlock('latest')).timestamp;

      unixbeg = currentTimestamp + 3600; // 1 hour from the current block timestamp
      nooftickets = 50;
      noofwinners = 4;
      minpercentage = 10;
      ticketprice = ethers.parseEther('0.1');
      htmlhash = ethers.encodeBytes32String('test');
      url = 'node101.io';

      // Create a lottery
      await companyLotteries.connect(owner).createLottery(
        unixbeg,
        nooftickets,
        noofwinners,
        minpercentage,
        ticketprice,
        htmlhash,
        url
      );

      // Approve tokens for the buyer
      await myToken.connect(buyer).approve(
        companyLotteries.getAddress(),
        ethers.parseEther('1.0') // Approve more than enough
      );

      // Buy a ticket
      await companyLotteries.connect(buyer).buyTicketTx(
        1, // lottery no
        2, // quantity
        '0x8ff97419363ffd7000167f130ef7168fbea05faf9251824ca5043f113cc6a7c7' // 101
      );

      // Approve tokens for the buyer2
      await myToken.connect(buyer2).approve(
        companyLotteries.getAddress(),
        ethers.parseEther('1.0') // Approve more than enough
      );

      // Buy a ticket
      await companyLotteries.connect(buyer2).buyTicketTx(
        1, // lottery no
        4, // quantity
        '0x26700e13983fefbd9cf16da2ed70fa5c6798ac55062a4803121a869731e308d2' // 100
      );

      await ethers.provider.send('evm_increaseTime', [1801]); // 30 minutes later
      await ethers.provider.send('evm_mine'); // Ensure time increment

      // Reveal the random number for the buyer
      await companyLotteries.connect(buyer).revealRndNumberTx(
        1, // lottery no
        1, // sticket no
        2, // quantity
        101 // random number
      );

      // Reveal the random number for the buyer2
      await companyLotteries.connect(buyer2).revealRndNumberTx(
        1, // lottery no
        3, // sticket no
        4, // quantity
        100 // random number
      );
    });

    afterEach(async () => {
      // Revert to the snapshot to reset the blockchain state
      await ethers.provider.send('evm_revert', [snapshotId]);
    });

    it('should return "Lottey does not exist!" if the lottery does not exist', async () => {
      await expect(
        companyLotteries.getIthWinningTicket(
          99, // Non-existent lottery ID
          1 // ticket no
        )
      )
        .to.be.revertedWith('Lottery does not exist!');
    });

    it('should return "Reveal phase has not ended yet!" if the reveal phase has not ended yet', async () => {
      await expect(
        companyLotteries.getIthWinningTicket(
          1, // lottery no
          1 // ticket no
        )
      )
        .to.be.revertedWith('Reveal phase has not ended yet!');
    });

    it('should return "Index out of bounds!" if the ith ticket is greater than the total number of tickets bought', async () => {
      await ethers.provider.send('evm_increaseTime', [1801]); // 30 minutes later
      await ethers.provider.send('evm_mine'); // Ensure time increment

      // Finalize the lottery
      await companyLotteries.connect(owner).finalizeLottery(
        1 // lottery no
      );

      await expect(
        companyLotteries.getIthWinningTicket(
          1, // lottery no
          10// ticket no
        )
      )
        .to.be.revertedWith('Index out of bounds!');
    });

    it('should return the winning ticket number for the given lottery and ticket no', async () => {
      await ethers.provider.send('evm_increaseTime', [1801]); // 30 minutes later
      await ethers.provider.send('evm_mine'); // Ensure time increment

      // Finalize the lottery
      await companyLotteries.connect(owner).finalizeLottery(
        1 // lottery no
      );

      expect(await companyLotteries.getIthWinningTicket(
        1, // lottery no
        1 // ticket no
      )).to.be.a('bigint'); // It returns 1n, 2n, 3n, 4n, etc.
    });
  });

  describe('getCurrentLotteryNo', () => {
    let unixbeg, nooftickets, noofwinners, minpercentage, ticketprice, htmlhash, url;

    // Common lottery setup
    unixbeg = Math.floor(Date.now() / 1000) + 3600; // 1 hour from now
    nooftickets = 100;
    noofwinners = 10;
    minpercentage = 50;
    ticketprice = ethers.parseEther('0.1');
    htmlhash = ethers.encodeBytes32String('test');
    url = 'node101.io';

    it('should return 0 if there are no lotteries created', async () => {
      expect(await companyLotteries.getCurrentLotteryNo())
        .to.equal(0);
    });

    it('should return 1 if there is one lottery created', async () => {
      // Create a lottery
      await companyLotteries.connect(owner).createLottery(
        unixbeg,
        nooftickets,
        noofwinners,
        minpercentage,
        ticketprice,
        htmlhash,
        url
      );

      expect(await companyLotteries.getCurrentLotteryNo())
        .to.equal(1);
    });

    it('should return 2 if there are two lotteries created', async () => {
      // Create a lottery
      await companyLotteries.connect(owner).createLottery(
        unixbeg,
        nooftickets,
        noofwinners,
        minpercentage,
        ticketprice,
        htmlhash,
        url
      );

      // Create another lottery
      await companyLotteries.connect(owner).createLottery(
        unixbeg,
        nooftickets,
        noofwinners,
        minpercentage,
        ticketprice,
        htmlhash,
        url
      );

      expect(await companyLotteries.getCurrentLotteryNo())
        .to.equal(2);
    });
  });

  describe('getLotteryInfo', () => {
    let unixbeg, nooftickets, noofwinners, minpercentage, ticketprice, htmlhash, url;
    let unixbeg2, nooftickets2, noofwinners2, minpercentage2, ticketprice2, htmlhash2, url2;

    beforeEach(async () => {
      // Create the first lottery
      unixbeg = Math.floor(Date.now() / 1000) + 3600; // 1 hour from now
      nooftickets = 100;
      noofwinners = 10;
      minpercentage = 50;
      ticketprice = ethers.parseEther('0.1');
      htmlhash = ethers.encodeBytes32String('test');
      url = 'node101.io';

      await companyLotteries.connect(owner).createLottery(
        unixbeg,
        nooftickets,
        noofwinners,
        minpercentage,
        ticketprice,
        htmlhash,
        url
      );

      // Create the second lottery
      unixbeg2 = Math.floor(Date.now() / 1000) + 3600; // 1 hour from now
      nooftickets2 = 200;
      noofwinners2 = 20;
      minpercentage2 = 60;
      ticketprice2 = ethers.parseEther('0.2');
      htmlhash2 = ethers.encodeBytes32String('test2');
      url2 = 'node102.io';

      await companyLotteries.connect(owner).createLottery(
        unixbeg2,
        nooftickets2,
        noofwinners2,
        minpercentage2,
        ticketprice2,
        htmlhash2,
        url2
      );
    });

    it('should return the correct information for the first lottery', async () => {
      const lotteryInfo = await companyLotteries.getLotteryInfo(1);

      expect(lotteryInfo.unixbeg).to.equal(unixbeg);
      expect(lotteryInfo.nooftickets).to.equal(nooftickets);
      expect(lotteryInfo.noofwinners).to.equal(noofwinners);
      expect(lotteryInfo.minpercentage).to.equal(minpercentage);
      expect(lotteryInfo.ticketprice).to.equal(ticketprice);
    });

    it('should return the correct information for the second lottery', async () => {
      const lotteryInfo = await companyLotteries.getLotteryInfo(2);

      expect(lotteryInfo.unixbeg).to.equal(unixbeg2);
      expect(lotteryInfo.nooftickets).to.equal(nooftickets2);
      expect(lotteryInfo.noofwinners).to.equal(noofwinners2);
      expect(lotteryInfo.minpercentage).to.equal(minpercentage2);
      expect(lotteryInfo.ticketprice).to.equal(ticketprice2);
    });

    it('should not return any information if the lottery does not exist', async () => {
      await expect(
        companyLotteries.getLotteryInfo(99) // Non-existent lottery ID
      )
        .to.be.revertedWith('Lottery does not exist!');
    });
  });

  describe('getLotteryURL', () => {
    let unixbeg, nooftickets, noofwinners, minpercentage, ticketprice, htmlhash, url;
    let unixbeg2, nooftickets2, noofwinners2, minpercentage2, ticketprice2, htmlhash2, url2;

    beforeEach(async () => {
      // Create the first lottery
      unixbeg = Math.floor(Date.now() / 1000) + 3600; // 1 hour from now
      nooftickets = 100;
      noofwinners = 10;
      minpercentage = 50;
      ticketprice = ethers.parseEther('0.1');
      htmlhash = ethers.encodeBytes32String('test');
      url = 'node101.io';

      await companyLotteries.connect(owner).createLottery(
        unixbeg,
        nooftickets,
        noofwinners,
        minpercentage,
        ticketprice,
        htmlhash,
        url
      );

      // Create the second lottery
      unixbeg2 = Math.floor(Date.now() / 1000) + 3600; // 1 hour from now
      nooftickets2 = 200;
      noofwinners2 = 20;
      minpercentage2 = 60;
      ticketprice2 = ethers.parseEther('0.2');
      htmlhash2 = ethers.encodeBytes32String('test2');
      url2 = 'node102.io';

      await companyLotteries.connect(owner).createLottery(
        unixbeg2,
        nooftickets2,
        noofwinners2,
        minpercentage2,
        ticketprice2,
        htmlhash2,
        url2
      );
    });

    it('should return the correct html hash and the URL for the first lottery', async () => {
      expect((await companyLotteries.getLotteryURL(1))[0]).to.equal(htmlhash);
      expect((await companyLotteries.getLotteryURL(1))[1]).to.equal(url);
    });

    it('should return the correct html hash and the URL for the second lottery', async () => {
      expect((await companyLotteries.getLotteryURL(2))[0]).to.equal(htmlhash2);
      expect((await companyLotteries.getLotteryURL(2))[1]).to.equal(url2);
    });

    it('should not return any URL if the lottery does not exist', async () => {
      await expect(
        companyLotteries.getLotteryURL(99) // Non-existent lottery ID
      )
        .to.be.revertedWith('Lottery does not exist!');
    });
  });

  describe('getLotterySales', () => {
    let unixbeg, nooftickets, noofwinners, minpercentage, ticketprice, htmlhash, url;

    beforeEach(async () => {
      // Common lottery setup
      unixbeg = Math.floor(Date.now() / 1000) + 3600; // 1 hour from now
      nooftickets = 100;
      noofwinners = 10;
      minpercentage = 50;
      ticketprice = ethers.parseEther('0.1');
      htmlhash = ethers.encodeBytes32String('test');
      url = 'node101.io';

      // Create a lottery
      await companyLotteries.connect(owner).createLottery(
        unixbeg,
        nooftickets,
        noofwinners,
        minpercentage,
        ticketprice,
        htmlhash,
        url
      );
    });

    it('should return 0 if there are not tickets sold', async () => {
      expect(await companyLotteries.getLotterySales(1))
        .to.equal(0);
    });

    it('should return 1 if there is only one ticket sold', async () => {
      // Approve tokens for the buyer
      await myToken.connect(buyer).approve(
        companyLotteries.getAddress(),
        ethers.parseEther('1.0') // Approve more than enough
      );

      // Buy a ticket
      await companyLotteries.connect(buyer).buyTicketTx(
        1,
        1,
        '0x8ff97419363ffd7000167f130ef7168fbea05faf9251824ca5043f113cc6a7c7' // 101
      );

      expect(await companyLotteries.getLotterySales(
        1 // lottery no
      ))
        .to.equal(1);
    });

    it('should return 3 if there are 3 tickets in quantity sold', async () => {
        // Approve tokens for the buyer
      await myToken.connect(buyer).approve(
        companyLotteries.getAddress(),
        ethers.parseEther('1.0') // Approve more than enough
      );

      // Buy a ticket
      await companyLotteries.connect(buyer).buyTicketTx(
        1,
        1,
        '0x8ff97419363ffd7000167f130ef7168fbea05faf9251824ca5043f113cc6a7c7' // 101
      );

      await myToken.connect(buyer2).approve(
        companyLotteries.getAddress(),
        ethers.parseEther('1.0') // Approve more than enough
      );

      await companyLotteries.connect(buyer2).buyTicketTx(
        1, // lottery no
        2, // quantity
        '0x26700e13983fefbd9cf16da2ed70fa5c6798ac55062a4803121a869731e308d2' // 100
      );

      expect(await companyLotteries.getLotterySales(
        1 // lottery no
      ))
        .to.equal(3);
    });

    it('should return an error if the lottery does not exist', async() => {
      await expect(
        companyLotteries.getLotterySales(
          99 // Non-existent lottery ID
        )
      )
        .to.be.revertedWith('Lottery does not exist!');
    });
  });

  describe('setPaymentToken', () => {
    let unixbeg, nooftickets, noofwinners, minpercentage, ticketprice, htmlhash, url;

    beforeEach(async () => {
      unixbeg = Math.floor(Date.now() / 1000) + 3600; // 1 hour from now
      nooftickets = 100;
      noofwinners = 10;
      minpercentage = 50;
      ticketprice = ethers.parseEther('0.1');
      htmlhash = ethers.encodeBytes32String('test');
      url = 'node101.io';

      // Create a lottery
      await companyLotteries.connect(owner).createLottery(
        unixbeg,
        nooftickets,
        noofwinners,
        minpercentage,
        ticketprice,
        htmlhash,
        url
      );

      // Set the payment token in the contract
      await companyLotteries.connect(owner).setPaymentToken(myToken.getAddress());
    });

    it('should set a new payment token to the contract and emit NewPaymentTokenSet event', async () => {
      const newToken = await MyToken.deploy();
      await newToken.waitForDeployment();

      await expect(
        companyLotteries.connect(owner).setPaymentToken(newToken.getAddress())
      )
        .to.emit(companyLotteries, 'NewPaymentTokenSet')
        .withArgs(
          1, // lottery no
          newToken.getAddress() // new token address
        );
    });

    it('should not set the payment token if the caller is not the owner', async () => {
      await expect(
        companyLotteries.connect(buyer).setPaymentToken(myToken.getAddress())
      )
        .to.be.revertedWith('Ownable: caller is not the owner');
    });

    it('should not set the payment token if the token address is zero', async () => {
      await expect(
        companyLotteries.connect(owner).setPaymentToken(ethers.ZeroAddress)
      )
        .to.be.revertedWith('Invalid token address!');
    });

    it('should not set the payment token if the token address is the same as the current token address', async () => {
      await expect(
        companyLotteries.connect(owner).setPaymentToken(myToken.getAddress())
      )
        .to.be.revertedWith('Token address is the same as the current one!');
    });

    it('should not set the payment token if the token address is not a contract', async () => {
      await expect(
        companyLotteries.connect(owner).setPaymentToken(buyer.address)
      )
        .to.be.revertedWith('Address is not a contract!');
    });
  });

  describe('getPaymentToken', () => {
    let unixbeg, nooftickets, noofwinners, minpercentage, ticketprice, htmlhash, url;

    beforeEach(async () => {
      unixbeg = Math.floor(Date.now() / 1000) + 3600;
      nooftickets = 100;
      noofwinners = 10;
      minpercentage = 50;
      ticketprice = ethers.parseEther('0.1');
      htmlhash = ethers.encodeBytes32String('test');
      url = 'node101.io';

      // Create a lottery
      await companyLotteries.connect(owner).createLottery(
        unixbeg,
        nooftickets,
        noofwinners,
        minpercentage,
        ticketprice,
        htmlhash,
        url
      );

      // Set the payment token in the contract
      await companyLotteries.connect(owner).setPaymentToken(myToken.getAddress());
    });

    it('should return the payment token address for the lottery with the given id', async () => {
      expect(await companyLotteries.getPaymentToken(1))
        .to.equal(await myToken.getAddress());
    });

    it('should not return the payment token address if the lottery does not exist', async () => {
      await expect(
        companyLotteries.getPaymentToken(99) // Non-existent lottery ID
      )
        .to.be.revertedWith('Lottery does not exist!');
    });
  });

  describe('finalizeLottery', () => {
    let unixbeg, nooftickets, noofwinners, minpercentage, ticketprice, htmlhash, url;

    beforeEach(async () => {
      // Take a snapshot of the blockchain state
      snapshotId = await ethers.provider.send('evm_snapshot', []);

      const currentTimestamp = (await ethers.provider.getBlock('latest')).timestamp;

      unixbeg = currentTimestamp + 3600; // 1 hour from the current block timestamp
      nooftickets = 30;
      noofwinners = 5;
      minpercentage = 20;
      ticketprice = ethers.parseEther('0.1');
      htmlhash = ethers.encodeBytes32String('test');
      url = 'node101.io';

      // Create a lottery
      await companyLotteries.connect(owner).createLottery(
        unixbeg,
        nooftickets,
        noofwinners,
        minpercentage,
        ticketprice,
        htmlhash,
        url
      );
    });

    afterEach(async () => {
      // Revert to the snapshot to reset the blockchain state
      await ethers.provider.send('evm_revert', [snapshotId]);
    });

    it('should not finalize the lottery if the lottery does not exist', async () => {
      await expect(
        companyLotteries.finalizeLottery(99) // Non-existent lottery ID
      )
        .to.be.revertedWith('Lottery does not exist!');
    });

    it('should not finalize the lottery if the reveal phase has not ended yet', async () => {
      await expect(
        companyLotteries.finalizeLottery(1) // lottery no
      )
        .to.be.revertedWith('Reveal phase has not ended yet!');
    });

    it('should not finalize the lottery if the lottery has already been finalized or canceled', async () => {
      await ethers.provider.send('evm_increaseTime', [3601]); // 1 hour later
      await ethers.provider.send('evm_mine'); // Ensure time increment

      await companyLotteries.finalizeLottery(1); // lottery no

      await expect(
        companyLotteries.finalizeLottery(1) // lottery no
      )
        .to.be.revertedWith('Lottery has already been finalized or canceled!');
    });

    it('should cancel the lottery and emit LotteryCanceled event if the lottery has not met the minimum ticket sales', async () => {
      await ethers.provider.send('evm_increaseTime', [3601]); // 1 hour later
      await ethers.provider.send('evm_mine'); // Ensure time increment

      expect(await companyLotteries.finalizeLottery(1))
        .to.emit(companyLotteries, 'LotteryCanceled')
        .withArgs(1); // lottery no
    });

    it('should finalize the lottery and emit LotteryFinalized event if the lottery has met the minimum ticket sales', async () => {
      // Approve tokens for the buyer
      await myToken.connect(buyer).approve(
        companyLotteries.getAddress(),
        ethers.parseEther('1.0') // Approve more than enough
      );

      // Approve tokens for buyer2
      await myToken.connect(buyer2).approve(
        companyLotteries.getAddress(),
        ethers.parseEther('1.0') // Approve more than enough
      );

      // Buy tickets for the buyer
      await companyLotteries.connect(buyer).buyTicketTx(
        1, // lottery no
        3, // quantity
        '0x8ff97419363ffd7000167f130ef7168fbea05faf9251824ca5043f113cc6a7c7' // 101
      );

      // Buy tickets for buyer2
      await companyLotteries.connect(buyer2).buyTicketTx(
        1, // lottery no
        3, // quantity
        '0x26700e13983fefbd9cf16da2ed70fa5c6798ac55062a4803121a869731e308d2' // 100
      );

      // Move forward in time
      await ethers.provider.send('evm_increaseTime', [1801]); // 1 hour later
      await ethers.provider.send('evm_mine'); // Ensure the block timestamp is updated

      // Reveal random numbers for both buyers
      await companyLotteries.connect(buyer).revealRndNumberTx(
        1, // lottery no
        1, // sticket no
        3, // quantity
        101 // random number
      );

      await companyLotteries.connect(buyer2).revealRndNumberTx(
        1, // lottery no
        4, // sticket no
        1, // quantity
        100 // random number
      );

      await ethers.provider.send('evm_increaseTime', [1801]); // 1 hour later
      await ethers.provider.send('evm_mine'); // Ensure the block timestamp is updated

      // Finalize the lottery
      const tx = await companyLotteries.finalizeLottery(1); // lottery no
      const receipt = await tx.wait();

      // Locate the LotteryFinalized event in the logs
      const eventLog = receipt.logs.find(
        (log) => log.fragment.name === 'LotteryFinalized'
      );

      expect(eventLog).to.not.be.undefined;

      // Decode the event
      const [lotteryNo, winningTickets] = eventLog.args;

      // Assertions
      expect(lotteryNo).to.equal(1); // Correct lottery ID
      expect(winningTickets).to.have.lengthOf(5); // Number of winners
    });
  });
});
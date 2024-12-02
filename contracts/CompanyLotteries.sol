// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import "hardhat/console.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

contract CompanyLotteries is Ownable {
  struct Lottery {
    uint unixbeg;
    uint unixpurchase;
    uint unixreveal;
    uint nooftickets;
    uint noofwinners;
    uint minpercentage;
    uint ticketprice;
    bytes32 htmlhash;
    string url;
    address paymenttoken;
    uint numsold;
    uint[] winningtickets;
    mapping(address => uint[]) userTickets;
    mapping(uint => address) ticketOwner;
    mapping(uint => bytes32) ticketHashes;
    bool isActive;
  }

  struct PurchaseTx {
    uint sticketno;
    uint quantity;
  }

  uint private currentLotteryNo;
  mapping(uint => Lottery) private lotteries;

  mapping(uint => PurchaseTx[]) private purchaseTransactions;

  event LotteryCreated(
    uint lottery_no,
    uint unixbeg,
    uint nooftickets,
    uint noofwinners,
    uint minpercentage,
    uint ticketprice,
    bytes32 htmlhash,
    string url,
    address paymenttoken,
    address owner
  );

  event TicketPurchased(
    uint indexed lottery_no,
    address indexed buyer,
    uint sticketno,
    uint quantity
  );

  event RandomNumberRevealed(
    uint indexed lottery_no,
    address indexed buyer,
    uint sticketno,
    uint quantity,
    uint rnd_number,
    uint timestamp
  );

  event NewPaymentTokenSet(
    uint indexed lottery_no,
    address indexed paymenttoken
  );

  event LotteryCanceled(
    uint indexed lottery_no
  );

  event LotteryFinalized(
    uint indexed lottery_no,
    uint[] winners
  );

  constructor() Ownable() {}

  function createLottery(
    uint unixbeg,
    uint nooftickets,
    uint noofwinners,
    uint minpercentage,
    uint ticketprice,
    bytes32 htmlhash,
    string memory url
  ) public onlyOwner returns (uint lottery_no) {
    require(unixbeg > block.timestamp, "Lottery end time must be in the future!");
    require(nooftickets > 0, 'Number of tickets must be greater than zero!');
    require(noofwinners > 0 && noofwinners <= nooftickets, 'Number of winners must be greater than zero and less than or equal to number of tickets!');
    require(minpercentage > 0 && minpercentage <= 100, 'Minimum percentage must be greater than 0 and less than or equal to 100!');
    require(ticketprice > 0, 'Ticket price must be greater than zero!');

    currentLotteryNo++;

    uint unixtotalpurchaseandrevealtime = unixbeg - block.timestamp;
    uint unixhalfduration = unixtotalpurchaseandrevealtime / 2;

    uint unixpurchase = block.timestamp + unixhalfduration;
    uint unixreveal = unixpurchase + unixhalfduration;

    Lottery storage lottery = lotteries[currentLotteryNo];
    lottery.unixbeg = unixbeg;
    lottery.unixpurchase = unixpurchase;
    lottery.unixreveal = unixreveal;
    lottery.nooftickets = nooftickets;
    lottery.noofwinners = noofwinners;
    lottery.minpercentage = minpercentage;
    lottery.ticketprice = ticketprice;
    lottery.htmlhash = htmlhash;
    lottery.url = url;
    lottery.isActive = true;

    emit LotteryCreated(
      currentLotteryNo,
      unixbeg,
      nooftickets,
      noofwinners,
      minpercentage,
      ticketprice,
      htmlhash,
      url,
      address(0),
      owner()
    );

    return currentLotteryNo;
  }

  function buyTicketTx(
    uint lottery_no,
    uint quantity,
    bytes32 hash_rnd_number
  ) public returns (uint sticketno) {
    require(hash_rnd_number != bytes32(0), "Random number must not be zero!");

    Lottery storage lottery = lotteries[lottery_no];

    require(lottery.unixbeg != 0, "Lottery does not exist!");
    require(block.timestamp < lottery.unixpurchase, "Purchase phase has ended!");
    require(lottery.isActive, "Lottery is not active!");
    require(quantity > 0 && quantity <= 30, "Quantity must be greater than zero and less than or equal to 30!");
    require(lottery.numsold + quantity <= lottery.nooftickets, "Not enough tickets left!");

    // uint totalCost = quantity * lottery.ticketprice;

    // require(
    //     IERC20(lottery.paymenttoken).transferFrom(msg.sender, address(this), totalCost),
    //     "Payment failed."
    // );

    // Assign tickets
    sticketno = lottery.numsold + 1; // Starting ticket number
    for (uint i = 0; i < quantity; i++) {
      uint currentTicket = lottery.numsold + i + 1;
      lottery.ticketOwner[currentTicket] = msg.sender;
      lottery.ticketHashes[currentTicket] = hash_rnd_number;
      lottery.userTickets[msg.sender].push(currentTicket);
    }

    // Update number of tickets sold
    lottery.numsold += quantity;

    // Add transaction to the purchaseTransactions array
    purchaseTransactions[lottery_no].push(PurchaseTx(sticketno, quantity));

    // Emit an event for transparency
    emit TicketPurchased(lottery_no, msg.sender, sticketno, quantity);

    return sticketno;
  }

  function revealRndNumberTx(
    uint lottery_no,
    uint sticketno,
    uint quantity,
    uint rnd_number
  ) public {
    Lottery storage lottery = lotteries[lottery_no];

    require(lottery.unixbeg != 0, "Lottery does not exist!");
    require(block.timestamp > lottery.unixpurchase, "Reveal phase has not started yet!");
    require(block.timestamp < lottery.unixreveal, "Reveal phase has ended!");
    require(quantity > 0 && quantity <= 30, "Quantity must be greater than zero and less than or equal to 30!");

    for (uint i = 0; i < quantity; i++) {
      uint currentTicket = sticketno + i;
      require(lottery.ticketOwner[currentTicket] == msg.sender, "Only the buyer can reveal the random number!");
      require(lottery.ticketHashes[currentTicket] == keccak256(abi.encodePacked(rnd_number)), "Random number does not match the hash!");
    }

    emit RandomNumberRevealed(
      lottery_no,
      msg.sender,
      sticketno,
      quantity,
      rnd_number,
      block.timestamp
    );
  }

  function getNumPurchaseTxs(
    uint lottery_no
  ) public view returns (uint numpurchasetxs) {
    Lottery storage lottery = lotteries[lottery_no];

    require(lottery.unixbeg != 0, "Lottery does not exist!");

    return purchaseTransactions[lottery_no].length;
  }

  function getIthPurchasedTicket(
    uint i,
    uint lottery_no
  ) public view returns (
    uint sticketno,
    uint quantity
  ) {
    Lottery storage lottery = lotteries[lottery_no];

    require(lottery.unixbeg != 0, "Lottery does not exist!");
    require(i <= purchaseTransactions[lottery_no].length, "Index out of bounds!");

    PurchaseTx storage purchaseTx = purchaseTransactions[lottery_no][i - 1];

    return (purchaseTx.sticketno, purchaseTx.quantity);
  }

  function checkIfMyTicketWon(
    uint lottery_no,
    uint ticket_no
  ) public view returns (bool won) {
    Lottery storage lottery = lotteries[lottery_no];

    require(lottery.unixbeg != 0, "Lottery does not exist!");
    require(block.timestamp > lottery.unixreveal, "Reveal phase has not ended yet!");
    require(lottery.ticketOwner[ticket_no] != address(0), "Ticket does not exist or is unowned!");

    // Check if the ticket is in the winning tickets array
    for (uint i = 0; i < lottery.winningtickets.length; i++) {
      if (lottery.winningtickets[i] == ticket_no) {
        return true; // Ticket is a winner
      }
    }

    return false; // Ticket is not a winner
  }

  function checkIfAddressTicketWon(
    address addr,
    uint lottery_no,
    uint ticket_no
  ) public view returns (
    bool won
  ) {
    Lottery storage lottery = lotteries[lottery_no];

    require(lottery.unixbeg != 0, "Lottery does not exist!");
    require(block.timestamp > lottery.unixreveal, "Reveal phase has not ended yet!");
    require(lottery.ticketOwner[ticket_no] != address(0), "Ticket does not exist or is unowned!");
    require(lottery.ticketOwner[ticket_no] == addr, "Ticket does not belong to the address!");

    // Check if the ticket is in the winning tickets array
    for (uint i = 0; i < lottery.winningtickets.length; i++) {
      if (lottery.winningtickets[i] == ticket_no) {
        return true; // Ticket is a winner
      }
    }

    return false; // Ticket is not a winner
  }

  function getCurrentLotteryNo() public view returns (uint) {
    return currentLotteryNo;
  }

  function getPaymentToken(
    uint lottery_no
  ) public view returns (
    address erctokenaddress
  ) {
    Lottery storage lottery = lotteries[lottery_no];

    require(lottery.unixbeg != 0, "Lottery does not exist!");

    return lottery.paymenttoken;
  }

  function setPaymentToken(
    address erctokenaddress
  ) public onlyOwner {
    require(erctokenaddress != address(0), "Invalid token address!");
    require(isContract(erctokenaddress), "Address is not a contract!");

    Lottery storage lottery = lotteries[currentLotteryNo];

    require(lottery.paymenttoken != erctokenaddress, "Token address is the same as the current one!");

    lottery.paymenttoken = erctokenaddress;

    emit NewPaymentTokenSet(
      currentLotteryNo,
      erctokenaddress
    );
  }

  function getLotteryInfo(
    uint lottey_no
  ) public view returns (
    uint unixbeg,
    uint nooftickets,
    uint noofwinners,
    uint minpercentage,
    uint ticketprice
  ) {
    Lottery storage lottery = lotteries[lottey_no];

    require(lottery.unixbeg != 0, "Lottery does not exist!");

    return (
      lottery.unixbeg,
      lottery.nooftickets,
      lottery.noofwinners,
      lottery.minpercentage,
      lottery.ticketprice
    );
  }

  function getLotteryURL(
    uint lottery_no
  ) public view returns (
    bytes32 htmlhash,
    string memory url
  ) {
    Lottery storage lottery = lotteries[lottery_no];

    require(lottery.unixbeg != 0, "Lottery does not exist!");

    return (lottery.htmlhash, lottery.url);
  }

  function getLotterySales(
    uint lottery_no
  ) public view returns (
    uint numsold
  ) {
    Lottery storage lottery = lotteries[lottery_no];

    require(lottery.unixbeg != 0, "Lottery does not exist!");

    return lottery.numsold;
  }

  function finalizeLottery(
      uint lottery_no
  ) public onlyOwner {
    Lottery storage lottery = lotteries[lottery_no];

    require(lottery.unixbeg != 0, "Lottery does not exist!");
    require(block.timestamp > lottery.unixreveal, "Reveal phase has not ended yet!");
    require(lottery.isActive, "Lottery has already been finalized or canceled!");

    uint minTicketsRequired = (lottery.nooftickets * lottery.minpercentage) / 100;

    if (lottery.numsold < minTicketsRequired) {
      // Cancel the lottery if minimum tickets not sold
      lottery.isActive = false;

      emit LotteryCanceled(lottery_no);
      return;
    }

    uint totalRevealedTickets = 0;
    uint[] memory revealedTickets = new uint[](lottery.numsold);

    // Collect tickets with revealed random numbers
    for (uint i = 1; i <= lottery.numsold; i++) {
      if (lottery.ticketHashes[i] != bytes32(0)) {
        revealedTickets[totalRevealedTickets] = i;
        totalRevealedTickets++;
      }
    }

    require(totalRevealedTickets >= lottery.noofwinners, "Not enough revealed tickets to select winners!");

    uint[] memory winners = new uint[](lottery.noofwinners);
    uint seed = uint(keccak256(abi.encodePacked(blockhash(block.number - 1), block.timestamp)));

    // Select unique winners
    for (uint i = 0; i < lottery.noofwinners; i++) {
      uint randomIndex = uint(keccak256(abi.encode(seed, i))) % totalRevealedTickets;
      winners[i] = revealedTickets[randomIndex];

      // Remove selected winner to avoid duplicates
      revealedTickets[randomIndex] = revealedTickets[totalRevealedTickets - 1];
      totalRevealedTickets--;
    }

    // Mark the lottery as finalized and store winning tickets
    lottery.isActive = false;
    lottery.winningtickets = winners;

    emit LotteryFinalized(lottery_no, winners);
  }

  // Helper function to check if the address is a contract
  function isContract(address addr) internal view returns (bool) {
    uint256 size;
    assembly {
      size := extcodesize(addr)
    }
    return size > 0;
  }
}
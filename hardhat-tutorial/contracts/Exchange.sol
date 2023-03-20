// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.9;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";

contract Exchange is ERC20 {
    
    address public cryptoDevTokenAddress;

    constructor(address _cryptoDevToken) ERC20("CryptoDev LP Token", "CDLP") {
        require(_cryptoDevToken != address(0), "Passed token address is a null address!");
        cryptoDevTokenAddress = _cryptoDevToken;
    }

    function getReserve() public view returns (uint) {
        return ERC20(cryptoDevTokenAddress).balanceOf(address(this));
    }

    function addLiquidity(uint _amount) public payable returns (uint) {
        uint liquidity;
        uint ethBalance = address(this).balance;
        uint cryptoDevTokenBalance = getReserve();
        ERC20 cryptoDevToken = ERC20(cryptoDevTokenAddress);

        if (cryptoDevTokenBalance == 0) {
            cryptoDevToken.transferFrom(msg.sender, address(this), _amount);
            liquidity = ethBalance;
            _mint(msg.sender, liquidity);
        } else {
            uint ethReserve = ethBalance - msg.value;
            uint cryptoDevTokenAmount = msg.value * cryptoDevTokenBalance / ethReserve;
            require(_amount >= cryptoDevTokenAmount, "Amount of tokens sent is less than the minimum tokens required");
            cryptoDevToken.transferFrom(msg.sender, address(this), cryptoDevTokenAmount);
            liquidity = totalSupply() * msg.value / ethReserve;
            _mint(msg.sender, liquidity);
        }

        return liquidity;
    }

    function removeLiquidity(uint _amount) public returns (uint, uint) {
        require(_amount > 0, "_amount should be greater than zero");
        uint ethReserve = address(this).balance;
        uint _totalSupply = totalSupply();

        uint ethAmount = _amount * ethReserve / _totalSupply;
        uint cryptoDevTokenAmount = _amount * getReserve() / _totalSupply;

        _burn(msg.sender, _amount);
        payable(msg.sender).transfer(ethAmount);
        ERC20(cryptoDevTokenAddress).transfer(msg.sender, cryptoDevTokenAmount);
        return (ethAmount, cryptoDevTokenAmount);
    }

    function getAmountOfTokens(
        uint inputAmount,
        uint inputReserve,
        uint outputReserve
    ) public pure returns (uint) {
        require(inputReserve > 0 && outputReserve > 0, "invalid reserves");

        uint inputAmountWithFee = inputAmount * 99;
        uint numerator = inputAmountWithFee * outputReserve;
        uint denominator = inputReserve * 100 + inputAmountWithFee;

        return numerator / denominator;
    }

    function ethToCryptoDevToken(uint _minTokens) payable public {
        uint tokenReserve = getReserve();
        uint tokenBought = getAmountOfTokens(
                msg.value,
                address(this).balance - msg.value,
                tokenReserve
            );

        require(tokenBought >= _minTokens, "insufficient output amount");
        ERC20(cryptoDevTokenAddress).transfer(msg.sender, tokenBought);
    }

    function cryptoDevTokenToEth(uint _tokenSold, uint _minEth) public {
        uint tokenReserve = getReserve();
        uint ethBought = getAmountOfTokens(
            _tokenSold,
            tokenReserve,
            address(this).balance
        );
        require(ethBought >= _minEth, "insufficient output amount");
        ERC20(cryptoDevTokenAddress).transferFrom(
            msg.sender, 
            address(this), 
            _tokenSold
            );
        payable(msg.sender).transfer(ethBought);
    }
    
}

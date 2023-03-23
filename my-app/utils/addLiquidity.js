import { Contract, utils } from "ethers";

import {TOKEN_CONTRACT_ADDRESS, 
    TOKEN_CONTRACT_ABI, 
    EXCHANGE_CONTRACT_ABI, 
    EXCHANGE_CONTRACT_ADDRESS
} from "../constants";

/**
 * addLiquidity helps add liquidity to the exchange,
 * If the user is adding initial liquidity, user decides the ether and CD tokens he wants to add
 * to the exchange. If he is adding the liquidity after the initial liquidity has already been added
 * then we calculate the Crypto Dev tokens he can add, given the Eth he wants to add by keeping the ratios
 * constant
 */

export const addLiquidity = async (signer, addCDAmountWei, addEtherAmountWei) => {
    try {
        const tokenContract = new Contract(
            TOKEN_CONTRACT_ADDRESS,
            TOKEN_CONTRACT_ABI,
            signer
        );
        const exchangeContract = new Contract(
            EXCHANGE_CONTRACT_ADDRESS,
            EXCHANGE_CONTRACT_ABI,
            signer
        );

        let tx = await tokenContract.approve(
            EXCHANGE_CONTRACT_ADDRESS,
            addCDAmountWei.toString()
        )
        await tx.wait();

        tx = await exchangeContract.addLiquidity(addCDAmountWei, { value: addEtherAmountWei});
        await tx.wait();

        
    } catch (err) {
        console.error(err);
    }
}

/**
 * calculateCD calculates the CD tokens that need to be added to the liquidity
 * given `_addEtherAmountWei` amount of ether
 */

export const calculateCD = async (  
    _addEther = "0",
    etherBalanceContract,
    cdTokenReserve) => {
    
    const _addEtherAmountWei = utils.parseEther(_addEther);
    const cryptoDevTokenAmount = _addEtherAmountWei.mul(cdTokenReserve).div(etherBalanceContract);
    return cryptoDevTokenAmount;
}
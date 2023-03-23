import { Contract } from "ethers";

import {TOKEN_CONTRACT_ADDRESS, 
    TOKEN_CONTRACT_ABI, 
    EXCHANGE_CONTRACT_ABI, 
    EXCHANGE_CONTRACT_ADDRESS
} from "../constants";

/**
 * removeLiquidity: Removes the `removeLPTokensWei` amount of LP tokens from
 * liquidity and also the calculated amount of `ether` and `CD` tokens
 */

export const removeLiquidity = async (signer, removeLPTokensWei, ) => {
    try {
        const exchangeContract = new Contract(
            EXCHANGE_CONTRACT_ADDRESS,
            EXCHANGE_CONTRACT_ABI,
            signer
        );

        const tx = await exchangeContract.removeLiquidity(removeLPTokensWei);
        await tx.wait();

    } catch (err) {
        console.error(err);
    }
}

/**
 * getTokensAfterRemove: Calculates the amount of `Eth` and `CD` tokens
 * that would be returned back to user after he removes `removeLPTokenWei` amount
 * of LP tokens from the contract
 */

export const getTokensAfterRemove = async ( 
    provider, 
    removeLPTokenWei,
    _etherBalance,
    cryptoDevTokenReserve) => {

    try {
        const exchangeContract = new Contract(
            EXCHANGE_CONTRACT_ADDRESS,
            EXCHANGE_CONTRACT_ABI,
            provider, 
        );

        const _totalSupply = await exchangeContract.totalSupply();
        const _removeEther = _etherBalance.mul(removeLPTokenWei).div(_totalSupply);
        const _removeCD = cryptoDevTokenReserve.mul(removeLPTokenWei).div(_totalSupply);
        return {_removeEther, _removeCD}

    } catch (err) {
        console.error(err);
    }
}
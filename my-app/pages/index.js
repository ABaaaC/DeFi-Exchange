import Head from 'next/head'
// import Image from 'next/image'
import styles from '@/styles/Home.module.css'
import React, { useEffect, useRef, useState } from "react"

import { utils, BigNumber, providers } from "ethers"
import Web3Modal from "web3modal"

import { removeLiquidity, getTokensAfterRemove } from '../utils/removeLiquidity';
import { addLiquidity, calculateCD } from '../utils/addLiquidity';
import { getAmountOfTokenReceivedFromSwap, swapTokens } from '../utils/swap';
import {
  getEtherBalance,
  getCDTokensBalance,
  getLPTokensBalance,
  getReserveOfCDTokens
} from '../utils/getAmounts';


export default function Home() {

  const [walletConnected, setWalletConnected] = useState(false);
  const [loading, setLoading] = useState(false);
  const [liquidityTab, setLiquidityTab] = useState(false);

  const zero = BigNumber.from(0);

  const [etherBalance, setEtherBalance] = useState(zero);
  const [cdBalance, setCDBalance] = useState(zero);
  const [lpBalance, setLPBalance] = useState(zero);
  const [reservedCD, setReservedCD] = useState(zero);
  const [etherBalanceContract, setEtherBalanceContract] = useState(zero);

  const [swapAmount, setSwapAmount] = useState("");
  const [ethSelected, setEthSelected] = useState(true);
  const [tokenToBeReceivedAfterSwap, setTokenToBeReceivedAfterSwap] = useState(zero);


  // const [addEther, setAddEther] = useState(zero);
  const [addEther, setAddEther] = useState("0");
  const [addCDTokens, setAddCDTokens] = useState(zero);
  const [removeLPTokens, setRemoveLPTokens] = useState("0");
  const [removeEther, setRemoveEther] = useState(zero);
  const [removeCDTokens, setRemoveCDTokens] = useState(zero);

  const web3ModalRef = useRef();



  /**
 * getAmounts call various functions to retrive amounts for ethbalance,
 * LP tokens etc
 */

  const getAmounts = async () => {
    try {
      const provider = await getProviderOrSigner();
      const signer = await getProviderOrSigner(true);
      const address = await signer.getAddress();

      const _ethBalance = await getEtherBalance(provider, address);
      const _cdBalance = await getCDTokensBalance(provider, address);
      const _lpBalance = await getLPTokensBalance(provider, address);
      const _reservedCD = await getReserveOfCDTokens(provider, address);
      const _ethContractBalance = await getEtherBalance(provider, null, true);

      setEtherBalance(_ethBalance);
      setCDBalance(_cdBalance);
      setLPBalance(_lpBalance);
      setReservedCD(_reservedCD);
      setEtherBalanceContract(_ethContractBalance);

    } catch (err) {
      console.error(err);
    }
  }
  /**** SWAP FUNCTIONS ****/

  /**
   * _swapTokens: Swaps  `swapAmountWei` of Eth/Crypto Dev tokens with `tokenToBeReceivedAfterSwap` amount of Eth/Crypto Dev tokens.
   */
  const _swapTokens = async () => {
    try {
      const swapAmountWei = utils.parseEther(swapAmount);
      if (!swapAmountWei.eq(zero)) {
        const signer = await getProviderOrSigner(true);
        setLoading(true);
        await swapTokens(signer, swapAmountWei, tokenToBeReceivedAfterSwap, ethSelected);
        setLoading(false);
        await getAmounts();
        setSwapAmount("");
      }

    } catch (err) {
      console.error(err);
      setLoading(false);
      setSwapAmount("");

    }
  }

  /**
 * _getAmountOfTokensReceivedFromSwap:  Returns the number of Eth/Crypto Dev tokens that can be received
 * when the user swaps `_swapAmountWEI` amount of Eth/Crypto Dev tokens.
 */
  const _getAmountOfTokensReceivedFromSwap = async (_swapAmount) => {
    try {
      const _swapAmountWei = utils.parseEther(_swapAmount.toString());
      if (!_swapAmountWei.eq(zero)) {
        const provider = await getProviderOrSigner(false);
        const amountOfTokens = await getAmountOfTokenReceivedFromSwap(_swapAmountWei, provider, ethSelected, etherBalance, reservedCD);
        setTokenToBeReceivedAfterSwap(amountOfTokens);
      } else {
        setTokenToBeReceivedAfterSwap(zero);
      }

    } catch (err) {
      console.error(err);
    }
  }

  /*** END ***/

  /**** ADD LIQUIDITY FUNCTIONS ****/

  /**
   * _addLiquidity helps add liquidity to the exchange,
   * If the user is adding initial liquidity, user decides the ether and CD tokens he wants to add
   * to the exchange. If he is adding the liquidity after the initial liquidity has already been added
   * then we calculate the crypto dev tokens he can add, given the Eth he wants to add by keeping the ratios
   * constant
   */

  const _addLiquidity = async () => {
    try {
      const addEtherWei = utils.parseEther(addEther.toString());
      if (!addEtherWei.eq(zero) && !addCDTokens.eq(zero)) {
        const signer = await getProviderOrSigner(true);
        setLoading(true);
        await addLiquidity(signer, addCDTokens, addEtherWei);
        setLoading(false);
        setAddCDTokens(zero);
        await getAmounts();
      } else {
        setAddCDTokens(zero);
      }

    } catch (err) {
      console.error(err);
      setLoading(false);
      setAddCDTokens(zero);
    }
  }

  /**** END ****/

  /**** REMOVE LIQUIDITY FUNCTIONS ****/

  /**
   * _removeLiquidity: Removes the `removeLPTokensWei` amount of LP tokens from
   * liquidity and also the calculated amount of `ether` and `CD` tokens
   */

  const _removeLiquidity = async () => {
    try {
      const removeLPTokensWei = utils.parseEther(removeLPTokens);
      const signer = await getProviderOrSigner(true);
      setLoading(true);
      await removeLiquidity(signer, removeLPTokensWei);
      setLoading(false);
      setRemoveEther(zero);
      setRemoveCDTokens(zero);
      await getAmounts();

    } catch (err) {
      console.error(err);
      setLoading(false);
      setRemoveEther(zero);
      setRemoveCDTokens(zero);
    }
  }


  /**
 * _getTokensAfterRemove: Calculates the amount of `Ether` and `CD` tokens
 * that would be returned back to user after he removes `removeLPTokenWei` amount
 * of LP tokens from the contract
 */

  const _getTokensAfterRemove = async (_removeLPTokens) => {
    try {
      const provider = await getProviderOrSigner(false);
      const removeLPTokensWei = utils.parseEther(_removeLPTokens);
      const _ethBalance = await getEtherBalance(provider, null, true);
      const cryptoDevTokenReserve = await getReserveOfCDTokens(provider, null);
      const { _removeEther, _removeCD } = await getTokensAfterRemove(provider, removeLPTokensWei, _ethBalance, cryptoDevTokenReserve);
      setRemoveEther(_removeEther);
      setRemoveCDTokens(_removeCD);
      await getAmounts();


    } catch (err) {
      console.error(err);
    }
  }

  /**** END ****/

  /**
   * connectWallet: Connects the MetaMask wallet
   */

  const connectWallet = async () => {
    try {
      await getProviderOrSigner();
      setWalletConnected(true);
    } catch (error) {
      console.error(error);
    }
  }

  /**
 * Returns a Provider or Signer object representing the Ethereum RPC with or
 * without the signing capabilities of Metamask attached
 *
 * A `Provider` is needed to interact with the blockchain - reading
 * transactions, reading balances, reading state, etc.
 *
 * A `Signer` is a special type of Provider used in case a `write` transaction
 * needs to be made to the blockchain, which involves the connected account
 * needing to make a digital signature to authorize the transaction being
 * sent. Metamask exposes a Signer API to allow your website to request
 * signatures from the user using Signer functions.
 *
 * @param {*} needSigner - True if you need the signer, default false
 * otherwise
 */

  const getProviderOrSigner = async (needSigner = false) => {
    const provider = await web3ModalRef.current.connect();
    const web3Provider = new providers.Web3Provider(provider);

    const { chainId } = await web3Provider.getNetwork();
    if (chainId !== 5) {
      window.alert("Please, change the network to the Goerli!" + chainId);
      throw new Error("Incorrect network: " + chainId);
    }

    if (needSigner) {
      const signer = web3Provider.getSigner();
      return signer;
    }
    return web3Provider;
  }


  // useEffects are used to react to changes in state of the website
  // The array at the end of function call represents what state changes will trigger this effect
  // In this case, whenever the value of `walletConnected` changes - this effect will be called

  useEffect(() => {
    if (!walletConnected) {
      web3ModalRef.current = new Web3Modal({
        network: "goerli",
        providerOptions: {},
        disableInjectedProvider: false
      })
    } else {
      getAmounts();
    }

  }, [walletConnected]);


  /*
    renderButton: Returns a button based on the state of the dapp
*/

  function renderConnectButton() {
    if (!walletConnected) {
      return (
        <div>
          <div className={styles.description}>
            The place where you can exchange your Crypro Dev Tokens!
          </div>
          <div>
            <button className={styles.button} onClick={connectWallet}>
              Connect Wallet
            </button>
          </div>
        </div>
      )
    }
  }

  function renderDEX() {
    if (loading) {
      return <button className={styles.button}>Loading...</button>;
    }
    let renderTab;
    
    if (liquidityTab) {
      renderTab = renderLiquidity;
    } else {
      renderTab = renderSwap;
    }

    return (
      <div>
        <div className={styles.description}>
          Exchange Ethereum &#60;&#62; Crypto Dev Tokens
        </div>
        <div>
          <button className={styles.button} onClick={() => {
            setLiquidityTab(true);
          }}>
            Liquidity
          </button>
          <button className={styles.button} onClick={() => {
            setLiquidityTab(false);
          }}>
            Swap
          </button>
        </div>
        <div>
          {renderTab()}
        </div>

      </div>
    )
  }

  function renderLiquidity() {
    return (
      <div>
        <div className={styles.description}>
          You have:
          <br />
          {utils.formatEther(etherBalance)} Ether
          <br />
          {utils.formatEther(cdBalance)} Cryprto Dev Tokens
          <br />
          {utils.formatEther(lpBalance)} Cryprto Dev LP Tokens
        </div>

        <div>
          {utils.parseEther(reservedCD.toString()).eq(zero) ? (
            <div>
              <input
                type='number'
                placeholder='Amount of Ether'
                className={styles.input}
                onChange={(e) => setAddEther(e.target.value || "0")}
              />
              <input
                type='number'
                placeholder='Amount of CD Tokens'
                className={styles.input}
                onChange={(e) => setAddCDTokens(BigNumber.from(utils.parseEther(e.target.value || "0")))}
              />
              <button className={styles.button1} onClick={_addLiquidity}>
                Add
              </button>
            </div>
          ) : (
            <div>
              <input
                type='number'
                placeholder='Amount of Ether'
                className={styles.input}
                onChange={async (e) => {
                  setAddEther(e.target.value || "0");
                  const _addCDTokens = await calculateCD(e.target.value || "0", etherBalanceContract, reservedCD);
                  setAddCDTokens(_addCDTokens);
                }}
              />
              <div className={styles.inputDiv}>
                {`You will need ${utils.formatEther(addCDTokens)} Crypto Dev Tokens.`}
              </div>
              <button className={styles.button1} onClick={_addLiquidity}>
                Add
              </button>
            </div>
          )
          }
        </div>
        {(!etherBalanceContract.eq(zero)) ? (
          <div>
            <input
              type='number'
              placeholder='Amount of LP Tokens:'
              className={styles.input}
              onChange={async (e) => {
                setRemoveLPTokens(e.target.value || "0");
                await _getTokensAfterRemove(e.target.value || "0");
              }}
            />
            <div className={styles.inputDiv}>
              {`You will get ${utils.formatEther(removeEther)} Eth and ${utils.formatEther(removeCDTokens)} Crypto Dev Tokens.`}
            </div>
            <button className={styles.button1} onClick={_removeLiquidity}>
              Remove
            </button>
          </div>
        ) : ('')}

      </div>
    )

  }

  function renderSwap() {
    return (
      <div>
        <div>
          <input
            type='number'
            placeholder='Amount'
            className={styles.input}
            onChange={async (e) => {
              setSwapAmount(e.target.value || "");
              await _getAmountOfTokensReceivedFromSwap(e.target.value || "0");
            }}
            value={swapAmount}
          />
          <select
            className={styles.select}
            name="dropdown"
            id="dropdown"
            value={ethSelected ? "eth" : "cryptoDevToken"}
            onChange={async (e) => {
              setEthSelected(!ethSelected);
              await _getAmountOfTokensReceivedFromSwap(0);
              setSwapAmount("");
            }}
          >
            <option value="eth">Ethereum</option>
            <option value="cryptoDevToken">Crypto Dev Token</option>
          </select>
          <br />
          <div className={styles.inputDiv}>
            {ethSelected ? `You will get ${utils.formatEther(
              tokenToBeReceivedAfterSwap
            )} Crypto Dev Tokens` :
              `You will get ${utils.formatEther(
                tokenToBeReceivedAfterSwap
              )} Eth`
            }


          </div>

          <button className={styles.button1} onClick={_swapTokens}>
            Swap
          </button>
        </div>
      </div>
    )
  }



  return (
    <div>
      <Head>
        <title>
          CryptoDevs DEX
        </title>
        <meta name="description" content="DEX" />
        <link rel="icon" href="/favicon.ico" />
      </Head>

      <div className={styles.main}>
        <div>
          <div>
            <h1 className={styles.title}>
              Welcome to Crypro Devs DEX!
            </h1>

          </div>

          {walletConnected ? renderDEX() : renderConnectButton()}

        </div>

        <div>
          <img className={styles.image} src='/0.svg' />
        </div>

      </div>



      <footer className={styles.footer}>
        From ABaaaC with &#9829;
      </footer>
    </div>
  )
}

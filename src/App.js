import { Alchemy, Network, Utils } from "alchemy-sdk";
import { useEffect, useState } from "react";
import {
  BrowserRouter as Router,
  Route,
  useParams,
  Link,
} from "react-router-dom";

import "./App.css";

const settings = {
  apiKey: process.env.REACT_APP_ALCHEMY_API_KEY,
  network: Network.ETH_MAINNET,
};

const alchemy = new Alchemy(settings);

const App = () => {
  const [blockNumber, setBlockNumber] = useState(0);

  useEffect(() => {
    async function getBlockNumber() {
      const latestBlockNumber = await alchemy.core.getBlockNumber();
      setBlockNumber(latestBlockNumber);
    }

    getBlockNumber();
  }, []);

  return (
    <Router>
      <div className="App">
        <NavBar />
        <Route exact path="/">
          {blockNumber && <Home latestBlock={blockNumber} />}
        </Route>
        <Route path="/block/:blockNumber">
          <Block />
        </Route>
        <Route path="/transaction/:txHash">
          <Transaction />
        </Route>
        <Route path="/accounts">
          <Accounts />
        </Route>
      </div>
    </Router>
  );
};

const NavBar = () => (
  <nav className="navbar">
    <ul className="navbar-list">
      <li className="navbar-item">
        <Link to="/">Home</Link>
      </li>
      <li className="navbar-item">
        <Link to="/accounts">Accounts</Link>
      </li>
    </ul>
  </nav>
);

const Home = ({ latestBlock }) => {
  const [latestBlocks, setLatestBlocks] = useState([]);

  useEffect(() => {
    const fetchBlocks = async () => {
      const blocks = [];
      for (let i = 0; i < 10; i++) {
        blocks.push(latestBlock - i);
      }

      const blockDetails = [];
      for (const block of blocks) {
        const blocker = await alchemy.core.getBlock(block);
        blockDetails.push({ block, blocker });
      }

      setLatestBlocks(blockDetails);
    };

    fetchBlocks();
  }, [latestBlock]);

  return (
    <div className="latest_container">
      Latest Blocks:
      {latestBlocks.map((blockDetails) => (
        <div className="block__container" key={blockDetails.block}>
          <img
            className="block__image"
            src="https://www.svgrepo.com/show/15257/cube-outline.svg"
            alt="block"
          />
          <a href={`/block/${blockDetails.block}`}>
            Block: {blockDetails.block}
          </a>
          <span className="block__miner">
            Miner: {blockDetails.blocker.miner}
          </span>
          <span className="block__fees">
            Gas Used: {Utils.formatEther(blockDetails.blocker.gasUsed)} ETH
          </span>
        </div>
      ))}
    </div>
  );
};

const Block = () => {
  const BlockTransaction = ({
    transaction: { hash, blockNumber, from, to, value },
  }) => {
    return (
      <div className="transaction__container">
        <div className="transaction__hash">
          Txn Hash:{" "}
          <a href={`/transaction/${hash}`}>
            {hash.slice(0, -1 * (hash.length - 18))}
          </a>
          ...
        </div>
        <div className="transaction_block-num">Block No: {blockNumber}</div>
        <div className="transaction_sender">From: {from}</div>
        <div className="transaction_receiver">To: {to}</div>
        <div className="transaction_val">
          Value: {Utils.formatEther(value)} ETH
        </div>
      </div>
    );
  };

  const [transactions, setTransactions] = useState([]);
  const { blockNumber } = useParams();

  useEffect(() => {
    async function getTransactions() {
      try {
        const block = await alchemy.core.getBlockWithTransactions(
          Utils.hexlify(+blockNumber)
        );
        setTransactions(block.transactions);
      } catch (error) {
        console.error("Error fetching transactions:", error);
      }
    }

    if (blockNumber) {
      getTransactions();
    }
  }, [blockNumber]);

  const txElArr = transactions?.map((tx, i) => (
    <BlockTransaction transaction={tx} key={`${tx.transactionHash}${i}`} />
  ));

  return (
    <div className="transactions__container">
      Block Number: {blockNumber} <br />
      {txElArr}
    </div>
  );
};

const Transaction = () => {
  const { txHash } = useParams();
  const [receipt, setReceipt] = useState();

  useEffect(() => {
    const getTx = async () => {
      const txReceipt = await alchemy.core.getTransactionReceipt(txHash);
      const ethersProvider = await alchemy.config.getProvider();
      txReceipt["transaction"] = await ethersProvider.getTransaction(txHash);
      setReceipt(txReceipt);
    };

    getTx();
  });

  if (!receipt) {
    return <></>;
  }

  const {
    status,
    blockNumber,
    from,
    to,
    confirmations,
    effectiveGasPrice,
    gasUsed,
    type,
    transactionIndex,
  } = receipt;
  const confirmationsStr = ` (${confirmations} Block Confirmations)`;
  const { value, nonce } = receipt?.transaction;

  return (
    <div className="transaction__container transaction__container--details">
      <span className="transaction__container__details-header">
        Transaction Receipt
      </span>
      <span>Transaction Hash: {txHash}</span>
      <span>Status: {status ? "Successful" : "Failed"}</span>
      <span>
        Block Number: <a href={`/block/${blockNumber}`}>{blockNumber}</a>
        {confirmationsStr}
      </span>
      <br />
      <span>From: {from}</span>
      <span>To: {to}</span>
      <br />
      <span>Value: {Utils.formatEther(value)} ETH</span>
      <span>Gas Used: {Utils.formatEther(gasUsed)} ETH</span>
      <span>Gas Price: {Utils.formatEther(effectiveGasPrice)} ETH</span>
      <br />
      <span>Transaction Type: {type}</span>
      <span>Nonce: {nonce}</span>
      <span>Position in Block: {transactionIndex}</span>
    </div>
  );
};

const Accounts = () => {
  const [walletAddr, setWalletAddr] = useState();
  const [accountBalance, setAccountBalance] = useState();
  const [accountNfts, setAccountNfts] = useState();

  const onWalletChange = (event) => {
    setWalletAddr(event.target.value);
  };

  const updateWalletData = async (ev) => {
    if (ev.code === "Enter" || ev.type === "click") {
      try {
        setAccountBalance(await alchemy.core.getBalance(walletAddr));
        setAccountNfts(await alchemy.nft.getNftsForOwner(walletAddr));
      } catch (err) {
        console.error(
          `Invalid wallet address or name provided - please try again!\n${err}`
        );
      }
    }
  };

  return (
    <div className="account__container">
      <span>
        Wallet Address:
        <input
          type="text"
          onChange={onWalletChange}
          placeholder="Input Wallet Address"
          onKeyDown={updateWalletData}
        />
        <button onClick={updateWalletData}>Submit</button>
      </span>

      {accountBalance && (
        <span className="account__balance">
          Current Balance: {Utils.formatEther(accountBalance)} ETH
        </span>
      )}
      <br />
      {accountNfts?.ownedNfts?.length > 0 && (
        <div>
          Owned NFT's:
          <span className="account__nfts">
            {accountNfts?.ownedNfts?.map((nft, i) => {
              const image =
                nft.media[0]?.thumbnail ||
                "https://static.thenounproject.com/png/3918097-200.png";
              return (
                <div className="account__nfts__nft" key={image + i}>
                  <img
                    src={image}
                    className="account__nfts__nft-image"
                    alt="token"
                  />
                  <span>{nft.title || 'Untitled'}</span>
                </div>
              );
            })}
          </span>
        </div>
      )}
    </div>
  );
};

export default App;

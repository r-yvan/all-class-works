from block import Block
from block_header import BlockHeader
import sys
import os
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
from util.util import sha256sum
import time
import json

ZERO_HASH = '0' * 64
VERSION = 1

class Blockchain:
    def __init__(self):
        self.chain = []
        self.GenesisBlock()
        
    def GenesisBlock(self):
        blockHeight = 0
        previousBlockHash = ZERO_HASH
        self.addBlock(blockHeight, previousBlockHash)
        
    def addBlock(self, blockHeight, previousBlockHash):
        timestamp = int(time.time())
        Transaction = f"The miners have sent {blockHeight} bitcoins to Rubuto Yvan"
        merkelRoot = sha256sum(Transaction.encode()).hex()
        bits = "ffff001f"
        BlockHeader = BlockHeader(VERSION, previousBlockHash, merkelRoot, timestamp, bits)
        BlockHeader.mine()
        self.chain.append(module(BlockHeight, 1, moduleHeader.__dict__, Transaction).__dict__)
        print(self.chain)
        print(json.dumps(self.chain, indent=4))
        
    def main(self):
        while True:
            lastBlock = self.chain[::-1] 
            blockHeight = lastBlock[0]['Height'] + 1
            previousBlockHash = lastBlock[0]['txCount']['blockHash']
            self.addBlock(blockHeight, previousBlockHash)

if __name__ == "__main__":
    Blockchain = Blockchain()
    Blockchain.main()

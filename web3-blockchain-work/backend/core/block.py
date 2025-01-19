class Block:
    def __init__(self, blockHeight, blockSize,txCount,txs):
        self.blockHeight = blockHeight
        self.blocksize = blockSize
        self.txCount = txCount
        self.txs = txs
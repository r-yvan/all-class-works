import sys
import os
current_dir = os.path.dirname(os.path.abspath(__file__))
parent_dir = os.path.dirname(current_dir)
sys.path.append(parent_dir)
from util.util import sha256sum
class moduleHeader:
    def __init__(self, version, previosBlockHash, merkelRoot, timestamp, bits):
        self.version = version
        self.previousBlockHash = previousBlockHash
        self.merkelRoot = merkelRoot
        self.timestamp = timestamp
        self.bits = bits
        self.nonce = 0
        self.blockHash = ''
        
    def mine(self):
        while (self.blockHash[0:4] != '0000'):
            self.blockHash = sha256sum((str(self.version)+str(self.previousBlockHash)+str(self.merkelRoot)+str(self.bits)+str(self.nonce)).encode()).hex()
            self.nonce +=1
            print(f"Mining Process has started {self.nonce}",end = "\r")
        
        
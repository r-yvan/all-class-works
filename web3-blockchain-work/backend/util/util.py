import hashlib

def twoLayerhash256(string):
    """
    Two rounds of SHA256
    """
    return hashlib.sha256(hashlib.sha256(string).digest()).digest()
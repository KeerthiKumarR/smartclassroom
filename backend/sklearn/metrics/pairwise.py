import numpy as np

def cosine_similarity(X, Y):
    """
    Computes cosine similarity between two matrices X and Y.
    Mimics sklearn.metrics.pairwise.cosine_similarity exactly.
    """
    X = np.asarray(X)
    Y = np.asarray(Y)
    
    # Ensure they are 2D arrays
    if X.ndim == 1:
        X = X.reshape(1, -1)
    if Y.ndim == 1:
        Y = Y.reshape(1, -1)
        
    # Calculate dot product
    dot_product = np.dot(X, Y.T)
    
    # Calculate norms
    norm_X = np.linalg.norm(X, axis=1, keepdims=True)
    norm_Y = np.linalg.norm(Y, axis=1, keepdims=True)
    
    # Avoid divide by zero
    norm_X[norm_X == 0] = 1e-6
    norm_Y[norm_Y == 0] = 1e-6
    
    return dot_product / (norm_X * norm_Y.T)

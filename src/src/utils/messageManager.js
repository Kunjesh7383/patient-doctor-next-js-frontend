class MessageManager {
  constructor() {
    this.processedMessages = new Set();
    this.suggestionCache = new Map();
    this.lastProcessedTimestamp = null;
    this.processingQueue = new Set();
  }

  shouldProcessMessage(messageId, timestamp) {
    // Check if already processed
    if (this.processedMessages.has(messageId)) {
      return false;
    }

    // Check if currently processing
    if (this.processingQueue.has(messageId)) {
      return false;
    }

    // Check timestamp to prevent old messages
    if (
      this.lastProcessedTimestamp &&
      timestamp <= this.lastProcessedTimestamp
    ) {
      return false;
    }

    return true;
  }

  startProcessing(messageId) {
    this.processingQueue.add(messageId);
  }

  finishProcessing(messageId, timestamp) {
    this.processingQueue.delete(messageId);
    this.processedMessages.add(messageId);
    this.lastProcessedTimestamp = Math.max(
      this.lastProcessedTimestamp || 0,
      timestamp
    );
  }

  getCachedSuggestions(messageContent, ragType) {
    const key = `${messageContent}_${ragType}`;
    const cached = this.suggestionCache.get(key);

    if (cached && Date.now() - cached.timestamp < 300000) {
      // 5 minute cache
      return cached.suggestions;
    }

    return null;
  }

  cacheSuggestions(messageContent, ragType, suggestions) {
    const key = `${messageContent}_${ragType}`;
    this.suggestionCache.set(key, {
      suggestions,
      timestamp: Date.now(),
    });
  }

  clearCache() {
    this.suggestionCache.clear();
  }

  reset() {
    this.processedMessages.clear();
    this.suggestionCache.clear();
    this.processingQueue.clear();
    this.lastProcessedTimestamp = null;
  }
}

export const messageManager = new MessageManager();

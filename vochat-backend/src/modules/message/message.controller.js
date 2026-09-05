// ============================================
// VoChat - Message Controller
// ============================================

const messageService = require('./message.service');
const ApiResponse = require('../../utils/ApiResponse');

class MessageController {
  async sendMessage(req, res, next) {
    try {
      const message = await messageService.sendMessage(req.userId, req.body);
      ApiResponse.created(res, 'Message sent', { message });
    } catch (error) {
      next(error);
    }
  }

  async markAsPlayed(req, res, next) {
    try {
      const { messageId } = req.body;
      const message = await messageService.markAsPlayed(req.userId, messageId);
      ApiResponse.success(res, 200, 'Message marked as played', { message });
    } catch (error) {
      next(error);
    }
  }

  async getConversation(req, res, next) {
    try {
      const { friendId } = req.params;
      const { limit, cursor } = req.query;
      
      const messages = await messageService.getConversation(
        req.userId, 
        friendId, 
        limit ? parseInt(limit) : 50, 
        cursor
      );
      
      ApiResponse.success(res, 200, 'Conversation retrieved', { messages });
    } catch (error) {
      next(error);
    }
  }

  async getConversationsList(req, res, next) {
    try {
      const conversations = await messageService.getConversationsList(req.userId);
      ApiResponse.success(res, 200, 'Conversations retrieved', { conversations });
    } catch (error) {
      next(error);
    }
  }
}

module.exports = new MessageController();

// ============================================
// VoChat - Posts Service
// ============================================

const prisma = require('../../config/database');
const { NotFoundError, BadRequestError } = require('../../utils/ApiError');

class PostsService {
  /**
   * Create a new voice post
   */
  async createPost(userId, data) {
    const { audioUrl, duration, caption, voiceFilter, audience } = data;

    if (!audioUrl) {
      throw new BadRequestError('audioUrl is required');
    }

    return await prisma.post.create({
      data: {
        userId,
        audioUrl,
        duration: parseInt(duration) || 0,
        caption,
        voiceFilter,
        audience: audience || 'ALL',
      },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            username: true,
            avatarUrl: true,
          }
        }
      }
    });
  }

  /**
   * Get main feed of posts (public reels + friends' posts)
   */
  async getFeed(userId) {
    // Return all posts in chronological order, including count and interaction states
    const posts = await prisma.post.findMany({
      orderBy: {
        createdAt: 'desc',
      },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            username: true,
            avatarUrl: true,
          }
        },
        likes: {
          where: {
            userId: userId,
          },
          select: {
            id: true,
          }
        },
        bookmarks: {
          where: {
            userId: userId,
          },
          select: {
            id: true,
          }
        },
        _count: {
          select: {
            likes: true,
            comments: true,
            bookmarks: true,
          }
        }
      }
    });

    // Map fields for client compatibility
    return posts.map(post => ({
      ...post,
      isLiked: post.likes.length > 0,
      isBookmarked: post.bookmarks.length > 0,
      likesCount: post._count.likes,
      commentsCount: post._count.comments,
      bookmarksCount: post._count.bookmarks,
      likes: undefined,
      bookmarks: undefined,
      _count: undefined,
    }));
  }

  /**
   * Toggle like state for a post
   */
  async toggleLike(userId, postId) {
    const postExists = await prisma.post.findUnique({
      where: { id: postId },
    });

    if (!postExists) {
      throw new NotFoundError('Post not found');
    }

    const existingLike = await prisma.like.findUnique({
      where: {
        userId_postId: {
          userId,
          postId,
        }
      }
    });

    if (existingLike) {
      await prisma.like.delete({
        where: {
          userId_postId: {
            userId,
            postId,
          }
        }
      });
      return { liked: false };
    } else {
      await prisma.like.create({
        data: {
          userId,
          postId,
        }
      });
      return { liked: true };
    }
  }

  /**
   * Toggle bookmark state for a post
   */
  async toggleBookmark(userId, postId) {
    const postExists = await prisma.post.findUnique({
      where: { id: postId },
    });

    if (!postExists) {
      throw new NotFoundError('Post not found');
    }

    const existingBookmark = await prisma.bookmark.findUnique({
      where: {
        userId_postId: {
          userId,
          postId,
        }
      }
    });

    if (existingBookmark) {
      await prisma.bookmark.delete({
        where: {
          userId_postId: {
            userId,
            postId,
          }
        }
      });
      return { bookmarked: false };
    } else {
      await prisma.bookmark.create({
        data: {
          userId,
          postId,
        }
      });
      return { bookmarked: true };
    }
  }

  /**
   * Add a comment to a post
   */
  async addComment(userId, postId, text) {
    if (!text || text.trim() === '') {
      throw new BadRequestError('Comment text is required');
    }

    const postExists = await prisma.post.findUnique({
      where: { id: postId },
    });

    if (!postExists) {
      throw new NotFoundError('Post not found');
    }

    return await prisma.comment.create({
      data: {
        userId,
        postId,
        text,
      },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            username: true,
            avatarUrl: true,
          }
        }
      }
    });
  }

  /**
   * Get all comments for a post
   */
  async getComments(postId) {
    const postExists = await prisma.post.findUnique({
      where: { id: postId },
    });

    if (!postExists) {
      throw new NotFoundError('Post not found');
    }

    return await prisma.comment.findMany({
      where: { postId },
      orderBy: { createdAt: 'asc' },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            username: true,
            avatarUrl: true,
          }
        }
      }
    });
  }
}

module.exports = new PostsService();

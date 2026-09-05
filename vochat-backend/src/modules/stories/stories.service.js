// ============================================
// VoChat - Stories Service
// ============================================

const prisma = require('../../config/database');
const { BadRequestError } = require('../../utils/ApiError');

class StoriesService {
  /**
   * Create a new ephemeral story (expires in 24 hours)
   */
  async createStory(userId, data) {
    const { audioUrl, duration, caption, voiceFilter } = data;

    if (!audioUrl) {
      throw new BadRequestError('audioUrl is required');
    }

    const expiresAt = new Date();
    expiresAt.setHours(expiresAt.getHours() + 24); // Stories expire in 24 hours

    return await prisma.story.create({
      data: {
        userId,
        audioUrl,
        duration: parseInt(duration) || 0,
        caption,
        voiceFilter,
        expiresAt,
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
   * Mark a story as viewed by current user (One-time seen policy)
   */
  async markStoryViewed(userId, storyId) {
    if (!storyId) return null;
    try {
      return await prisma.storyView.upsert({
        where: {
          storyId_userId: {
            storyId,
            userId,
          }
        },
        update: {},
        create: {
          storyId,
          userId,
        }
      });
    } catch (e) {
      return null;
    }
  }

  /**
   * Get active stories feed (Exclude stories already viewed by current user for one-time seen policy)
   */
  async getFeed(userId) {
    const now = new Date();

    // Fetch stories where expiresAt > now and current user hasn't viewed it yet
    const stories = await prisma.story.findMany({
      where: {
        expiresAt: {
          gt: now,
        },
        OR: [
          { userId: userId }, // Always include own stories
          {
            views: {
              none: {
                userId: userId,
              }
            }
          }
        ]
      },
      orderBy: {
        createdAt: 'asc',
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

    // Group stories by user
    const groupedMap = new Map();
    stories.forEach((story) => {
      const u = story.user;
      if (!groupedMap.has(u.id)) {
        groupedMap.set(u.id, {
          user: u,
          stories: [],
        });
      }
      groupedMap.get(u.id).stories.push({
        id: story.id,
        audioUrl: story.audioUrl,
        duration: story.duration,
        caption: story.caption,
        voiceFilter: story.voiceFilter,
        createdAt: story.createdAt,
      });
    });

    return {
      storyGroups: Array.from(groupedMap.values()),
      stories,
    };
  }
}

module.exports = new StoriesService();

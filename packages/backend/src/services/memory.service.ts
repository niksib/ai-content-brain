import { prisma } from "../lib/prisma.js";
import {
  CANONICAL_KEYS,
  isCanonicalKey,
  type CanonicalKeyDefinition,
} from "../memory/canonical-keys.js";

export interface MemoryMapEntry {
  key: string;
  title: string;
  description: string;
}

export interface MemoryBlockData {
  key: string;
  title: string;
  description: string;
  content: string;
}

export class MemoryService {
  async getMemoryMap(userId: string): Promise<MemoryMapEntry[]> {
    const blocks = await prisma.memoryBlock.findMany({
      where: { userId },
      select: { key: true, title: true, description: true },
      orderBy: { createdAt: "asc" },
    });
    return blocks;
  }

  async readMemory(userId: string, keys: string[]): Promise<MemoryBlockData[]> {
    if (keys.length === 0) return [];
    const blocks = await prisma.memoryBlock.findMany({
      where: { userId, key: { in: keys } },
      select: { key: true, title: true, description: true, content: true },
    });
    return blocks;
  }

  async getAllBlocks(userId: string): Promise<MemoryBlockData[]> {
    return prisma.memoryBlock.findMany({
      where: { userId },
      select: { key: true, title: true, description: true, content: true },
      orderBy: { createdAt: "asc" },
    });
  }

  async upsertMemoryBlock(
    userId: string,
    block: MemoryBlockData
  ): Promise<void> {
    await prisma.memoryBlock.upsert({
      where: { userId_key: { userId, key: block.key } },
      create: {
        userId,
        key: block.key,
        title: block.title,
        description: block.description,
        content: block.content,
      },
      update: {
        title: block.title,
        description: block.description,
        content: block.content,
      },
    });
  }

  async deleteMemoryBlock(userId: string, key: string): Promise<boolean> {
    if (isCanonicalKey(key)) return false;
    const result = await prisma.memoryBlock.deleteMany({
      where: { userId, key },
    });
    return result.count > 0;
  }

  getCanonicalKeyCatalog(): readonly CanonicalKeyDefinition[] {
    return CANONICAL_KEYS;
  }
}

export const memoryService = new MemoryService();

import { Repository, DeepPartial, FindManyOptions, FindOneOptions, ObjectLiteral } from "typeorm";
import AIleanaError from "../../errors";

export default abstract class BaseRepository<T extends ObjectLiteral> {
  protected readonly repository: Repository<T>;

  constructor(repo: Repository<T>) {
    this.repository = repo;
  }

  async create(data: DeepPartial<T>): Promise<T> {
    try {
      const entity = this.repository.create(data);
      return await this.repository.save(entity);
    } catch (error) {
      throw new AIleanaError(`Error creating entity: ${(error as Error).message}, at baseRepository.ts:create`);
    }
  }

  async findById(id: string): Promise<T | null> {
    try {
      return await this.repository.findOne({ where: { id } as any });
    } catch (error) {
      throw new AIleanaError(`Error finding entity by ID: ${(error as Error).message}, at baseRepository.ts:findById`);
    }
  }

  async findOne(options: FindOneOptions<T>): Promise<T | null> {
    try {
      return await this.repository.findOne(options);
    } catch (error) {
      throw new AIleanaError(`Error finding one entity: ${(error as Error).message}, at baseRepository.ts:findOne`);
    }
  }

  async find(options: FindManyOptions<T> = {}): Promise<T[]> {
    try {
      return await this.repository.find(options);
    } catch (error) {
      throw new AIleanaError(`Error finding entities: ${(error as Error).message}, at baseRepository.ts:find`);
    }
  }

  async update(id: string, data: DeepPartial<T>): Promise<T | null> {
    try {
      await this.repository.update(id, data as any);
      return await this.findById(id);
    } catch (error) {
      throw new AIleanaError(`Error updating entity: ${(error as Error).message}, at baseRepository.ts:update`);
    }
  }

  async delete(id: string): Promise<void> {
    try {
      await this.repository.delete(id);
    } catch (error) {
      throw new AIleanaError(`Error deleting entity: ${(error as Error).message}, at baseRepository.ts:delete`);
    }
  }

  async count(options: FindManyOptions<T> = {}): Promise<number> {
    try {
      return await this.repository.count(options);
    } catch (error) {
      throw new AIleanaError(`Error counting entities: ${(error as Error).message}, at baseRepository.ts:count`);
    }
  }

  async exists(id: string): Promise<boolean> {
    try {
      const entity = await this.repository.findOne({ where: { id } as any });
      return !!entity;
    } catch (error) {
      throw new AIleanaError(`Error checking existence: ${(error as Error).message}, at baseRepository.ts:exists`);
    }
  }

  async save(entity: T | T[]): Promise<T | T[]> {
    try {
      if (Array.isArray(entity)) {
            return await this.repository.save(entity);
          } else {
            return await this.repository.save(entity);
          }
     } catch (error) {
      throw new AIleanaError(`Error saving entity: ${(error as Error).message}, at baseRepository.ts:save`  );
    }
  }
  
}
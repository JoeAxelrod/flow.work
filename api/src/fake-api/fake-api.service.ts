import { Injectable } from '@nestjs/common';
import { promises as fs } from 'fs';
import { join } from 'path';

@Injectable()
export class FakeApiService {
  private readonly counterFilePath: string;

  constructor() {
    // Store counter file in the api directory
    this.counterFilePath = join(process.cwd(), 'counter.json');
  }

  async getCounter(): Promise<number> {
    try {
      const data = await fs.readFile(this.counterFilePath, 'utf-8');
      const parsed = JSON.parse(data);
      return parsed.counter || 0;
    } catch (error) {
      // File doesn't exist or is invalid, start at 0
      return 0;
    }
  }

  async incrementCounter(): Promise<number> {
    const currentCounter = await this.getCounter();
    const newCounter = currentCounter + 1;
    
    await fs.writeFile(
      this.counterFilePath,
      JSON.stringify({ counter: newCounter }, null, 2),
      'utf-8'
    );
    
    return newCounter;
  }
}




import { Transform, TransformCallback } from 'stream';

export const allowedExtensions = ['.ts', '.png', '.jpg', '.webp', '.ico', '.html', '.js', '.css', '.txt'];

export class LineTransform extends Transform {
  private buffer: string;
  private baseUrl: string;

  constructor(baseUrl: string) {
    super();
    this.buffer = '';
    this.baseUrl = baseUrl;
  }

  _transform(chunk: Buffer, encoding: BufferEncoding, callback: TransformCallback) {
    const data = this.buffer + chunk.toString();
    const lines = data.split(/\r?\n/);
    this.buffer = lines.pop() || '';

    for (const line of lines) {
      const modifiedLine = this.processLine(line);
      this.push(modifiedLine + '\n');
    }

    callback();
  }

  _flush(callback: TransformCallback) {
    if (this.buffer) {
      const modifiedLine = this.processLine(this.buffer);
      this.push(modifiedLine);
    }
    callback();
  }

  private processLine(line: string): string {
    if (line.endsWith('.m3u8') || line.endsWith('.ts')) {
      return `http://localhost:8080/api/proxy/video?url=${encodeURIComponent(this.baseUrl + line)}`;
    }

    if (line.startsWith("http") && !line.endsWith(".m3u8")) {
      return `http://localhost:8080/api/proxy/video?url=${encodeURIComponent(line)}`;
    }

    if (allowedExtensions.some(ext => line.endsWith(ext))) {
      return `http://localhost:8080/api/proxy/video?url=${encodeURIComponent(line)}`;
    }

    return line;
  }
}
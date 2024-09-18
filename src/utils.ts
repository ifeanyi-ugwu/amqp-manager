/**
 * Converts any data (object, string, number, etc.) to a Buffer.
 *
 * @param {any} data - The data to convert.
 * @returns {Buffer} - The Buffer representation of the data.
 */
export function dataToBuffer(data: any): Buffer {
  // Handle different data types before converting to Buffer
  const isSerializable = typeof data === "object" || Array.isArray(data);
  const jsonString = isSerializable ? JSON.stringify(data) : String(data);

  return Buffer.from(jsonString);
}

/**
 * Converts a Buffer back to the original data (object, string, etc.).
 * Attempts to parse as JSON and falls back to returning the raw string.
 *
 * @param {Buffer} buffer - The buffer to convert.
 * @returns {any} - The original data from the buffer.
 */
export function bufferToData(buffer: Buffer): any {
  const str = buffer.toString();

  // Try to parse as JSON, otherwise return as string
  try {
    return JSON.parse(str);
  } catch (err) {
    // If parsing fails, return as a plain string
    return str;
  }
}

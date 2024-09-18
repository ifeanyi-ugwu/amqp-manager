import { dataToBuffer, bufferToData } from "./utils.js";

describe("Buffer Utils", () => {
  test("should convert an object to a buffer and back to the original object", () => {
    const obj = { hello: "world", number: 42, nested: { key: "value" } };

    const buffer = dataToBuffer(obj);
    expect(Buffer.isBuffer(buffer)).toBe(true);

    const result = bufferToData(buffer);
    expect(result).toEqual(obj);
  });

  test("should convert a string to a buffer and back to the original string", () => {
    const str = "Hello, World!";

    const buffer = dataToBuffer(str);
    expect(Buffer.isBuffer(buffer)).toBe(true);

    const result = bufferToData(buffer);
    expect(result).toBe(str);
  });

  test("should convert a number to a buffer and back to the original number as a string", () => {
    const num = 12345;

    const buffer = dataToBuffer(num);
    expect(Buffer.isBuffer(buffer)).toBe(true);

    const result = bufferToData(buffer);
    expect(result).toBe(num);
  });

  test("should return plain string if buffer content is not JSON", () => {
    const nonJsonString = "Just a simple string";

    const buffer = Buffer.from(nonJsonString);
    const result = bufferToData(buffer);

    expect(result).toBe(nonJsonString);
  });

  test("should handle non-JSON serializable objects like dates", () => {
    const date = new Date();
    const buffer = dataToBuffer(date);
    expect(Buffer.isBuffer(buffer)).toBe(true);

    const result = bufferToData(buffer);
    expect(result).toBe(date.toISOString());
  });

  test("should handle arrays and convert them back to the original array", () => {
    const array = [1, "hello", { nested: true }];

    const buffer = dataToBuffer(array);
    expect(Buffer.isBuffer(buffer)).toBe(true);

    const result = bufferToData(buffer);
    expect(result).toEqual(array);
  });

  test("should fail to parse non-JSON buffer and return original string", () => {
    const invalidJson = Buffer.from("This is not JSON");

    const result = bufferToData(invalidJson);
    expect(result).toBe("This is not JSON");
  });
});
